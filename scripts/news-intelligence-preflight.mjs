import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sources = read("lib/news-sources.ts");
const route = read("app/api/news/route.ts");
const outbound = read("lib/outbound.ts");
const page = read("app/page.tsx");
const liveDashboard = read("components/news-dashboard-live.tsx");
const ranking = read("lib/intelligence-ranking.ts");
const truckRadar = read("components/truck-radar.tsx");
const shell = read("components/site-shell.tsx");
const analysisPage = read("app/analysis/page.tsx");

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const ids = [...sources.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]);
const urls = [...sources.matchAll(/\burl:\s*"(https:[^"]+)"/g)].map((match) => match[1]);
check(ids.length >= 27, `expected >=27 curated web sources, found ${ids.length}`);
check(new Set(ids).size === ids.length, "news source IDs must be unique");
check(new Set(urls).size === urls.length, "news source URLs must be unique");

for (const id of [
  "caam", "miit-auto", "mofcom-news", "cada", "nbs-china",
  "chinatruck", "360che-truck", "gasgoo", "cnevpost", "yicai-auto", "china-briefing", "36kr-en", "carnewschina",
  "ural-official", "gruzovoy-ru", "gruzovikpress", "reis-trucks",
]) check(sources.includes(`id: "${id}"`), `missing source ${id}`);

for (const host of [
  "www.caam.org.cn", "www.miit.gov.cn", "english.mofcom.gov.cn", "www.cada.cn",
  "www.chinatruck.org", "www.360che.com", "autonews.gasgoo.com", "cnevpost.com",
  "www.yicaiglobal.com", "eu.36kr.com", "www.china-briefing.com", "www.stats.gov.cn", "carnewschina.com",
  "uralaz.ru", "gruzovoy.ru", "www.gruzovikpress.ru", "reis.zr.ru",
]) check(outbound.includes(`"${host}"`), `outbound allow-list missing ${host}`);

for (const token of [
  "function likelySameStory", "tokenSimilarity", "NEWS_DEDUPE_WINDOW_HOURS", "priorityForNewsItem",
  "runWithConcurrency", "NEWS_SOURCE_CONCURRENCY", "news:source:v", "empty-stale-fallback",
  "sourceBreakdown", "deduplicatedCount", "NEWS_MAX_AGE_DAYS", "truckIndustryPattern",
  "source.language === \"ru\"", "NEWS_SOURCE_CATALOG_VERSION = 2",
]) check(route.includes(token), `news route missing ${token}`);

for (const token of [
  "assessNewsItem", "assessCommercialVehicle", "rankCommercialVehicleNews", "IntelligenceAudience",
  "SHACMAN", "SITRAK / SINOTRUK / HOWO", "FAW Jiefang", "Dongfeng", "Foton / Auman", "KAMAZ", "УРАЛ",
  "Battery swap", "HCV · тяжёлые", "MCV · среднетоннажные", "LCV · лёгкие",
]) check(ranking.includes(token), `ranking engine missing ${token}`);

check(route.includes("activeNewsWebsiteSources"), "active curated website catalog is not wired into news API");
check(route.includes("sourceType: source.sourceType"), "source authority type is not preserved");
check(route.includes("runtime.sources[\"news.chinaPortals\"]"), "backward-compatible runtime website toggle is not preserved");
check(page.includes("NewsDashboardLive"), "home page is not using fresh-first dashboard entrypoint");
check(liveDashboard.includes("seedNews.splice(0, seedNews.length)"), "legacy static seed stories can still be mixed into the live feed");
check(shell.includes('href: "/trucks"'), "Truck Radar is missing from main navigation");
check(truckRadar.includes("Грузовой радар"), "Truck Radar UI is missing");
check(truckRadar.includes("Почему важно") && truckRadar.includes("Что проверить"), "Truck Radar lacks business impact/action blocks");
check(analysisPage.includes("IntelligenceBrief"), "department intelligence ranking is not surfaced on analysis page");

if (failures.length) {
  console.error("NO-GO: v1.7.1 intelligence preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`GO: v1.7.1 intelligence pipeline; curatedSources=${ids.length}; uniqueUrls=${urls.length}; truckRadar=on; departmentRanking=on; fuzzyDedup=on; perSourceFallback=on`);
