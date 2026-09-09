import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);

async function request(pathname, accept, timeout = timeoutMs, init = {}) {
  const url = new URL(pathname, baseUrl);
  const { headers = {}, ...rest } = init;
  return fetch(url, {
    ...rest,
    headers: { accept, ...headers },
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
  });
}

const htmlRoutes = [
  "/",
  "/news",
  "/trucks",
  "/decision",
  "/executive",
  "/analysis",
  "/market",
  "/calendar",
  "/travel-guide",
  "/trip-planner",
  "/pilot-feedback",
  "/pilot",
  "/search?q=SHACMAN",
];

for (const route of htmlRoutes) {
  test(`runtime page ${route} returns HTML`, async () => {
    const response = await request(route, "text/html");
    assert.equal(response.status, 200, `${route} returned HTTP ${response.status}`);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i, `${route} must return HTML`);
    const body = await response.text();
    assert.ok(body.length > 100, `${route} returned an unexpectedly small document`);
  });
}

test("runtime corporate home exposes approved executive intelligence copy and no retired widgets", async () => {
  const response = await request("/", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /MGC · China Automotive Intelligence/u);
  assert.match(body, /Требует внимания/u);
  assert.match(body, /Executive Brief/u);
  assert.match(body, /Продажи автомобилей в России/u);
  assert.match(body, /Truck Radar/u);
  for (const retired of ["Решения на сегодня", "Что взять с собой", "Ключевые темы", "Популярные разделы", "Смотреть новости"]) {
    assert.equal(body.includes(retired), false, retired);
  }
});

test("runtime simplified shell keeps approved notification center and hides retired navigation controls", async () => {
  const response = await request("/", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.doesNotMatch(body, />Решения<\/span>/u, "retired navigation item is visible: Решения");
  assert.doesNotMatch(body, />Руководство<\/span>/u, "retired navigation item is visible: Руководство");
  assert.doesNotMatch(body, /aria-label=["']Язык интерфейса["']/u, "retired language control is visible");
  assert.doesNotMatch(body, />Сервис<\/span>/u, "retired navigation item is visible: Сервис");
  assert.match(body, /Уведомления/u);
  assert.match(body, /В тестовом режиме\. Данные могут быть неполны\./u);
});

test("runtime global search page renders the working search surface", async () => {
  const response = await request("/search?q=SHACMAN", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Найдите нужную информацию/u);
  assert.match(body, /Поиск по сервису/u);
  assert.match(body, /SHACMAN/u);
});

test("runtime health endpoint is healthy", async () => {
  const response = await request("/api/health", "application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "okno-v-kitai");
});

test("runtime readiness endpoint is ready", async () => {
  const response = await request("/api/ready", "application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.equal(payload.status, "ready");
  assert.equal(payload.checks.runtimeDataWritable, true);
  assert.equal(payload.checks.sqliteAvailable, true);
  assert.equal(payload.checks.migrationsCurrent, true);
});

test("runtime news endpoint is using v1.7.9 reliability source catalog with receipt timestamps", async () => {
  const response = await request("/api/news", "application/json", 35_000);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.news));
  assert.ok(Array.isArray(payload.sources));
  assert.ok(payload.sources.length >= 20, `expected broad source catalog, got ${payload.sources.length}`);
  assert.equal(typeof payload.dedupe?.duplicatesRemoved, "number");
  assert.equal(typeof payload.quality?.aggregateState, "string");
  for (const item of payload.news.slice(0, 5)) {
    assert.equal(typeof item.publishedAt, "string");
    if (item.receivedAt !== undefined) assert.equal(typeof item.receivedAt, "string");
  }
});

test("runtime v1.7.4 pilot operations endpoint exposes trust state", async () => {
  const response = await request("/api/pilot/operations", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(["GO", "DEGRADED", "STALE"].includes(payload.status));
  assert.equal(typeof payload.decision, "string");
});

test("runtime v1.7.5 accepts pseudonymous controlled-pilot feedback", async () => {
  const response = await request("/api/pilot/feedback", "application/json", timeoutMs, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rating: 5, category: "usefulness", comment: "CI runtime smoke" }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
});

test("runtime v1.7.5 pilot report exposes GO ADJUST STOP KPI contract", async () => {
  const response = await request("/api/pilot/report", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(["GO", "ADJUST", "STOP"].includes(payload.decision));
  assert.equal(typeof payload.kpis, "object");
});

test("runtime user preferences expose configurable web-notification fields", async () => {
  const response = await request("/api/user/preferences", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(typeof payload.notificationsEnabled, "boolean");
  assert.ok(Array.isArray(payload.notificationCompanies));
  assert.ok(Array.isArray(payload.notificationSegments));
});

test("runtime web-notification preferences persist filters and master switch", async () => {
  const payload = { notificationsEnabled: true, notificationCompanies: ["GWM"], notificationSegments: ["HCV"] };
  const put = await request("/api/user/preferences", "application/json", timeoutMs, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(put.status, 200);
  const saved = await put.json();
  assert.equal(saved.notificationsEnabled, true);
  assert.deepEqual(saved.notificationCompanies, ["GWM"]);
  assert.deepEqual(saved.notificationSegments, ["HCV"]);
});

test("runtime notification endpoint remains operational", async () => {
  const response = await request("/api/user/notifications", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.notifications));
});
