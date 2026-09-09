import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const acceptSh = read('scripts/accept-both-vm.sh');
const acceptPs = read('scripts/accept-both-vm.ps1');
const receiptSh = read('scripts/write-vm-acceptance-receipt.sh');
const receiptPs = read('scripts/write-vm-acceptance-receipt.ps1');
const acceptBat = read('ACCEPT_BOTH_VM.bat');
const controlSh = read('scripts/vm-control.sh');
const controlBat = read('MGC_VM_CONTROL.bat');
const startSh = read('scripts/start-both-vm.sh');

test('acceptance gate combines host firewall, runtime status and no-AI checks', () => {
  for (const source of [acceptSh, acceptPs]) {
    assert.match(source, /host-firewall-preflight/u);
    assert.match(source, /status-both-vm/u);
    assert.match(source, /RAG_API_URL/u);
    assert.match(source, /RAG_MODEL/u);
    assert.match(source, /RAG_API_KEY/u);
    assert.match(source, /TTS_ENABLED/u);
    assert.match(source, /TTS_DISK_CACHE_ENABLED/u);
    assert.match(source, /VM PILOT ACCEPTANCE PASSED/u);
    assert.match(source, /3000/u);
    assert.match(source, /8080/u);
  }
});

test('acceptance gate uses real firewall checks outside GitHub Actions and CI contract mode only inside Actions', () => {
  for (const source of [acceptSh, acceptPs]) {
    assert.match(source, /GITHUB_ACTIONS/u);
    assert.match(source, /GITHUB_RUN_ID/u);
    assert.match(source, /MGC_VM_FIREWALL_CONTRACT_ONLY/u);
    assert.match(source, /10\.250\.0\.0\/24/u);
  }
});

test('successful acceptance writes a timestamped checksum-protected evidence receipt', () => {
  assert.match(acceptSh, /write-vm-acceptance-receipt\.sh/u);
  assert.match(acceptPs, /write-vm-acceptance-receipt\.ps1/u);
  for (const source of [receiptSh, receiptPs]) {
    assert.match(source, /MGC_VM_ACCEPTANCE_ROOT/u);
    assert.match(source, /acceptance\.json/u);
    assert.match(source, /checksums\.sha256/u);
    assert.match(source, /dual-vm-cpu-only-no-ai/u);
    assert.match(source, /okno_commit/u);
    assert.match(source, /mgc_languages_commit/u);
    assert.match(source, /allowed_cidr/u);
    assert.match(source, /host_firewall/u);
    assert.match(source, /runtime_readiness/u);
    assert.match(source, /ingress_isolation/u);
    assert.match(source, /no_ai_runtime/u);
    assert.match(source, /3000/u);
    assert.match(source, /8080/u);
  }
  assert.match(receiptSh, /sha256sum -c/u);
  assert.match(receiptPs, /Get-FileHash/u);
});

test('acceptance evidence contains no VM secrets or container environment dumps', () => {
  for (const source of [receiptSh, receiptPs]) {
    assert.doesNotMatch(source, /RAG_API_KEY/u);
    assert.doesNotMatch(source, /ADMIN_API_TOKEN/u);
    assert.doesNotMatch(source, /SCHEDULER_TOKEN/u);
    assert.doesNotMatch(source, /POSTGRES_PASSWORD/u);
    assert.doesNotMatch(source, /Config\.Env/u);
  }
});

test('one-click Windows acceptance launcher and both operator consoles expose the gate', () => {
  assert.match(acceptBat, /accept-both-vm\.ps1/u);
  assert.match(acceptBat, /Do not invite users yet/u);
  assert.match(controlBat, /ACCEPTANCE/u);
  assert.match(controlBat, /ACCEPT_BOTH_VM\.bat/u);
  assert.match(controlSh, /ACCEPTANCE/u);
  assert.match(controlSh, /accept-both-vm\.sh/u);
});

test('shared Linux start repairs acceptance executable bit', () => {
  assert.match(startSh, /scripts\/accept-both-vm\.sh/u);
});

test('acceptance code never prints complete container environment or VM secret files', () => {
  for (const source of [acceptSh, acceptPs]) {
    assert.doesNotMatch(source, /cat[^\n\r]*\.env\.vm/u);
    assert.doesNotMatch(source, /Get-Content[^\n\r]*\.env\.vm/u);
    assert.doesNotMatch(source, /Write-(?:Host|Output)[^\n\r]*(?:ragKey|RAG_API_KEY)/iu);
    assert.doesNotMatch(source, /echo[^\n\r]*(?:rag_key|RAG_API_KEY)/iu);
  }
});
