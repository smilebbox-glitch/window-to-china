import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("corporate HTTPS + SSO contract", () => {
  const result = spawnSync(process.execPath, ["scripts/corporate-https-sso-preflight.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join("\n"),
  );
});
