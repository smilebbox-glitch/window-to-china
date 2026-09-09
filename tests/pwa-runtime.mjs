import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);

async function request(pathname, accept, headers = {}) {
  return fetch(new URL(pathname, baseUrl), {
    headers: { accept, ...headers },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

test("runtime serves the PWA manifest as JSON", async () => {
  const response = await request("/manifest.json", "application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  const manifest = await response.json();
  assert.equal(manifest.name, "Окно в Китай — Corporate Intelligence");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.theme_color, "#0a1d54");
  assert.ok(manifest.icons.some((icon) => icon.src === "/pwa-icon-512.png" && /maskable/.test(icon.purpose || "")));
});

test("runtime serves service worker with non-cacheable update policy", async () => {
  const response = await request("/sw.js", "text/javascript,application/javascript,*/*");
  assert.equal(response.status, 200);
  const cacheControl = response.headers.get("cache-control") ?? "";
  assert.match(cacheControl, /no-cache/i);
  assert.match(cacheControl, /no-store/i);
  assert.equal(response.headers.get("service-worker-allowed"), "/");
  const body = await response.text();
  assert.match(body, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(body, /request\.mode === "navigate"/);
  assert.match(body, /manifest\.json/);
  assert.match(body, /offline\.html/);
});

test("runtime serves neutral offline fallback", async () => {
  const response = await request("/offline.html", "text/html");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const body = await response.text();
  assert.match(body, /не показывает сохранённые новости или аналитику офлайн/u);
});

test("runtime serves PWA icons", async () => {
  for (const pathname of ["/pwa-icon-192.png", "/pwa-icon-512.png", "/apple-touch-icon.png"]) {
    const response = await request(pathname, "image/png");
    assert.equal(response.status, 200, pathname);
    assert.match(response.headers.get("content-type") ?? "", /^image\/png\b/i, pathname);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.ok(bytes.byteLength > 1_000, `${pathname} is unexpectedly small`);
  }
});

test("runtime HTML advertises install metadata", async () => {
  const response = await request("/", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /manifest\.json/);
  assert.match(body, /apple-touch-icon\.png/);
  assert.match(body, /mobile-web-app-capable/);
});

test("runtime HTML exposes the mobile app navigation contract", async () => {
  const response = await request("/", "text/html");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /aria-label="Основная мобильная навигация"/u);
  assert.match(body, /aria-label="Открыть поиск"/u);
  for (const label of ["Главная", "Новости", "Рынок", "События", "Ещё"]) {
    assert.match(body, new RegExp(label, "u"), `missing mobile navigation label: ${label}`);
  }
});

test("Android and iPhone user agents receive the same installable intelligence shell", async () => {
  const userAgents = [
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1",
  ];

  for (const userAgent of userAgents) {
    const response = await request("/", "text/html", { "user-agent": userAgent });
    assert.equal(response.status, 200, userAgent);
    const body = await response.text();
    assert.match(body, /manifest\.json/, userAgent);
    assert.match(body, /aria-label="Основная мобильная навигация"/u, userAgent);
    assert.match(body, /mobile-web-app-capable/, userAgent);
  }
});
