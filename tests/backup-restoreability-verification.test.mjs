import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const sh = read('scripts/verify-backup-both-vm.sh');
const ps = read('scripts/verify-backup-both-vm.ps1');
const weeklySh = read('scripts/manage-weekly-backup-verify.sh');
const weeklyPs = read('scripts/manage-weekly-backup-verify.ps1');
const bat = read('VERIFY_BACKUP_BOTH_VM.bat');
const weeklyBat = read('WEEKLY_BACKUP_VERIFY.bat');
const controlSh = read('scripts/vm-control.sh');
const controlBat = read('MGC_VM_CONTROL.bat');

test('restoreability drill verifies the latest signed backup bundle', () => {
  for (const source of [sh, ps]) {
    assert.match(source, /MGC_VM_BACKUP_ROOT/u);
    assert.match(source, /MGC_VM_BACKUP_VERIFY_ROOT/u);
    assert.match(source, /checksums\.sha256/u);
    assert.match(source, /sha256sum/u);
    assert.match(source, /okno\.sqlite/u);
    assert.match(source, /mgc_languages\.dump/u);
    assert.match(source, /verification\.json/u);
  }
});

test('SQLite verification is read-only and PostgreSQL restore is isolated', () => {
  for (const source of [sh, ps]) {
    assert.match(source, /PRAGMA integrity_check/u);
    assert.match(source, /readOnly/u);
    assert.match(source, /--network/u);
    assert.match(source, /none/u);
    assert.match(source, /pg_restore/u);
    assert.match(source, /--no-owner/u);
    assert.match(source, /--no-privileges/u);
    assert.match(source, /postgres:16\.4-alpine/u);
    assert.match(source, /postgres_public_tables/u);
    assert.doesNotMatch(source, /docker\s+compose[^\n\r]*(?:up|down)/u);
    assert.doesNotMatch(source, /--publish(?:=|\s)/u);
    assert.doesNotMatch(source, /^\s+-p(?:=|\s)/mu);
  }
});

test('restoreability drill never targets the live pilot database services', () => {
  for (const source of [sh, ps]) {
    assert.doesNotMatch(source, /pg_restore[^\n\r]*(?:mgc-languages-db|\bdb\b.*5432)/u);
    assert.doesNotMatch(source, /okno-runtime-data/u);
    assert.doesNotMatch(source, /lan_pgdata/u);
    assert.match(source, /BACKUP RESTOREABILITY/u);
    assert.match(source, /WITHOUT MODIFYING PILOT DATABASES/u);
  }
});

test('weekly scheduler is persistent and uses the non-destructive verifier', () => {
  assert.match(weeklySh, /Persistent=true/u);
  assert.match(weeklySh, /RandomizedDelaySec=15m/u);
  assert.match(weeklySh, /verify-backup-both-vm\.sh/u);
  assert.match(weeklySh, /MGC_VM_WEEKLY_VERIFY_DAY/u);
  assert.match(weeklySh, /MGC_VM_WEEKLY_VERIFY_TIME/u);

  assert.match(weeklyPs, /New-ScheduledTaskTrigger/u);
  assert.match(weeklyPs, /-Weekly/u);
  assert.match(weeklyPs, /StartWhenAvailable/u);
  assert.match(weeklyPs, /Interactive/u);
  assert.match(weeklyPs, /verify-backup-both-vm\.ps1/u);
  assert.match(weeklyPs, /MGC_VM_WEEKLY_VERIFY_DAY/u);
  assert.match(weeklyPs, /MGC_VM_WEEKLY_VERIFY_TIME/u);
});

test('operator consoles expose manual and weekly backup verification', () => {
  assert.match(bat, /verify-backup-both-vm\.ps1/u);
  assert.match(weeklyBat, /manage-weekly-backup-verify\.ps1/u);
  for (const source of [controlSh, controlBat]) {
    assert.match(source, /VERIFY BACKUP/u);
    assert.match(source, /WEEKLY VERIFY/u);
  }
  assert.match(controlSh, /verify-backup-both-vm\.sh/u);
  assert.match(controlSh, /manage-weekly-backup-verify\.sh/u);
  assert.match(controlBat, /VERIFY_BACKUP_BOTH_VM\.bat/u);
  assert.match(controlBat, /WEEKLY_BACKUP_VERIFY\.bat/u);
});
