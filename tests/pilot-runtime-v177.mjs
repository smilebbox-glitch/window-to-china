import test from "node:test";
import assert from "node:assert/strict";

const baseUrl = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const defaultTimeoutMs = Number(process.env.PILOT_TEST_TIMEOUT_MS || 12_000);

async function request(pathname, accept = "application/json", timeoutMs = defaultTimeoutMs, init = {}) {
  const { headers = {}, ...rest } = init;
  return fetch(new URL(pathname, baseUrl), {
    ...rest,
    headers: { accept, ...headers },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function json(pathname, timeoutMs = defaultTimeoutMs) {
  const response = await request(pathname, "application/json", timeoutMs);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

const pages = [
  ["/", "Окно"],
  ["/news", "Новости"],
  ["/trucks", "Коммерческий транспорт"],
  ["/market", "Рынок"],
  ["/analysis", "Аналитика"],
  ["/decision", "Решения"],
  ["/executive", "Executive"],
  ["/calendar", "Выстав"],
  ["/travel-guide", "Перед поездкой"],
];

for (const [route, marker] of pages) {
  test(`pilot page ${route} is reachable`, async () => {
    const response = await request(route, "text/html");
    assert.equal(response.status, 200, `${route} returned HTTP ${response.status}`);
    assert.match(response.headers.get("content-type") || "", /^text\/html\b/i);
    const body = await response.text();
    assert.ok(body.length > 500, `${route} returned too little HTML`);
    assert.ok(body.toLocaleLowerCase("ru-RU").includes(marker.toLocaleLowerCase("ru-RU")), `${route} missing marker ${marker}`);
  });
}

test("health endpoint reports ok", async () => {
  const { response, payload } = await json("/api/health");
  assert.equal(response.status, 200);
  assert.equal(payload?.status, "ok");
  assert.equal(payload?.service, "okno-v-kitai");
});

test("readiness confirms writable runtime data and current migrations", async () => {
  const { response, payload } = await json("/api/ready");
  assert.equal(response.status, 200);
  assert.equal(payload?.status, "ready");
  assert.equal(payload?.checks?.runtimeDataWritable, true);
  assert.equal(payload?.checks?.sqliteAvailable, true);
  assert.equal(payload?.checks?.migrationsCurrent, true);
});

test("news API returns the v1.7.9 source catalog and deduplicated feed contract", async () => {
  const { response, payload } = await json("/api/news", 40_000);
  assert.equal(response.status, 200, `/api/news returned HTTP ${response.status}`);
  assert.equal(payload?.sourceCatalogVersion, 5);
  assert.ok(Array.isArray(payload?.news));
  assert.ok(Array.isArray(payload?.sourceBreakdown));
  assert.ok(Number.isInteger(payload?.rawCount));
  assert.ok(Number.isInteger(payload?.deduplicatedCount));
  assert.ok(payload.rawCount >= payload.deduplicatedCount);
  assert.ok(payload.totalSources >= payload.sourceCount);
  assert.ok(["live", "partial", "fresh", "stale"].includes(payload?.cache?.state));
});

test("news items expose transparent source metadata and unique primary URLs", async () => {
  const { response, payload } = await json("/api/news", 40_000);
  assert.equal(response.status, 200);
  const items = Array.isArray(payload?.news) ? payload.news : [];
  const urls = [];
  for (const item of items) {
    assert.equal(typeof item.source, "string");
    assert.ok(item.source.trim().length > 0, "news item source is empty");
    assert.ok(["official", "media", "telegram"].includes(item.sourceType), `invalid sourceType: ${item.sourceType}`);
    assert.equal(typeof item.url, "string");
    assert.match(item.url, /^https?:\/\//i, `invalid primary URL: ${item.url}`);
    assert.ok(Number.isFinite(Date.parse(item.publishedAt)), `invalid publishedAt: ${item.publishedAt}`);
    urls.push(item.url);
  }
  assert.equal(new Set(urls).size, urls.length, "exact duplicate news URLs returned by API");
});

test("strategic official sources are represented in source diagnostics", async () => {
  const { response, payload } = await json("/api/news", 40_000);
  assert.equal(response.status, 200);
  const names = new Set((payload?.sourceBreakdown || []).map((entry) => entry.source));
  assert.ok(names.has("news.web:evolute-official"), "EVOLUTE official source missing from diagnostics");
  assert.ok(names.has("news.web:voyah-official"), "VOYAH official source missing from diagnostics");
});

test("known unstable reserve portals do not run in default pilot source jobs", async () => {
  const { response, payload } = await json("/api/news", 40_000);
  assert.equal(response.status, 200);
  const names = new Set((payload?.sourceBreakdown || []).map((entry) => entry.source));
  for (const source of ["news.web:people-auto", "news.web:yiche", "news.web:gruzovikpress"]) {
    assert.equal(names.has(source), false, `${source} should be reserve-only in pilot defaults`);
  }
});

test("pilot operations exposes GO/NO_GO and freshness state", async () => {
  const { response, payload } = await json("/api/pilot/operations");
  assert.equal(response.status, 200);
  assert.ok(["GO", "NO_GO"].includes(payload?.decision));
  assert.ok(["GO", "DEGRADED", "STALE"].includes(payload?.briefStatus));
  assert.equal(typeof payload?.aggregate?.available, "boolean");
  assert.equal(typeof payload?.sources?.fresh, "number");
  assert.equal(typeof payload?.sources?.stale, "number");
  assert.equal(typeof payload?.sources?.error, "number");
  assert.equal(typeof payload?.sla?.maxAgeSeconds, "number");
  assert.ok(Array.isArray(payload?.reasons));
});

test("IT reliability endpoint exposes the same pilot operational gate", async () => {
  const { response, payload } = await json("/api/admin/reliability");
  assert.equal(response.status, 200);
  assert.ok(payload?.pilotOperations);
  assert.ok(["GO", "NO_GO"].includes(payload.pilotOperations.decision));
  assert.ok(["GO", "DEGRADED", "STALE"].includes(payload.pilotOperations.briefStatus));
});

test("controlled pilot report keeps KPI and pseudonymization contract", async () => {
  const { response, payload } = await json("/api/pilot/report");
  assert.equal(response.status, 200);
  assert.ok(["GO", "ADJUST", "STOP"].includes(payload?.outcome));
  assert.equal(payload?.policy?.targetMinUsers, 5);
  assert.equal(payload?.policy?.targetMaxUsers, 10);
  assert.ok(Array.isArray(payload?.cohort?.participants));
  assert.ok(payload.cohort.participants.every((entry) => /^P-[A-F0-9]{6}$/u.test(entry.code)));
});

test("notification endpoint remains operational", async () => {
  const { response, payload } = await json("/api/user/notifications", 20_000);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(payload?.notifications));
  assert.equal(typeof payload?.unread, "number");
});

test("approved home does not regress retired UI widgets", async () => {
  const response = await request("/", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  for (const retired of ["Решения на сегодня", "Что взять с собой", "Ключевые темы", "Популярные разделы", "Смотреть новости"]) {
    assert.equal(body.includes(retired), false, `retired UI returned: ${retired}`);
  }
});
