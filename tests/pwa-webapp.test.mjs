import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("Web App + PWA contract", () => {
  const result = spawnSync(process.execPath, ["scripts/pwa-webapp-preflight.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join("\n"),
  );
});
