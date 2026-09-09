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
