import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const startBat = read("START.bat");
const repair = read("scripts/repair-env.ps1");

test("Windows launcher repairs local env before starting LAN mode", () => {
  const repairIndex = startBat.indexOf("scripts\\repair-env.ps1");
  const lanIndex = startBat.indexOf("scripts\\start-lan.ps1");

  assert.ok(repairIndex >= 0, "START.bat must invoke repair-env.ps1");
  assert.ok(lanIndex >= 0, "START.bat must invoke start-lan.ps1");
  assert.ok(repairIndex < lanIndex, "env repair must happen before LAN startup");
  assert.match(startBat, /if not "%REPAIR_RC%"=="0"/u);
});

test("env repair prevents oversized files from exhausting PowerShell memory", () => {
  assert.match(repair, /\$MaxEnvBytes = 1MB/u);
  assert.match(repair, /Get-Item -LiteralPath \$EnvPath/u);
  assert.match(repair, /\$envFile\.Length -le \$MaxEnvBytes/u);
  assert.match(repair, /\.env\.oversized-\$stamp\.bak/u);
  assert.match(repair, /Move-Item -LiteralPath \$EnvPath -Destination \$backupPath -Force/u);
  assert.match(repair, /Copy-Item -LiteralPath \$ExamplePath -Destination \$EnvPath/u);
  assert.doesNotMatch(repair, /Get-Content\s+['"]?\.env/u);
});

test("env repair creates a missing env from the tracked template", () => {
  assert.match(repair, /Test-Path -LiteralPath \$ExamplePath -PathType Leaf/u);
  assert.match(repair, /Copy-Item -LiteralPath \$ExamplePath -Destination \$EnvPath/u);
  assert.match(repair, /Created \.env from \.env\.example/u);
});
