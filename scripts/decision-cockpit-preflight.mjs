import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const store = read("lib/user-store.ts");
const market = read("lib/decision-market-data.ts");
const cockpit = read("components/decision-cockpit.tsx");
const route = read("app/decision/page.tsx");
const shell = read("components/site-shell.tsx");
const runtime = read("tests/runtime-smoke.mjs");

check(route.includes("DecisionCockpit"), "Decision Cockpit route is missing");
check(!shell.includes('href: "/decision"'), "Decision Cockpit must stay hidden from pilot navigation");
check(!shell.includes('label: "Решения"'), "retired Решения navigation label returned");
check(cockpit.includes("Corporate Decision Cockpit"), "corporate cockpit header is missing");
check(cockpit.includes("корпоративный порог 45/100"), "company-wide score threshold is missing");
check(cockpit.includes("Corporate Priority Feed"), "corporate priority feed is missing");
check(cockpit.includes("Почему важно"), "business rationale is missing");
check(cockpit.includes("Что проверить"), "recommended action is missing");
check(cockpit.includes("Цифры отдельно от новостей"), "Market Data section is missing");
check(cockpit.includes("HCV Snapshot"), "HCV snapshot section is missing");
check(!cockpit.includes("/api/user/preferences"), "Decision Cockpit must not depend on personal preferences");
check(!cockpit.toLowerCase().includes("сохранить watchlist"), "personal watchlist UI must be absent");
check(!store.includes("WatchlistSettings"), "user store still contains personal watchlist schema");
check(!store.includes("matchWatchlist"), "user store still contains watchlist matching");
check(!store.includes("alertsEnabled"), "user store still contains watchlist alert toggle");

const actualCount = (market.match(/status: "actual"/g) || []).length;
const forecastCount = (market.match(/status: "forecast"/g) || []).length;
check(actualCount >= 4, `expected >=4 actual market metrics, found ${actualCount}`);
check(forecastCount >= 1, `expected >=1 forecast market metric, found ${forecastCount}`);
check(market.includes("Actual и forecast никогда не суммируются"), "actual/forecast methodology guard is missing");
for (const token of ["sourceLabel", "sourceUrl", "sourceDate", "period"]) check(market.includes(`${token}:`), `market metrics missing ${token}`);
for (const brand of ["KAMAZ", "SITRAK", "Dongfeng", "FAW"]) check(market.includes(`brand: "${brand}"`), `HCV snapshot missing ${brand}`);

check(runtime.includes('"/decision"'), "runtime smoke does not cover /decision");
check(!runtime.includes("watchlist defaults"), "runtime smoke still contains watchlist contract");

if (failures.length) {
  console.error("NO-GO: v1.7.2 Corporate Decision Cockpit preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`GO: v1.7.2 Corporate Decision Cockpit; actualMarketMetrics=${actualCount}; forecastMetrics=${forecastCount}; navigation=hidden; personalWatchlist=off; runtimeSmoke=on`);
