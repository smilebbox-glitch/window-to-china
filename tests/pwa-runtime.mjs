import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);

async function request(pathname, accept) {
  return fetch(new URL(pathname, baseUrl), {
    headers: { accept },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

test("runtime serves the PWA manifest", async () => {
  const response = await request("/manifest.webmanifest", "application/manifest+json,application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/(manifest\+json|json)/i);
  const manifest = await response.json();
  assert.equal(manifest.name, "Окно в Китай — Corporate Intelligence");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
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
  assert.match(body, /manifest\.webmanifest/);
  assert.match(body, /apple-touch-icon\.png/);
  assert.match(body, /mobile-web-app-capable/);
});
