import test from "node:test";
import assert from "node:assert/strict";

const baseUrl = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const timeoutMs = Number(process.env.PILOT_TEST_TIMEOUT_MS || 12_000);

async function request(pathname, accept = "application/json", timeout = timeoutMs) {
  return fetch(new URL(pathname, baseUrl), {
    headers: { accept },
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
  });
}

test("live news API exposes sourceType and primary URL for every returned item", async () => {
  const response = await request("/api/news", "application/json", 25_000);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.news));
  for (const item of payload.news) {
    assert.ok(["official", "media", "telegram"].includes(item.sourceType), `${item.id} has invalid sourceType=${item.sourceType}`);
    assert.equal(typeof item.source, "string");
    assert.ok(item.source.length > 0);
    assert.equal(typeof item.url, "string");
    assert.ok(/^https?:\/\//u.test(item.url), `${item.id} has invalid primary URL`);
  }
});

test("production news route ships the source trust client bundle", async () => {
  const response = await request("/news", "text/html");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const body = await response.text();
  assert.match(body, /Новости — Окно в Китай/u);
  assert.match(body, /source-trust-badge-[A-Za-z0-9_-]+\.js/u);
  assert.match(body, /news-dashboard-live-[A-Za-z0-9_-]+\.js/u);
});

test("live provenance contract preserves source name, type and original link together", async () => {
  const response = await request("/api/news", "application/json", 25_000);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.news));
  for (const item of payload.news) {
    assert.ok(item.source && item.sourceType && item.url, `${item.id} lost provenance metadata`);
  }
});
