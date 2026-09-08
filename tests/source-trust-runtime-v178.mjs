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

test("live news API exposes sourceType for every returned item", async () => {
  const response = await request("/api/news", "application/json", 25_000);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.news));
  for (const item of payload.news) {
    assert.ok(["official", "media", "telegram"].includes(item.sourceType), `${item.id} has invalid sourceType=${item.sourceType}`);
    assert.equal(typeof item.source, "string");
    assert.ok(item.source.length > 0);
    assert.equal(typeof item.url, "string");
    assert.ok(item.url.startsWith("http"));
  }
});

test("news page renders human-readable source trust labels", async () => {
  const response = await request("/news", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Официальный источник|Отраслевое СМИ|Telegram/u);
});

test("source trust badges are informational and do not replace primary-source links", async () => {
  const response = await request("/news", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Первоисточник/u);
});
