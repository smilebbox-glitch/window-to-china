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

test("runtime corporate home exposes approved v1.7.6 copy and no retired widgets", async () => {
  const response = await request("/", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Китай\. Автопром\./u);
  assert.match(body, /Главные новости/u);
  assert.match(body, /Коммерческий транспорт/u);
  for (const retired of ["Решения на сегодня", "Что взять с собой", "Ключевые темы", "Популярные разделы", "Смотреть новости"]) {
    assert.equal(body.includes(retired), false, retired);
  }
});

test("runtime simplified shell keeps approved notification center and hides other retired controls", async () => {
  const response = await request("/", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  for (const retired of ["Решения", "Руководство", "Язык интерфейса", ">Сервис<"]) {
    assert.equal(body.includes(retired), false, `retired shell control is visible: ${retired}`);
  }
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
  assert.equal(payload.checks?.runtimeDataWritable, true);
  assert.equal(payload.checks?.sqliteAvailable, true);
  assert.equal(payload.checks?.migrationsCurrent, true);
});

test("runtime news endpoint is using v1.7.9 reliability source catalog with receipt timestamps", async () => {
  const response = await request("/api/news", "application/json", 40_000);
  assert.equal(response.status, 200, `/api/news returned HTTP ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.equal(payload.sourceCatalogVersion, 5);
  assert.ok(Array.isArray(payload.news));
  for (const item of payload.news) {
    assert.equal(typeof item.receivedAt, "string", `news item ${item.id ?? item.url ?? "unknown"} has no receivedAt`);
    assert.ok(Number.isFinite(Date.parse(item.receivedAt)), `news item ${item.id ?? item.url ?? "unknown"} has invalid receivedAt`);
  }
  assert.ok(Array.isArray(payload.sourceBreakdown));
  assert.ok(payload.sourceBreakdown.some((entry) => entry.source === "news.web:evolute-official"));
  assert.ok(payload.sourceBreakdown.some((entry) => entry.source === "news.web:voyah-official"));
  assert.ok(payload.totalSources >= payload.sourceCount);
  assert.ok(Number.isInteger(payload.rawCount) && payload.rawCount >= 0);
  assert.ok(Number.isInteger(payload.deduplicatedCount) && payload.deduplicatedCount >= 0);
  assert.ok(["live", "partial", "fresh", "stale"].includes(payload.cache?.state));
});

test("runtime v1.7.4 pilot operations endpoint exposes trust state", async () => {
  const response = await request("/api/pilot/operations", "application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.ok(["GO", "NO_GO"].includes(payload.decision));
  assert.ok(["GO", "DEGRADED", "STALE"].includes(payload.briefStatus));
  assert.equal(typeof payload.executiveMinimumRole, "string");
  assert.equal(typeof payload.aggregate?.available, "boolean");
  assert.equal(typeof payload.sources?.fresh, "number");
  assert.equal(typeof payload.sources?.stale, "number");
  assert.equal(typeof payload.sources?.error, "number");
  assert.equal(typeof payload.sla?.maxAgeSeconds, "number");
  assert.equal(typeof payload.sla?.minQuality, "number");
  assert.ok(Array.isArray(payload.reasons));
});

test("runtime v1.7.5 accepts pseudonymous controlled-pilot feedback", async () => {
  const response = await request("/api/pilot/feedback", "application/json", 10_000, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workFunction: "R&D",
      rating: 5,
      usefulness: 5,
      savedMinutes: 15,
      outcome: "saved_time",
      section: "Грузовики",
      comment: "runtime smoke feedback",
    }),
  });
  assert.equal(response.status, 201, `/api/pilot/feedback returned HTTP ${response.status}`);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.feedback?.id, "string");
});

test("runtime v1.7.5 pilot report exposes GO ADJUST STOP KPI contract", async () => {
  const response = await request("/api/pilot/report", "application/json");
  assert.equal(response.status, 200, `/api/pilot/report returned HTTP ${response.status}`);
  const payload = await response.json();
  assert.ok(["GO", "ADJUST", "STOP"].includes(payload.outcome));
  assert.equal(payload.policy?.targetMinUsers, 5);
  assert.equal(payload.policy?.targetMaxUsers, 10);
  assert.equal(typeof payload.cohort?.activeUsers, "number");
  assert.equal(typeof payload.cohort?.repeatPct, "number");
  assert.ok(Array.isArray(payload.cohort?.participants));
  assert.ok(payload.cohort.participants.every((entry) => /^P-[A-F0-9]{6}$/u.test(entry.code)));
  assert.ok(payload.feedback?.responses >= 1);
  assert.equal(typeof payload.feedback?.savedMinutes, "number");
  assert.equal(typeof payload.issues?.openBySeverity?.S1, "number");
  assert.equal(typeof payload.issues?.openBySeverity?.S2, "number");
  assert.ok(Array.isArray(payload.reasons));
});

test("runtime user preferences expose configurable web-notification fields", async () => {
  const response = await request("/api/user/preferences", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.subscriptions);
  assert.equal(typeof payload.subscriptions.notificationsEnabled, "boolean");
  assert.ok(Array.isArray(payload.subscriptions.brands));
  assert.ok(Array.isArray(payload.subscriptions.segments));
  assert.ok(Array.isArray(payload.subscriptions.markets));
  assert.ok(Array.isArray(payload.subscriptions.topics));
  assert.ok(Array.isArray(payload.subscriptions.events));
  assert.equal(typeof payload.subscriptions.eventLeadDays, "number");
});

test("runtime web-notification preferences persist filters and master switch", async () => {
  const enabledPreferences = {
    notificationsEnabled: true,
    brands: ["SHACMAN"],
    segments: ["Коммерческий транспорт"],
    markets: [],
    topics: [],
    cities: [],
    events: [],
    eventLeadDays: 30,
  };

  const writeResponse = await request("/api/user/preferences", "application/json", 10_000, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(enabledPreferences),
  });
  assert.equal(writeResponse.status, 200, `/api/user/preferences PUT returned HTTP ${writeResponse.status}`);
  const setCookie = writeResponse.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";", 1)[0];
  assert.ok(cookie.includes("="), "preference write must establish a pseudonymous user cookie");
  const writePayload = await writeResponse.json();
  assert.equal(writePayload.subscriptions?.notificationsEnabled, true);
  assert.deepEqual(writePayload.subscriptions?.brands, ["SHACMAN"]);
  assert.deepEqual(writePayload.subscriptions?.segments, ["Коммерческий транспорт"]);

  const readResponse = await request("/api/user/preferences", "application/json", 10_000, {
    headers: { cookie },
  });
  assert.equal(readResponse.status, 200);
  const readPayload = await readResponse.json();
  assert.equal(readPayload.subscriptions?.notificationsEnabled, true);
  assert.deepEqual(readPayload.subscriptions?.brands, ["SHACMAN"]);
  assert.deepEqual(readPayload.subscriptions?.segments, ["Коммерческий транспорт"]);

  const notificationResponse = await request("/api/user/notifications", "application/json", 18_000, {
    headers: { cookie },
  });
  assert.equal(notificationResponse.status, 200);
  const notificationPayload = await notificationResponse.json();
  assert.ok(Array.isArray(notificationPayload.notifications));
  assert.equal(typeof notificationPayload.unread, "number");

  const disableResponse = await request("/api/user/preferences", "application/json", 10_000, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ ...enabledPreferences, notificationsEnabled: false }),
  });
  assert.equal(disableResponse.status, 200);
  const disablePayload = await disableResponse.json();
  assert.equal(disablePayload.subscriptions?.notificationsEnabled, false);
});

test("runtime notification endpoint remains operational", async () => {
  const response = await request("/api/user/notifications", "application/json", 18_000);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.notifications));
  assert.equal(typeof payload.unread, "number");
});
