import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  // The built bundle exports a plain fetch handler since the unused Cloudflare
  // Worker entry point was removed; no ASSETS binding or ExecutionContext to fake.
  const bundleUrl = new URL("../dist/server/index.js", import.meta.url);
  bundleUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(bundleUrl.href);
  assert.equal(typeof handler, "function", "dist/server/index.js must export a fetch handler");

  const response = await handler(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(await response.text(), developmentPreviewMeta);
});
