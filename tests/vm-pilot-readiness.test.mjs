import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const readinessSh = read('scripts/readiness-both-vm.sh');
const readinessPs = read('scripts/readiness-both-vm.ps1');
const readinessBat = read('READINESS_BOTH_VM.bat');
const controlSh = read('scripts/vm-control.sh');
const controlBat = read('MGC_VM_CONTROL.bat');
const startSh = read('scripts/start-both-vm.sh');

test('pilot readiness report combines live status, acceptance identity and backup metadata', () => {
  for (const source of [readinessSh, readinessPs]) {
    assert.match(source, /status-both-vm/u);
    assert.match(source, /MGC_VM_ACCEPTANCE_ROOT/u);
    assert.match(source, /MGC_VM_BACKUP_ROOT/u);
    assert.match(source, /acceptance\.json/u);
    assert.match(source, /checksums\.sha256/u);
    assert.match(source, /manifest\.json/u);
    assert.match(source, /okno_commit/u);
    assert.match(source, /mgc_languages_commit/u);
    assert.match(source, /allowed_cidr/u);
    assert.match(source, /PILOT READINESS/u);
  }
});

test('readiness report fails closed when accepted revisions or CIDR drift', () => {
  for (const source of [readinessSh, readinessPs]) {
    assert.match(source, /ACCEPTANCE STALE/u);
    assert.match(source, /Run ACCEPT_BOTH_VM again/u);
    assert.match(source, /currentOkno|current_okno/u);
    assert.match(source, /currentLanguages|current_lang/u);
    assert.match(source, /currentCidr|current_cidr/u);
  }
});

test('readiness validates the small acceptance receipt and backup manifest checksums', () => {
  assert.match(readinessSh, /sha256sum -c checksums\.sha256/u);
  assert.match(readinessSh, /manifest\.json/u);
  assert.match(readinessPs, /Get-FileHash/u);
  assert.match(readinessPs, /Test-Sha256Receipt/u);
});

test('missing or older backup is advisory rather than silently declaring it current', () => {
  for (const source of [readinessSh, readinessPs]) {
    assert.match(source, /No normal timestamped backup found/u);
    assert.match(source, /different revisions than the current checkout/u);
    assert.match(source, /fresh backup before risky maintenance/u);
  }
});

test('readiness command is read-only with respect to service and data lifecycle', () => {
  for (const source of [readinessSh, readinessPs]) {
    assert.doesNotMatch(source, /docker\s+compose[^\n\r]*(?:\bup\b|\bdown\b|\brestart\b|\bstop\b)/iu);
    assert.doesNotMatch(source, /reset --hard|clean -f/iu);
    assert.doesNotMatch(source, /pg_restore|dropdb|VACUUM INTO/iu);
    assert.doesNotMatch(source, /Remove-Item[^\n\r]*(?:vm-backups|vm-acceptance)/iu);
  }
});

test('Windows and Linux operator consoles expose one-click readiness report', () => {
  assert.match(readinessBat, /readiness-both-vm\.ps1/u);
  assert.match(readinessBat, /ACCEPTANCE is STALE/u);
  assert.match(controlBat, /READINESS/u);
  assert.match(controlBat, /READINESS_BOTH_VM\.bat/u);
  assert.match(controlSh, /READINESS/u);
  assert.match(controlSh, /readiness-both-vm\.sh/u);
});

test('shared Linux start repairs readiness executable bit', () => {
  assert.match(startSh, /scripts\/readiness-both-vm\.sh/u);
  assert.match(startSh, /scripts\/write-vm-acceptance-receipt\.sh/u);
});
