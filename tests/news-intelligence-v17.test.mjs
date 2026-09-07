import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sources = fs.readFileSync("lib/news-sources.ts", "utf8");
const route = fs.readFileSync("app/api/news/route.ts", "utf8");
const outbound = fs.readFileSync("lib/outbound.ts", "utf8");

function captures(pattern, text) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

test("v1.7 source catalog is broad and contains no duplicate IDs or URLs", () => {
  const ids = captures(/\bid:\s*"([^"]+)"/g, sources);
  const urls = captures(/\burl:\s*"(https:[^"]+)"/g, sources);
  assert.ok(ids.length >= 20, `expected >=20 sources, got ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(urls).size, urls.length);

  for (const id of [
    "caam", "miit-auto", "mofcom-news", "cada", "nbs-china",
    "gasgoo", "cnevpost", "yicai-auto", "china-briefing", "36kr-en", "carnewschina",
  ]) assert.ok(sources.includes(`id: "${id}"`), id);
});

test("official and specialist sources outrank broad secondary feeds", () => {
  assert.match(sources, /id: "caam"[\s\S]*?priority: 100/);
  assert.match(sources, /id: "miit-auto"[\s\S]*?priority: 100/);
  assert.match(sources, /id: "mofcom-news"[\s\S]*?priority: 100/);
  assert.match(sources, /id: "nbs-china"[\s\S]*?priority: 100/);
  assert.match(sources, /id: "cada"[\s\S]*?priority: 98/);
  assert.match(sources, /id: "gasgoo"[\s\S]*?priority: 91/);
  assert.match(sources, /id: "cnevpost"[\s\S]*?priority: 90/);
  assert.match(sources, /id: "china-daily-motoring"[\s\S]*?enabledByDefault: false/);
  assert.match(sources, /id: "caixin-global"[\s\S]*?enabledByDefault: false/);
});

test("news API performs fuzzy cross-source dedupe and source-priority selection", () => {
  for (const token of [
    "normalizeTokens",
    "tokenSimilarity",
    "likelySameStory",
    "NEWS_DEDUPE_WINDOW_HOURS",
    "priorityForNewsItem",
    "deduplicateNews",
    "jaccard >= 0.68",
    "containment >= 0.82",
  ]) assert.ok(route.includes(token), token);
});

test("source failures are isolated by per-source cache and limited concurrency", () => {
  for (const token of [
    "runWithConcurrency",
    "NEWS_SOURCE_CONCURRENCY",
    "news:source:v",
    "empty-stale-fallback",
    "state: \"stale\"",
    "sourceBreakdown",
  ]) assert.ok(route.includes(token), token);
});

test("news feed rejects unbounded stale content and exposes dedup diagnostics", () => {
  assert.ok(route.includes("NEWS_MAX_AGE_DAYS"));
  assert.ok(route.includes("rawCount"));
  assert.ok(route.includes("deduplicatedCount"));
  assert.ok(route.includes("sourceCatalogVersion"));
});

test("outbound SSRF policy explicitly allows active curated sources", () => {
  for (const host of [
    "www.caam.org.cn",
    "www.miit.gov.cn",
    "english.mofcom.gov.cn",
    "www.cada.cn",
    "autonews.gasgoo.com",
    "cnevpost.com",
    "www.yicaiglobal.com",
    "eu.36kr.com",
    "www.china-briefing.com",
    "www.stats.gov.cn",
    "carnewschina.com",
  ]) assert.ok(outbound.includes(`"${host}"`), host);
});
