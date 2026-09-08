import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const watchlist = read("lib/watchlist.ts");
const store = read("lib/user-store.ts");
const market = read("lib/decision-market-data.ts");
const cockpit = read("components/decision-cockpit.tsx");
const route = read("app/decision/page.tsx");
const shell = read("components/site-shell.tsx");
const runtime = read("tests/runtime-smoke.mjs");

for (const token of ["keywords", "truckSegments", "powertrains", "audiences", "minScore", "alertsEnabled", "matchWatchlist"]) {
  check(watchlist.includes(token), `watchlist missing ${token}`);
}
check(watchlist.includes("score >= settings.minScore"), "watchlist score threshold is not enforced");
check(store.includes("rankNews(news.slice(0, 120))"), "notification engine does not rank news before matching");
check(store.includes("matchWatchlist(item, subscriptions)"), "notification engine does not use watchlist matcher");
check(store.includes('"intelligence"'), "intelligence alert kind is missing");
check(store.includes("Почему важно:"), "intelligence alert is missing business rationale");
check(store.includes("Что проверить:"), "intelligence alert is missing recommended check");

check(route.includes("DecisionCockpit"), "Decision Cockpit route is missing");
check(shell.includes('href: "/decision"'), "Decision Cockpit is missing from navigation");
check(cockpit.includes("Сохранить watchlist"), "watchlist save UI is missing");
check(cockpit.includes('fetch("/api/user/preferences"'), "Decision Cockpit is not connected to user preferences API");
check(cockpit.includes("Цифры отдельно от новостей"), "Market Data section is missing");
check(cockpit.includes("HCV Snapshot"), "HCV snapshot section is missing");

const actualCount = (market.match(/status: "actual"/g) || []).length;
const forecastCount = (market.match(/status: "forecast"/g) || []).length;
check(actualCount >= 4, `expected >=4 actual market metrics, found ${actualCount}`);
check(forecastCount >= 1, `expected >=1 forecast market metric, found ${forecastCount}`);
check(market.includes("Actual и forecast никогда не суммируются"), "actual/forecast methodology guard is missing");
for (const token of ["sourceLabel", "sourceUrl", "sourceDate", "period"]) check(market.includes(`${token}:`), `market metrics missing ${token}`);
for (const brand of ["KAMAZ", "SITRAK", "Dongfeng", "FAW"]) check(market.includes(`brand: "${brand}"`), `HCV snapshot missing ${brand}`);

check(runtime.includes('"/decision"'), "runtime smoke does not cover /decision");
check(runtime.includes("watchlist defaults"), "runtime smoke does not verify watchlist profile contract");
check(runtime.includes("intelligence alert engine"), "runtime smoke does not verify notification engine");

if (failures.length) {
  console.error("NO-GO: v1.7.2 Decision Cockpit preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`GO: v1.7.2 Decision Cockpit; actualMarketMetrics=${actualCount}; forecastMetrics=${forecastCount}; watchlists=on; intelligenceAlerts=on; runtimeSmoke=on`);
