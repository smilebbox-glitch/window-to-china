import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);

async function request(pathname, accept, timeout = timeoutMs, init = {}) {
  const url = new URL(pathname, baseUrl);
  return fetch(url, {
    headers: { accept, ...(init.headers || {}) },
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
    ...init,
  });
}

const htmlRoutes = [
  "/",
  "/trucks",
  "/decision",
  "/executive",
  "/analysis",
  "/market",
  "/calendar",
  "/travel-guide",
  "/trip-planner",
  "/pilot",
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

test("runtime health endpoint is healthy", async () => {
  const response = await request("/api/health", "application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "okno-v-kitai");
});

test("runtime readiness endpoint is ready with current schema", async () => {
  const response = await request("/api/ready", "application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.equal(payload.status, "ready");
  assert.equal(payload.checks?.runtimeDataWritable, true);
  assert.equal(payload.checks?.sqliteAvailable, true);
  assert.equal(payload.checks?.migrationsCurrent, true);
});

test("runtime news endpoint is using v1.7.1 source catalog", async () => {
  const response = await request("/api/news", "application/json", 25_000);
  assert.equal(response.status, 200, `/api/news returned HTTP ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.equal(payload.sourceCatalogVersion, 2);
  assert.ok(Array.isArray(payload.news));
  assert.ok(Array.isArray(payload.sourceBreakdown));
  assert.ok(payload.totalSources >= payload.sourceCount);
  assert.ok(Number.isInteger(payload.rawCount) && payload.rawCount >= 0);
  assert.ok(Number.isInteger(payload.deduplicatedCount) && payload.deduplicatedCount >= 0);
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

test("runtime v1.7.5 membership endpoint is available to participant context", async () => {
  const response = await request("/api/pilot/me", "application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.equal(typeof payload.cohort, "string");
  assert.equal(typeof payload.enforcement, "boolean");
  assert.equal(typeof payload.eligible, "boolean");
  assert.ok(payload.member === null || typeof payload.member === "object");
});

test("runtime corporate pilot KPI report is not exposed to anonymous viewer", async () => {
  const response = await request("/api/pilot/report?days=14", "application/json");
  assert.equal(response.status, 403);
});

test("runtime cohort register is not exposed to anonymous viewer", async () => {
  const response = await request("/api/pilot/cohort", "application/json");
  assert.equal(response.status, 403);
});

test("runtime legacy user preferences remain available", async () => {
  const response = await request("/api/user/preferences", "application/json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.subscriptions);
  assert.ok(Array.isArray(payload.subscriptions.brands));
  assert.ok(Array.isArray(payload.subscriptions.markets));
  assert.ok(Array.isArray(payload.subscriptions.topics));
  assert.ok(Array.isArray(payload.subscriptions.events));
  assert.equal(typeof payload.subscriptions.eventLeadDays, "number");
});

test("runtime notification endpoint remains operational", async () => {
  const response = await request("/api/user/notifications", "application/json", 18_000);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.notifications));
  assert.equal(typeof payload.unread, "number");
});
