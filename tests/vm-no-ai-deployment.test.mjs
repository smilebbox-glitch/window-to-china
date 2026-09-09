import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const env = read(".env.vm.example");
const override = read("compose.vm.yaml");
const linux = read("scripts/start-vm.sh");
const windows = read("scripts/start-vm.ps1");
const bat = read("START_VM.bat");

test("VM profile explicitly disables generative RAG while keeping the core app", () => {
  assert.match(env, /^RAG_API_URL=$/mu);
  assert.match(env, /^RAG_API_KEY=$/mu);
  assert.match(env, /^RAG_MODEL=$/mu);
  assert.match(override, /RAG_API_URL:\s*""/u);
  assert.match(override, /RAG_MODEL:\s*""/u);
  assert.match(env, /^APP_PORT=3000$/mu);
});

test("VM profile is bounded for CPU-only operation", () => {
  assert.match(env, /^APP_MEMORY_LIMIT=768m$/mu);
  assert.match(env, /^APP_CPU_LIMIT=1\.25$/mu);
  assert.match(env, /^NEWS_SOURCE_CONCURRENCY=2$/mu);
  assert.match(override, /mem_limit:/u);
  assert.match(override, /cpus:/u);
});

test("Linux and Windows VM launchers use the dedicated env and compose override", () => {
  for (const source of [linux, windows]) {
    assert.match(source, /\.env\.vm/u);
    assert.match(source, /compose\.vm\.yaml/u);
    assert.match(source, /compose\.yaml/u);
  }
  assert.match(bat, /scripts\\start-vm\.ps1/iu);
});
