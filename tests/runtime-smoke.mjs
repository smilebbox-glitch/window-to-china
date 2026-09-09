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

test("runtime news endpoint exposes the v1.7.9 reliability catalog even when external sources degrade", async () => {
  const response = await request("/api/news", "application/json", 35_000);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.news));
  assert.ok(Array.isArray(payload.sourceBreakdown));
  assert.equal(typeof payload.totalSources, "number");
  assert.ok(payload.totalSources >= 20, `expected broad source catalog, got ${payload.totalSources}`);
  assert.equal(typeof payload.sourceCount, "number");
  assert.ok(payload.sourceCatalogVersion >= 5, `unexpected source catalog version ${payload.sourceCatalogVersion}`);
  assert.equal(typeof payload.rawCount, "number");
  assert.equal(typeof payload.deduplicatedCount, "number");
  assert.ok(Array.isArray(payload.errors));
  assert.ok(Array.isArray(payload.disabledSources));
  for (const item of payload.news.slice(0, 5)) {
    assert.equal(typeof item.publishedAt, "string");
    if (item.receivedAt !== undefined) assert.equal(typeof item.receivedAt, "string");
  }
});

test("runtime v1.7.4 pilot operations endpoint exposes trust state", async () => {
  const response = await request("/api/pilot/operations", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(["GO", "DEGRADED", "STALE"].includes(payload.briefStatus));
  assert.ok(["GO", "NO_GO"].includes(payload.decision));
  assert.equal(typeof payload.aggregate, "object");
  assert.equal(typeof payload.sources, "object");
  assert.ok(Array.isArray(payload.reasons));
});

test("runtime v1.7.5 accepts pseudonymous controlled-pilot feedback", async () => {
  const response = await request("/api/pilot/feedback", "application/json", timeoutMs, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rating: 5, usefulness: 5, outcome: "decision_support", comment: "CI runtime smoke" }),
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.feedback?.id, "string");
  assert.equal(typeof payload.feedback?.createdAt, "string");
});

test("runtime v1.7.5 pilot report exposes GO ADJUST STOP controlled-pilot outcome", async () => {
  const response = await request("/api/pilot/report", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(["GO", "ADJUST", "STOP"].includes(payload.outcome));
  assert.equal(typeof payload.cohort, "object");
  assert.equal(typeof payload.feedback, "object");
  assert.equal(typeof payload.issues, "object");
  assert.equal(typeof payload.operations, "object");
  assert.ok(Array.isArray(payload.reasons));
});

test("runtime user preferences expose configurable web-notification fields", async () => {
  const response = await request("/api/user/preferences", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(typeof payload.subscriptions?.notificationsEnabled, "boolean");
  assert.ok(Array.isArray(payload.subscriptions?.brands));
  assert.ok(Array.isArray(payload.subscriptions?.segments));
  assert.ok(Array.isArray(payload.subscriptions?.markets));
  assert.ok(Array.isArray(payload.subscriptions?.topics));
});

test("runtime web-notification preferences persist filters and master switch", async () => {
  const payload = { notificationsEnabled: true, brands: ["GWM"], segments: ["Коммерческий транспорт"] };
  const put = await request("/api/user/preferences", "application/json", timeoutMs, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(put.status, 200);
  const saved = await put.json();
  assert.equal(saved.subscriptions?.notificationsEnabled, true);
  assert.deepEqual(saved.subscriptions?.brands, ["GWM"]);
  assert.deepEqual(saved.subscriptions?.segments, ["Коммерческий транспорт"]);
});

test("runtime notification endpoint remains operational", async () => {
  const response = await request("/api/user/notifications", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.notifications));
});
