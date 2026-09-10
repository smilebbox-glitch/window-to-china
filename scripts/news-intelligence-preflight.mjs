import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sources = read("lib/news-sources.ts");
const route = read("app/api/news/route.ts");
const outbound = read("lib/outbound.ts");
const env = read(".env.example");
const compose = read("compose.yaml");
const page = read("app/page.tsx");
const newsPage = read("app/news/page.tsx");
const corporateHome = read("components/corporate-home.tsx");
const liveDashboard = read("components/news-dashboard-live.tsx");
const ranking = read("lib/intelligence-ranking.ts");
const truckRadar = read("components/truck-radar.tsx");
const shell = read("components/site-shell.tsx");
const analysisPage = read("app/analysis/page.tsx");
const focus = read("lib/news-focus.ts");

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const ids = [...sources.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]);
const urls = [...sources.matchAll(/\burl:\s*"(https:[^"]+)"/g)].map((match) => match[1]);
check(ids.length >= 29, `expected >=29 curated web sources, found ${ids.length}`);
check(new Set(ids).size === ids.length, "news source IDs must be unique");
check(new Set(urls).size === urls.length, "news source URLs must be unique");

for (const id of [
  "caam", "miit-auto", "mofcom-news", "cada", "nbs-china",
  "chinatruck", "360che-truck", "gasgoo", "cnevpost", "yicai-auto", "china-briefing", "36kr-en", "carnewschina",
  "evolute-official", "voyah-official",
  "ural-official", "gruzovoy-ru", "gruzovikpress", "reis-trucks",
]) check(sources.includes(`id: "${id}"`), `missing source ${id}`);

for (const reserve of ["people-auto", "yiche", "gruzovikpress"]) {
  check(new RegExp(`id: "${reserve}"[\\s\\S]*?enabledByDefault: false`).test(sources), `${reserve} must be reserve-only for pilot`);
}
check(/id: "mofcom-news"[\s\S]*?SignificantNews\/index\.html/.test(sources), "MOFCOM should use the stable Significant News entrypoint");

for (const host of [
  "www.caam.org.cn", "www.miit.gov.cn", "english.mofcom.gov.cn", "www.cada.cn",
  "www.chinatruck.org", "www.360che.com", "autonews.gasgoo.com", "cnevpost.com",
  "www.yicaiglobal.com", "eu.36kr.com", "www.china-briefing.com", "www.stats.gov.cn", "carnewschina.com",
  "www.evolute.ru", "evolute.ru", "voyah.ru", "www.voyah.ru",
  "uralaz.ru", "gruzovoy.ru", "www.gruzovikpress.ru", "reis.zr.ru", "m.autostat.ru",
]) check(outbound.includes(`"${host}"`), `outbound allow-list missing ${host}`);

for (const token of [
  "function likelySameStory", "tokenSimilarity", "NEWS_DEDUPE_WINDOW_HOURS", "priorityForNewsItem",
  "runWithConcurrency", "NEWS_SOURCE_CONCURRENCY", "news:source:v", "empty-stale-fallback",
  "sourceBreakdown", "deduplicatedCount", "NEWS_MAX_AGE_DAYS", "truckIndustryPattern",
  "source.language === \"ru\"", "NEWS_SOURCE_CATALOG_VERSION = 5",
  "evolute-official", "voyah-official", "motorinvest", "моторинвест", "evia", "эвиа",
  "autostat_rss_fallback", "translateArticleFields", "NEWS_AGGREGATE_LIVE_QUALITY_MIN",
  "withReceivedAt", "receivedAt", "previousById", "previousByUrl",
]) check(route.toLowerCase().includes(token.toLowerCase()), `news route missing ${token}`);

for (const token of ["outbound_redirect_https_upgrade", "outbound_translate_rate_limited", "TRANSLATE_MIN_INTERVAL_MS"]) {
  check(outbound.includes(token), `outbound reliability missing ${token}`);
}
for (const token of [
  "NEWS_SOURCE_CONCURRENCY=6", "NEWS_FETCH_TIMEOUT_MS=9000", "NEWS_TRANSLATE_TIMEOUT_MS=6500",
  "NEWS_SOURCE_DEADLINE_MS=14000", "NEWS_REQUEST_DEADLINE_MS=32000", "NEWS_CACHE_TTL_SECONDS=300",
  "NEWS_AGGREGATE_LIVE_QUALITY_MIN=75", "TRANSLATE_MIN_INTERVAL_MS=180", "TRANSLATE_MAX_ATTEMPTS=2",
]) check(env.includes(token), `.env.example missing ${token}`);
for (const token of ["NEWS_AGGREGATE_LIVE_QUALITY_MIN", "TRANSLATE_MIN_INTERVAL_MS", "TRANSLATE_MAX_ATTEMPTS", "NEWS_CACHE_TTL_SECONDS"]) {
  check(compose.includes(token), `compose missing ${token}`);
}

for (const entity of ["SHACMAN", "GWM", "EVOLUTE", "VOYAH", "Моторинвест", "ЭВИА"]) {
  check(focus.includes(`\"${entity}\"`), `focus detector missing ${entity}`);
}

for (const token of [
  "assessNewsItem", "assessCommercialVehicle", "rankCommercialVehicleNews", "IntelligenceAudience",
  "SHACMAN", "SITRAK / SINOTRUK / HOWO", "FAW Jiefang", "Dongfeng", "Foton / Auman", "KAMAZ", "УРАЛ",
  "Battery swap", "HCV · тяжёлые", "MCV · среднетоннажные", "LCV · лёгкие",
]) check(ranking.includes(token), `ranking engine missing ${token}`);

check(route.includes("activeNewsWebsiteSources"), "active curated website catalog is not wired into news API");
check(route.includes("sourceType: source.sourceType"), "source authority type is not preserved");
check(route.includes("runtime.sources[\"news.chinaPortals\"]"), "backward-compatible runtime website toggle is not preserved");
check(page.includes("CorporateHome"), "home page is not using corporate live-data entrypoint");
check(corporateHome.includes('fetch("/api/news"'), "corporate home is not connected to live news API");
check(newsPage.includes("NewsDashboardLive"), "dedicated /news route is not using fresh-first dashboard entrypoint");
check(liveDashboard.includes("seedNews.splice(0, seedNews.length)"), "legacy static seed stories can still be mixed into the live feed");
check(shell.includes('href: "/trucks"'), "Truck Radar is missing from main navigation");
check(shell.includes('href: "/news"'), "News route is missing from main navigation");
check(truckRadar.includes("Грузовой радар"), "Truck Radar UI is missing");
check(truckRadar.includes("Почему важно") && truckRadar.includes("Что проверить"), "Truck Radar lacks business impact/action blocks");
check(analysisPage.includes('redirect("/news")'), "pilot analysis route must redirect to the news feed while RAG is hidden");
check(!shell.includes('href: "/analysis"'), "RAG analysis must stay hidden from pilot navigation");

if (failures.length) {
  console.error("NO-GO: v1.7.9 intelligence/reliability preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`GO: v1.7.9 intelligence/reliability pipeline; curatedSources=${ids.length}; uniqueUrls=${urls.length}; strategicFocus=6; truckRadar=on; ragPilotUi=hidden; translationThrottle=on; autostatFallback=on; receiptTimestamp=on; aggregateQualityGate=on`);
