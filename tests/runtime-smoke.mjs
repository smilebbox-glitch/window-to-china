import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);

async function request(pathname, accept, timeout = timeoutMs) {
  const url = new URL(pathname, baseUrl);
  return fetch(url, {
    headers: { accept },
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
  });
}

const htmlRoutes = [
  "/",
  "/market",
  "/calendar",
  "/travel-guide",
  "/trip-planner",
];

for (const route of htmlRoutes) {
  test(`runtime page ${route} returns HTML`, async () => {
    const response = await request(route, "text/html");
    assert.equal(response.status, 200, `${route} returned HTTP ${response.status}`);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^text\/html\b/i,
      `${route} must return HTML`,
    );
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

test("runtime news endpoint is using v1.7 intelligence pipeline", async () => {
  const response = await request("/api/news", "application/json", 22_000);
  assert.equal(response.status, 200, `/api/news returned HTTP ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.equal(payload.sourceCatalogVersion, 1);
  assert.ok(Array.isArray(payload.news));
  assert.ok(Array.isArray(payload.sourceBreakdown));
  assert.ok(payload.totalSources >= payload.sourceCount);
  assert.ok(Number.isInteger(payload.rawCount) && payload.rawCount >= 0);
  assert.ok(Number.isInteger(payload.deduplicatedCount) && payload.deduplicatedCount >= 0);
});
