import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = process.cwd();
const sandbox = await mkdtemp(path.join(os.tmpdir(), "okno-security-findings-"));
process.env.PILOT_DB_PATH = path.join(sandbox, "pilot.sqlite");
process.env.AUDIT_LOG_PATH = path.join(sandbox, "audit.jsonl");
process.env.RUNTIME_CONFIG_PATH = path.join(sandbox, "runtime.json");
process.env.AUTH_MODE = "disabled";
process.env.ADMIN_API_TOKEN = "test-admin-token-for-security-findings";
process.env.RATE_LIMIT_READ_PER_MINUTE = "2";
process.env.RATE_LIMIT_UNTRUSTED_GLOBAL_FACTOR = "1";
process.env.TRUSTED_PROXY = "0";

const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
  const { getPilotDb } = await vite.ssrLoadModule("/lib/pilot-db.ts");
  getPilotDb().close();
  await rm(sandbox, { recursive: true, force: true });
});

const request = (pathname, init = {}) => new Request(`http://localhost${pathname}`, init);

test("anonymous content GET cannot return a draft, while editor GET can", async () => {
  const { GET, POST } = await vite.ssrLoadModule("/app/api/admin/content/route.ts");
  const created = await POST(request("/api/admin/content", {
    method: "POST",
    headers: { "x-admin-token": process.env.ADMIN_API_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ section: "travel-guide", slug: "security-draft", title: "Private draft", body: "Not published", status: "draft" }),
  }));
  assert.equal(created.status, 200);

  const anonymous = await GET(request("/api/admin/content"));
  assert.equal(anonymous.status, 200);
  const anonymousItems = (await anonymous.json()).items;
  assert.equal(anonymousItems.some((item) => item.slug === "security-draft"), false);

  const editor = await GET(request("/api/admin/content", { headers: { "x-admin-token": process.env.ADMIN_API_TOKEN } }));
  assert.equal(editor.status, 200);
  assert.equal((await editor.json()).items.some((item) => item.slug === "security-draft"), true);
});

test("anonymous tracking has a shared request ceiling", async () => {
  const { POST } = await vite.ssrLoadModule("/app/api/user/track/route.ts");
  const send = () => POST(request("/api/user/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName: "page_view", path: "/news" }),
  }));
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 429);
});

test("notification GET does not generate another user's notifications", async () => {
  const { getPilotDb } = await vite.ssrLoadModule("/lib/pilot-db.ts");
  const { saveSubscriptions } = await vite.ssrLoadModule("/lib/user-store.ts");
  const { GET } = await vite.ssrLoadModule("/app/api/user/notifications/route.ts");
  const db = getPilotDb();
  saveSubscriptions("other-user", { notificationsEnabled: true, brands: ["GWM"] });
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO source_snapshots (cache_key,source_key,scope,payload_json,fetched_at,expires_at,stale_until,status,quality_score,item_count,error,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run("security-news", "news.aggregate", "", JSON.stringify({ news: [{ id: "security-gwm", title: "GWM update", summary: "GWM update", url: "https://example.com/news", publishedAt: now, source: "test", brand: "GWM", market: "Китай" }] }), now, now, now, "fresh", 100, 1, "", now);

  const response = await GET(request("/api/user/notifications"));
  assert.equal(response.status, 200);
  const count = db.prepare("SELECT COUNT(*) AS count FROM user_notifications WHERE user_key=?").get("other-user").count;
  assert.equal(count, 0);
});

test("notification GET has a shared request ceiling", async () => {
  const { GET } = await vite.ssrLoadModule("/app/api/user/notifications/route.ts");
  assert.equal((await GET(request("/api/user/notifications"))).status, 200);
  assert.equal((await GET(request("/api/user/notifications"))).status, 429);
});

test("tracking rejects an oversized body before inserting a usage row", async () => {
  process.env.RATE_LIMIT_READ_PER_MINUTE = "100";
  const { POST } = await vite.ssrLoadModule("/app/api/user/track/route.ts");
  const { getPilotDb } = await vite.ssrLoadModule("/lib/pilot-db.ts");
  const db = getPilotDb();
  const before = db.prepare("SELECT COUNT(*) AS count FROM usage_events").get().count;
  const response = await POST(request("/api/user/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName: "page_view", metadata: { payload: "x".repeat(20_000) } }),
  }));
  assert.equal(response.status, 413);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM usage_events").get().count, before);
  process.env.RATE_LIMIT_READ_PER_MINUTE = "2";
});

test("tracking rejects malformed JSON without inserting a usage row", async () => {
  process.env.RATE_LIMIT_READ_PER_MINUTE = "100";
  const { POST } = await vite.ssrLoadModule("/app/api/user/track/route.ts");
  const { getPilotDb } = await vite.ssrLoadModule("/lib/pilot-db.ts");
  const db = getPilotDb();
  const before = db.prepare("SELECT COUNT(*) AS count FROM usage_events").get().count;
  const response = await POST(request("/api/user/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not-json",
  }));
  assert.equal(response.status, 400);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM usage_events").get().count, before);
  process.env.RATE_LIMIT_READ_PER_MINUTE = "2";
});

test("standalone Windows VM launch refuses startup when firewall preflight is missing", async () => {
  const vmRoot = path.join(sandbox, "vm-launch");
  await mkdir(path.join(vmRoot, "scripts"), { recursive: true });
  await copyFile(path.join(root, "scripts", "start-vm.ps1"), path.join(vmRoot, "scripts", "start-vm.ps1"));
  await writeFile(path.join(vmRoot, ".env.vm"), "APP_PORT=3000\n");
  const log = path.join(vmRoot, "docker-events.txt");
  const scriptPath = path.join(vmRoot, "scripts", "start-vm.ps1");
  const command = `$ErrorActionPreference='Stop'; $global:LASTEXITCODE=0; function docker { $global:LASTEXITCODE=0; if ($args -contains 'up') { Add-Content -LiteralPath '${log}' -Value "up:$env:APP_BIND_ADDRESS" }; if ($args -contains 'ps') { return 'fakecid' }; if ($args -contains 'inspect') { return 'healthy' } }; try { & '${scriptPath}'; exit 0 } catch { Write-Host $_; exit 1 }`;
  const run = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], { encoding: "utf8", timeout: 30_000 });
  assert.notEqual(run.status, 0, `VM startup unexpectedly succeeded: ${run.stdout} ${run.stderr}`);
  const events = await readFile(log, "utf8").catch(() => "");
  assert.equal(events.includes("up"), false, "Docker Compose up ran before firewall verification");

  const preflight = path.join(vmRoot, "scripts", "host-firewall-preflight.ps1");
  await writeFile(preflight, "exit 1\n");
  const denied = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], { encoding: "utf8", timeout: 30_000 });
  assert.notEqual(denied.status, 0, "a failed firewall check must block startup");
  assert.equal((await readFile(log, "utf8").catch(() => "")).includes("up"), false);

  await writeFile(preflight, "exit 0\n");
  const admitted = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], { encoding: "utf8", timeout: 30_000 });
  assert.equal(admitted.status, 0, `an approved VM startup failed: ${admitted.stdout} ${admitted.stderr}`);
  assert.equal((await readFile(log, "utf8")).includes("up"), true);

  await writeFile(log, "");
  await writeFile(path.join(vmRoot, ".env.vm"), "APP_PORT=4000\nAPP_BIND_ADDRESS=0.0.0.0\n");
  const customPort = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], { encoding: "utf8", timeout: 30_000 });
  assert.notEqual(customPort.status, 0, "a wildcard custom port is not covered by the firewall rules");
  assert.equal((await readFile(log, "utf8")).includes("up"), false);

  await writeFile(log, "");
  await writeFile(path.join(vmRoot, ".env.vm"), "APP_PORT=3000\nAPP_BIND_ADDRESS=0.0.0.0\n");
  const ci = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    encoding: "utf8", timeout: 30_000,
    env: { ...process.env, GITHUB_ACTIONS: "true", GITHUB_RUN_ID: "test-run" },
  });
  assert.equal(ci.status, 0, `CI contract startup failed: ${ci.stdout} ${ci.stderr}`);
  assert.match(await readFile(log, "utf8"), /up:127\.0\.0\.1/u, "CI contract mode must bind only to loopback");
});
