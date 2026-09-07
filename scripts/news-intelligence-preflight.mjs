import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sources = read("lib/news-sources.ts");
const route = read("app/api/news/route.ts");
const outbound = read("lib/outbound.ts");

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const ids = [...sources.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]);
const urls = [...sources.matchAll(/\burl:\s*"(https:[^"]+)"/g)].map((match) => match[1]);
check(ids.length >= 17, `expected >=17 curated web sources, found ${ids.length}`);
check(new Set(ids).size === ids.length, "news source IDs must be unique");
check(new Set(urls).size === urls.length, "news source URLs must be unique");

for (const id of ["caam", "gasgoo", "cnevpost", "yicai-auto", "china-briefing", "nbs-china", "36kr-en", "carnewschina"]) {
  check(sources.includes(`id: "${id}"`), `missing source ${id}`);
}

for (const host of [
  "www.caam.org.cn",
  "autonews.gasgoo.com",
  "cnevpost.com",
  "www.yicaiglobal.com",
  "eu.36kr.com",
  "www.china-briefing.com",
  "www.stats.gov.cn",
  "carnewschina.com",
]) {
  check(outbound.includes(`"${host}"`), `outbound allow-list missing ${host}`);
}

for (const token of [
  "function likelySameStory",
  "tokenSimilarity",
  "NEWS_DEDUPE_WINDOW_HOURS",
  "priorityForNewsItem",
  "runWithConcurrency",
  "NEWS_SOURCE_CONCURRENCY",
  "news:source:v",
  "empty-stale-fallback",
  "sourceBreakdown",
  "deduplicatedCount",
  "NEWS_MAX_AGE_DAYS",
]) {
  check(route.includes(token), `news route missing ${token}`);
}

check(route.includes("activeNewsWebsiteSources"), "active curated website catalog is not wired into news API");
check(route.includes("sourceType: source.sourceType"), "source authority type is not preserved");
check(route.includes("runtime.sources[\"news.chinaPortals\"]"), "backward-compatible runtime website toggle is not preserved");

if (failures.length) {
  console.error("NO-GO: v1.7 news intelligence preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`GO: v1.7 news intelligence pipeline; curatedSources=${ids.length}; uniqueUrls=${urls.length}; fuzzyDedup=on; perSourceFallback=on`);
