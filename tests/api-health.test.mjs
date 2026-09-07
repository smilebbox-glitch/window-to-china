import assert from "node:assert/strict";
import test from "node:test";

function createExecutionContext() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

test("health API exposes the deployment contract", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/api/health", {
      headers: { accept: "application/json" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    createExecutionContext(),
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
