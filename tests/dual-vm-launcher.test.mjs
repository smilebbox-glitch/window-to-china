import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const linux = read('scripts/start-both-vm.sh');
const windows = read('scripts/start-both-vm.ps1');
const bat = read('START_BOTH_VM.bat');

test('dual VM launchers orchestrate both existing VM profiles', () => {
  for (const source of [linux, windows]) {
    assert.match(source, /mgc-languages/u);
    assert.match(source, /start-vm/u);
    assert.match(source, /MGC_LANGUAGES_PATH/u);
    assert.match(source, /3000/u);
    assert.match(source, /8080/u);
  }
  assert.match(bat, /start-both-vm\.ps1/u);
  assert.match(bat, /port 3000/u);
  assert.match(bat, /port 8080/u);
});

test('shared start is fail-closed behind the host firewall before either service starts', () => {
  for (const source of [linux, windows]) {
    assert.match(source, /host-firewall-preflight/u);
    assert.match(source, /GITHUB_ACTIONS/u);
    assert.match(source, /GITHUB_RUN_ID/u);
    assert.match(source, /MGC_VM_FIREWALL_CONTRACT_ONLY/u);
    assert.ok(source.indexOf('Host firewall preflight') < source.indexOf('Starting Okno v Kitai'));
  }
  assert.match(bat, /CONFIGURE_VM_FIREWALL\.bat/u);
  assert.match(bat, /approved corporate subnet/u);
});

test('shared start reports GO only after firewall, readiness and ingress-isolation gates', () => {
  assert.match(linux, /status-both-vm\.sh/u);
  assert.match(linux, /Final readiness \+ ingress isolation gate/u);
  assert.match(linux, /passed host firewall, readiness and ingress isolation checks/u);

  assert.match(windows, /status-both-vm\.ps1/u);
  assert.match(windows, /powershell\.exe/u);
  assert.match(windows, /LASTEXITCODE/u);
  assert.match(windows, /Final readiness \+ ingress isolation gate/u);
  assert.match(windows, /passed host firewall, readiness and ingress isolation checks/u);
});
