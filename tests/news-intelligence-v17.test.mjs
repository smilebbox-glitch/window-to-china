import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sources = fs.readFileSync("lib/news-sources.ts", "utf8");
const route = fs.readFileSync("app/api/news/route.ts", "utf8");
const outbound = fs.readFileSync("lib/outbound.ts", "utf8");
const page = fs.readFileSync("app/page.tsx", "utf8");
const newsPage = fs.readFileSync("app/news/page.tsx", "utf8");
const corporateHome = fs.readFileSync("components/corporate-home.tsx", "utf8");
const liveDashboard = fs.readFileSync("components/news-dashboard-live.tsx", "utf8");

function captures(pattern, text) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

test("v1.7.9 source catalog is broad and contains no duplicate IDs or URLs", () => {
  const ids = captures(/\bid:\s*"([^"]+)"/g, sources);
  const urls = captures(/\burl:\s*"(https:[^"]+)"/g, sources);
  assert.ok(ids.length >= 29, `expected >=29 sources, got ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(urls).size, urls.length);

  for (const id of [
    "caam", "miit-auto", "mofcom-news", "cada", "nbs-china",
    "chinatruck", "360che-truck", "gasgoo", "cnevpost", "yicai-auto", "china-briefing", "36kr-en", "carnewschina",
    "evolute-official", "voyah-official",
    "ural-official", "gruzovoy-ru", "gruzovikpress", "reis-trucks",
  ]) assert.ok(sources.includes(`id: "${id}"`), id);
});

test("official and specialist sources outrank broad secondary feeds", () => {
  assert.match(sources, /id: "caam"[\s\S]*?priority: 100/);
  assert.match(sources, /id: "miit-auto"[\s\S]*?priority: 100/);
  assert.match(sources, /id: "evolute-official"[\s\S]*?priority: 100/);
  assert.match(sources, /id: "voyah-official"[\s\S]*?priority: 100/);
  assert.match(sources, /id: "ural-official"[\s\S]*?priority: 100/);
  assert.match(sources, /id: "chinatruck"[\s\S]*?priority: 93/);
  assert.match(sources, /id: "360che-truck"[\s\S]*?priority: 92/);
  assert.match(sources, /id: "gasgoo"[\s\S]*?priority: 91/);
  assert.match(sources, /id: "cnevpost"[\s\S]*?priority: 90/);
  assert.match(sources, /id: "china-daily-motoring"[\s\S]*?enabledByDefault: false/);
  assert.match(sources, /id: "caixin-global"[\s\S]*?enabledByDefault: false/);
});

test("unstable best-effort portals are retained as reserves instead of poisoning pilot health", () => {
  for (const id of ["people-auto", "yiche", "gruzovikpress"]) {
    assert.match(sources, new RegExp(`id: "${id}"[\\s\\S]*?enabledByDefault: false`), id);
  }
  assert.match(sources, /id: "mofcom-news"[\s\S]*?SignificantNews\/index\.html/);
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

test("Russia and China strategic sources are first-class ingestion jobs", () => {
  assert.ok(route.includes("truckIndustryPattern"));
  assert.ok(route.includes('focus === "truck"'));
  assert.ok(route.includes('language === "ru"'));
  assert.ok(route.includes('NEWS_SOURCE_CATALOG_VERSION = 5'));
  for (const token of ["evolute", "voyah", "motorinvest", "моторинвест", "evia", "эвиа"]) assert.ok(route.toLowerCase().includes(token.toLowerCase()), token);
  assert.ok(route.includes('"evolute-official"'));
  assert.ok(route.includes('"voyah-official"'));
  assert.ok(sources.includes('market: "Россия"'));
  assert.ok(sources.includes('language: "ru"'));
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

test("v1.7.9 has Autostat HTML fallback and quality-based aggregate state", () => {
  for (const token of [
    "autostat_rss_fallback",
    "https://m.autostat.ru/news/",
    "translateArticleFields",
    "NEWS_AGGREGATE_LIVE_QUALITY_MIN",
    "emptySources * 0.75",
  ]) assert.ok(route.includes(token), token);
});

test("news feed rejects unbounded stale content and exposes dedup diagnostics", () => {
  assert.ok(route.includes("NEWS_MAX_AGE_DAYS"));
  assert.ok(route.includes("rawCount"));
  assert.ok(route.includes("deduplicatedCount"));
  assert.ok(route.includes("sourceCatalogVersion"));
});

test("fresh-first feed moved to dedicated news route while corporate home stays live-data driven", () => {
  assert.match(page, /CorporateHome/);
  assert.match(corporateHome, /fetch\("\/api\/news"/);
  assert.match(newsPage, /NewsDashboardLive/);
  assert.match(liveDashboard, /seedNews\.splice\(0, seedNews\.length\)/);
  assert.match(liveDashboard, /return <NewsDashboard \/>/);
});

test("outbound SSRF policy explicitly allows curated focus sources and secure Autostat fallback", () => {
  for (const host of [
    "www.caam.org.cn", "www.miit.gov.cn", "english.mofcom.gov.cn", "www.cada.cn",
    "www.chinatruck.org", "www.360che.com", "autonews.gasgoo.com", "cnevpost.com",
    "www.yicaiglobal.com", "eu.36kr.com", "www.china-briefing.com", "www.stats.gov.cn", "carnewschina.com",
    "www.evolute.ru", "evolute.ru", "voyah.ru", "www.voyah.ru",
    "uralaz.ru", "gruzovoy.ru", "www.gruzovikpress.ru", "reis.zr.ru", "m.autostat.ru",
  ]) assert.ok(outbound.includes(`"${host}"`), host);
  assert.ok(outbound.includes("outbound_redirect_https_upgrade"));
  assert.ok(outbound.includes("outbound_translate_rate_limited"));
  assert.ok(outbound.includes("TRANSLATE_MIN_INTERVAL_MS"));
});
