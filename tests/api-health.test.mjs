import assert from "node:assert/strict";
import test from "node:test";

/**
 * Exercises the built server bundle in-process, without starting a listener.
 *
 * This used to import the bundle as a Cloudflare Worker — `worker.fetch(request,
 * env, ctx)` with a faked ASSETS binding and ExecutionContext. That entry point
 * was scaffolding from the starter template: nothing deploys to Workers, and the
 * server code uses node:sqlite and node:fs, which Workers cannot run. With the
 * Cloudflare branch removed, the bundle exports a plain fetch handler.
 */
async function loadHandler() {
  const bundleUrl = new URL("../dist/server/index.js", import.meta.url);
  bundleUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(bundleUrl.href);
  assert.equal(typeof handler, "function", "dist/server/index.js must export a fetch handler");
  return handler;
}

test("health API exposes the deployment contract", async () => {
  const handler = await loadHandler();
  const response = await handler(
    new Request("http://localhost/api/health", { headers: { accept: "application/json" } }),
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const payload = await response.json();
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "okno-v-kitai");
  assert.equal(typeof payload.version, "string");
  assert.ok(payload.version.length > 0);
  assert.ok(Number.isFinite(Date.parse(payload.time)), "health time must be a valid ISO timestamp");
});

test("health API reports the manifest version, not a stale hard-coded fallback", async () => {
  // Three endpoints each carried their own frozen fallback ("1.6.1-pilot",
  // "1.4.0-pilot") in a 1.7.9 repository. lib/app-version.ts is now the single
  // source, and the security preflight fails if it drifts from package.json.
  const { readFileSync } = await import("node:fs");
  const manifestVersion = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

  const handler = await loadHandler();
  const response = await handler(
    new Request("http://localhost/api/health", { headers: { accept: "application/json" } }),
  );
  const payload = await response.json();
  assert.equal(payload.version, process.env.APP_VERSION?.trim() || manifestVersion);
});
