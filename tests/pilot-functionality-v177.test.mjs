import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const exists = (path) => fs.existsSync(path);

const packageJson = JSON.parse(read("package.json"));
const scheduler = read("scripts/scheduler-client.mjs");
const refreshRoute = read("app/api/internal/refresh/route.ts");
const newsDashboard = read("components/news-dashboard.tsx");
const newsPage = read("app/news/page.tsx");
const shell = read("components/site-shell.tsx");
const corporateHome = read("components/corporate-home.tsx");
const newsRoute = read("app/api/news/route.ts");
const sources = read("lib/news-sources.ts");
const focus = read("lib/news-focus.ts");
const pilotOperations = read("lib/pilot-operations.ts");
const reliabilityRoute = read("app/api/admin/reliability/route.ts");
const runtimeSmoke = read("tests/runtime-smoke.mjs");
const compose = read("compose.yaml");
const startScript = read("start.sh");

const userRoutes = [
  "/",
  "/news",
  "/trucks",
  "/market",
  "/analysis",
  "/decision",
  "/executive",
  "/calendar",
  "/travel-guide",
];

const routeFiles = {
  "/": "app/page.tsx",
  "/news": "app/news/page.tsx",
  "/trucks": "app/trucks/page.tsx",
  "/market": "app/market/page.tsx",
  "/analysis": "app/analysis/page.tsx",
  "/decision": "app/decision/page.tsx",
  "/executive": "app/executive/page.tsx",
  "/calendar": "app/calendar/page.tsx",
  "/travel-guide": "app/travel-guide/page.tsx",
};

test("pilot exposes all approved user routes", () => {
  for (const route of userRoutes) {
    assert.equal(exists(routeFiles[route]), true, `${route} route file is missing`);
  }
});

test("corporate navigation reaches all main pilot sections", () => {
  for (const href of ["/", "/news", "/trucks", "/market", "/analysis", "/decision", "/executive", "/calendar", "/travel-guide"]) {
    assert.ok(shell.includes(`href: \"${href}\"`) || shell.includes(`href=\"${href}\"`), `navigation missing ${href}`);
  }
});

test("approved corporate home keeps retired design widgets removed", () => {
  for (const retired of [
    "Решения на сегодня",
    "Рекомендация",
    "Поездки +18,7%",
    "Что взять с собой",
    "Ключевые темы",
    "Популярные разделы",
    "Смотреть новости",
  ]) {
    assert.equal(corporateHome.includes(retired), false, `retired widget returned: ${retired}`);
  }
});

test("news backend refreshes every five minutes by default", () => {
  assert.match(scheduler, /SCHEDULER_INTERVAL_SECONDS \|\| 300/);
  assert.match(scheduler, /Math\.max\(60,/);
  assert.match(refreshRoute, /\/api\/news\?refresh=1/);
});

test("open news page refreshes its live feed every fifteen minutes", () => {
  assert.match(newsDashboard, /15 \* 60 \* 1000/);
  assert.match(newsDashboard, /fetch\("\/api\/news"/);
  assert.match(newsPage, /NewsDashboardLive/);
});

test("every news card exposes source, publication date and primary-source link", () => {
  assert.match(newsDashboard, /\{item\.source\}/);
  assert.match(newsDashboard, /formatDate\(item\.publishedAt\)/);
  assert.match(newsDashboard, /href=\{item\.url\}/);
  assert.match(newsDashboard, /Первоисточник/);
  assert.match(newsDashboard, /ZH → RU/);
});

test("news pipeline keeps source metadata and bounded dedup/freshness controls", () => {
  for (const token of [
    "sourceBreakdown",
    "sourceCatalogVersion",
    "deduplicatedCount",
    "rawCount",
    "NEWS_MAX_AGE_DAYS",
    "NEWS_DEDUPE_WINDOW_HOURS",
    "runWithConcurrency",
  ]) assert.ok(newsRoute.includes(token), token);
});

test("strategic focus contains the six required brands and companies", () => {
  for (const entity of ["SHACMAN", "GWM", "EVOLUTE", "VOYAH", "Моторинвест", "ЭВИА"]) {
    assert.ok(focus.includes(`\"${entity}\"`), entity);
  }
});

test("official EVOLUTE and VOYAH sources remain enabled", () => {
  assert.match(sources, /id: "evolute-official"[\s\S]*?enabledByDefault: true/);
  assert.match(sources, /id: "voyah-official"[\s\S]*?enabledByDefault: true/);
});

test("pilot operational gate remains available for IT even when hidden from Executive UI", () => {
  assert.match(pilotOperations, /PilotDecision = "GO" \| "NO_GO"/);
  assert.match(pilotOperations, /BriefOperationalStatus = "GO" \| "DEGRADED" \| "STALE"/);
  assert.match(pilotOperations, /governancePolicy\(\)\.sla\["news\.aggregate"\]/);
  assert.match(reliabilityRoute, /pilotOperations: pilotOperationsStatus\(\)/);
});

test("runtime smoke already covers health, readiness, news, operations and pilot report", () => {
  for (const token of [
    "/api/health",
    "/api/ready",
    "/api/news",
    "/api/pilot/operations",
    "/api/pilot/report",
  ]) assert.ok(runtimeSmoke.includes(token), token);
});

test("one-click pilot deployment remains packaged", () => {
  assert.ok(packageJson.scripts["pilot:preflight"], "pilot:preflight script missing");
  assert.match(startScript, /docker compose|docker-compose/i);
  assert.match(compose, /\/data/);
});

test("pilot functional suite is wired into npm scripts", () => {
  assert.equal(packageJson.scripts["pilot:functional"], "node --test tests/pilot-functionality-v177.test.mjs");
  assert.equal(packageJson.scripts["pilot:functional:runtime"], "node --test tests/pilot-runtime-v177.mjs");
});
