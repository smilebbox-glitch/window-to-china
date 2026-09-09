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

test('shared start reports GO only after the readiness and ingress-isolation status gate', () => {
  assert.match(linux, /status-both-vm\.sh/u);
  assert.match(linux, /Final readiness \+ ingress isolation gate/u);
  assert.match(linux, /passed readiness and ingress isolation checks/u);

  assert.match(windows, /status-both-vm\.ps1/u);
  assert.match(windows, /powershell\.exe/u);
  assert.match(windows, /LASTEXITCODE/u);
  assert.match(windows, /Final readiness \+ ingress isolation gate/u);
  assert.match(windows, /passed readiness and ingress isolation checks/u);
});
