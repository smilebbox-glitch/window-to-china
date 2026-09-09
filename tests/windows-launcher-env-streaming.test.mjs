import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const lan = read("scripts/start-lan.ps1");
const oneClick = read("scripts/one-click-start.ps1");
const envUtils = read("scripts/env-file-utils.ps1");

test("Windows launchers never load .env with Get-Content", () => {
  for (const [name, source] of [["start-lan", lan], ["one-click-start", oneClick]]) {
    assert.doesNotMatch(source, /Get-Content\s+['\"]\.env['\"]/u, `${name} must not load .env via Get-Content`);
    assert.doesNotMatch(source, /@\(Get-Content\s+['\"]\.env['\"]\)/u, `${name} must not materialize .env into memory`);
    assert.match(source, /env-file-utils\.ps1/u, `${name} must use the shared streaming env helper`);
    assert.match(source, /Get-EnvFileValue/u);
    assert.match(source, /Set-EnvFileValue/u);
  }
});

test("shared env helper uses line-by-line .NET streams", () => {
  assert.match(envUtils, /System\.IO\.StreamReader/u);
  assert.match(envUtils, /ReadLine\(\)/u);
  assert.match(envUtils, /System\.IO\.StreamWriter/u);
  assert.match(envUtils, /Move-Item[^\n]+-Force/u);
  assert.doesNotMatch(envUtils, /ReadAllLines|ReadAllText|Get-Content/u);
});
