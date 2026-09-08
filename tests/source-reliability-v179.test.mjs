import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sources = fs.readFileSync("lib/news-sources.ts", "utf8");
const route = fs.readFileSync("app/api/news/route.ts", "utf8");
const outbound = fs.readFileSync("lib/outbound.ts", "utf8");
const operations = fs.readFileSync("lib/pilot-operations.ts", "utf8");
const env = fs.readFileSync(".env.example", "utf8");
const compose = fs.readFileSync("compose.yaml", "utf8");

function sourceBlock(id) {
  const start = sources.indexOf(`id: "${id}"`);
  assert.ok(start >= 0, `source ${id} missing`);
  const next = sources.indexOf("\n  {\n", start + 1);
  return sources.slice(start, next < 0 ? sources.length : next);
}

test("pilot keeps known unstable best-effort sources in reserve", () => {
  for (const id of ["people-auto", "yiche", "gruzovikpress"]) {
    assert.match(sourceBlock(id), /enabledByDefault: false/);
  }
});

test("MOFCOM uses stable Significant News entrypoint", () => {
  assert.match(sourceBlock("mofcom-news"), /https:\/\/english\.mofcom\.gov\.cn\/News\/SignificantNews\/index\.html/);
});

test("AUTOSTAT RSS has a Russian HTML fallback", () => {
  assert.match(route, /https:\/\/m\.autostat\.ru\/news\//);
  assert.match(route, /async function fetchAutostat\(/);
  assert.match(route, /autostat_rss_fallback/);
  assert.match(route, /fetchWebsitePortal\(autostatPortalSource/);
  assert.match(outbound, /"m\.autostat\.ru"/);
});

test("translation is batched, paced and retried after 429", () => {
  assert.match(route, /translateArticleFields/);
  assert.match(route, /WTC_FIELD_SEPARATOR_7F3A/);
  assert.match(outbound, /TRANSLATE_MIN_INTERVAL_MS/);
  assert.match(outbound, /TRANSLATE_MAX_ATTEMPTS/);
  assert.match(outbound, /outbound_translate_rate_limited/);
  assert.match(outbound, /response\.status === 429/);
  assert.match(env, /TRANSLATE_MIN_INTERVAL_MS=180/);
  assert.match(env, /TRANSLATE_MAX_ATTEMPTS=2/);
});

test("same-host HTTPS downgrade redirects are upgraded without relaxing HTTP SSRF policy", () => {
  assert.match(outbound, /sameHostDowngrade/);
  assert.match(outbound, /candidate\.protocol = "https:"/);
  assert.match(outbound, /outbound_redirect_https_upgrade/);
  assert.match(outbound, /url\.protocol !== "https:"/);
  assert.match(env, /OUTBOUND_ALLOW_HTTP_HOSTS=host\.docker\.internal/);
  assert.doesNotMatch(env, /OUTBOUND_ALLOW_HTTP_HOSTS=.*autohome|OUTBOUND_ALLOW_HTTP_HOSTS=.*pcauto/);
});

test("aggregate state is driven by overall source quality, not one best-effort failure", () => {
  assert.match(route, /NEWS_AGGREGATE_LIVE_QUALITY_MIN/);
  assert.match(route, /emptySources \* 0\.75/);
  assert.match(route, /qualityScore >= aggregateLiveQuality \? "live" : "partial"/);
  assert.match(env, /NEWS_AGGREGATE_LIVE_QUALITY_MIN=75/);
});

test("pilot degradation uses explicit error-plus-stale ratio threshold", () => {
  assert.match(operations, /PILOT_SOURCE_DEGRADED_PCT/);
  assert.match(operations, /degradedCount = stale \+ error/);
  assert.match(operations, /degradedPct >= degradedLimitPct/);
  assert.match(env, /PILOT_SOURCE_DEGRADED_PCT=25/);
  assert.match(compose, /PILOT_SOURCE_DEGRADED_PCT: \$\{PILOT_SOURCE_DEGRADED_PCT:-25\}/);
  assert.doesNotMatch(operations, /aggregate\.payload\.errors\?\.length[^\n]*briefStatus/);
});

test("v1.7.9 bounded source deadlines are passed to Docker", () => {
  for (const token of [
    "NEWS_SOURCE_CONCURRENCY: ${NEWS_SOURCE_CONCURRENCY:-4}",
    "NEWS_FETCH_TIMEOUT_MS: ${NEWS_FETCH_TIMEOUT_MS:-8000}",
    "NEWS_TRANSLATE_TIMEOUT_MS: ${NEWS_TRANSLATE_TIMEOUT_MS:-6500}",
    "NEWS_SOURCE_DEADLINE_MS: ${NEWS_SOURCE_DEADLINE_MS:-12000}",
    "NEWS_REQUEST_DEADLINE_MS: ${NEWS_REQUEST_DEADLINE_MS:-26000}",
  ]) assert.ok(compose.includes(token), token);
});
