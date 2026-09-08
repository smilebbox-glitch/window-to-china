import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const engine = read("lib/intelligence-brief.ts");
const component = read("components/executive-brief.tsx");
const route = read("app/executive/page.tsx");
const shell = read("components/site-shell.tsx");
const runtime = read("tests/runtime-smoke.mjs");

check(engine.includes('BriefPeriod = "daily" | "weekly"'), "daily/weekly period type is missing");
check(engine.includes('period === "daily" ? DAY_MS : 7 * DAY_MS'), "brief time windows are missing");
for (const score of [">= 72", ">= 60", ">= 45"]) check(engine.includes(score), `corporate score threshold ${score} is missing`);
check(engine.includes("executiveSummary"), "executive summary output is missing");
check(engine.includes("audienceCounts"), "audience impact output is missing");
check(engine.includes("watchNext"), "watch-next output is missing");
check(engine.includes("recommendedAction"), "recommended action is missing");

check(route.includes("ExecutiveBrief"), "Executive View route is missing");
check(shell.includes('href: "/executive"'), "Executive View navigation is missing");
check(component.includes("Executive Intelligence Brief"), "Executive Brief UI is missing");
check(component.includes("Executive Summary"), "Executive Summary section is missing");
check(component.includes("Decision Signals"), "Decision Signals section is missing");
check(component.includes("Market Pulse"), "Market Pulse section is missing");
check(component.includes("Что контролировать дальше"), "watch-next section is missing");
check(component.includes("window.print()"), "print/PDF action is missing");
check(component.includes("Персонального Watchlist нет"), "no-personal-watchlist policy is not visible");
check(!component.includes("/api/user/preferences"), "Executive Brief must not depend on user preferences");
check(!engine.includes("matchWatchlist"), "brief engine must not use personal watchlist matching");
check(runtime.includes('"/executive"'), "runtime smoke does not cover /executive");

if (failures.length) {
  console.error("NO-GO: v1.7.3 Executive Brief preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("GO: v1.7.3 Executive Brief; daily=on; weekly=on; executiveView=on; personalWatchlist=off; printPdf=on");
