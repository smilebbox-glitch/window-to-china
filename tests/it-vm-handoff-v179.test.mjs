import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const handoff = read("IT_VM_HANDOFF.md");
const checklist = read("IT_VM_ACCEPTANCE_CHECKLIST.md");
const vmEnv = read(".env.vm.example");
const corporateEnv = read(".env.corporate.example");
const vmCompose = read("compose.vm.yaml");
const corporateCompose = read("compose.corporate.yaml");
const windowsVm = read("START_VM.bat");
const linuxVm = read("scripts/start-vm.sh");
const corporateDoc = read("docs/CORPORATE_HTTPS_SSO_v1.7.9.md");

const requiredFiles = [
  "START_VM.bat",
  "scripts/start-vm.ps1",
  "scripts/start-vm.sh",
  "START_CORPORATE_HTTPS.bat",
  "STATUS_CORPORATE.bat",
  "STOP_CORPORATE.bat",
  ".env.vm.example",
  ".env.corporate.example",
  "compose.vm.yaml",
  "compose.corporate.yaml",
  "docs/CORPORATE_HTTPS_SSO_v1.7.9.md",
  "docs/PWA_WEB_APP_v1.7.9.md",
  "SECURITY.md",
  "SECURITY_PILOT.md",
];

test("IT handoff points to a single-service VM deployment and preserves pilot version", () => {
  assert.match(handoff, /только сервиса `window-to-china`/u);
  assert.match(handoff, /1\.7\.9-pilot/);
  assert.match(handoff, /git rev-parse HEAD/);
  assert.match(handoff, /IT_DUAL_VM_QUICKSTART\.md/);
  assert.match(handoff, /Corporate HTTPS \+ SSO/u);
  assert.match(handoff, /Temporary isolated VM pilot/u);
  assert.match(handoff, /4 vCPU/);
  assert.match(handoff, /8 GB RAM/);
  assert.match(handoff, /GPU не требуется/u);
});

test("IT handoff includes launch, security boundary, health, PWA, backup and rollback guidance", () => {
  for (const marker of [
    "START_VM.bat",
    "scripts/start-vm.sh",
    "START_CORPORATE_HTTPS.bat",
    "/api/health",
    "/api/ready",
    "/manifest.json",
    "/sw.js",
    "/api/admin/backup",
    "docker compose down -v",
    "git pull --ff-only origin main",
  ]) assert.match(handoff, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"), marker);

  assert.match(handoff, /не должен быть доступен из публичного Интернета/u);
  assert.match(handoff, /AUTH_MODE=disabled/u);
  assert.match(handoff, /NO-GO/u);
  assert.match(handoff, /persistent Docker volume/u);
});

test("VM profiles remain CPU-light, no-RAG by default, and corporate SSO is fail-closed", () => {
  assert.match(vmEnv, /APP_VERSION=1\.7\.9-pilot/);
  assert.match(vmEnv, /AUTH_MODE=disabled/);
  assert.match(vmEnv, /RAG_API_URL=\s*$/m);
  assert.match(vmEnv, /APP_MEMORY_LIMIT=768m/);
  assert.match(vmCompose, /RAG_API_URL:\s*""/);
  assert.match(vmCompose, /cpus:\s*\$\{APP_CPU_LIMIT:-1\.25\}/);

  assert.match(corporateEnv, /APP_VERSION=1\.7\.9-pilot/);
  assert.match(corporateEnv, /OIDC_ISSUER_URL=CHANGE_ME_IT/);
  assert.match(corporateEnv, /SSO_ALLOWED_GROUP=okno-china-users/);
  assert.match(corporateCompose, /AUTH_MODE:\s*proxy/);
  assert.match(corporateCompose, /okno-corporate-runtime-data:\/data/);
  assert.match(corporateCompose, /oauth2-proxy/);
  assert.match(corporateDoc, /не имеет host-port/u);
});

test("single-service launchers enforce Docker checks and only report GO after health", () => {
  assert.match(windowsVm, /scripts\\start-vm\.ps1/);
  assert.match(windowsVm, /\[GO\] Okno v Kitai VM is ready/);
  assert.match(linuxVm, /docker info/);
  assert.match(linuxVm, /docker compose version/);
  assert.match(linuxVm, /\[NO-GO\] Application did not become healthy/);
  assert.match(linuxVm, /\[GO\] Okno v Kitai VM is ready/);
});

test("IT acceptance checklist covers deployment identity and all release boundaries", () => {
  for (const marker of [
    "git rev-parse HEAD",
    "Corporate HTTPS + SSO",
    "Temporary isolated VM pilot",
    "/api/health",
    "/api/ready",
    "/api/news",
    "/manifest.json",
    "/sw.js",
    "/api/admin/backup",
    "CodeQL",
    "GO — VM допущена",
    "NO-GO",
  ]) assert.ok(checklist.includes(marker), `missing checklist marker: ${marker}`);
});

test("all files handed to IT exist in the repository", () => {
  for (const file of requiredFiles) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `missing IT handoff file: ${file}`);
  }
});
