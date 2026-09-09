import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

const statusSh = read('scripts/status-both-vm.sh');
const statusPs = read('scripts/status-both-vm.ps1');
const stopSh = read('scripts/stop-both-vm.sh');
const stopPs = read('scripts/stop-both-vm.ps1');
const backupSh = read('scripts/backup-both-vm.sh');
const backupPs = read('scripts/backup-both-vm.ps1');
const restoreSh = read('scripts/restore-both-vm.sh');
const restorePs = read('scripts/restore-both-vm.ps1');
const statusBat = read('STATUS_BOTH_VM.bat');
const stopBat = read('STOP_BOTH_VM.bat');
const backupBat = read('BACKUP_BOTH_VM.bat');
const restoreBat = read('RESTORE_BOTH_VM.bat');

test('dual VM status checks both readiness endpoints and both compose profiles', () => {
  for (const source of [statusSh, statusPs]) {
    assert.match(source, /compose\.vm\.yaml/u);
    assert.match(source, /docker-compose\.vm\.yml/u);
    assert.match(source, /api\/ready/u);
    assert.match(source, /health\/ready/u);
    assert.match(source, /3000/u);
    assert.match(source, /8080/u);
    assert.match(source, /MGC_LANGUAGES_PATH/u);
  }
  assert.match(statusBat, /status-both-vm\.ps1/u);
});

test('dual VM stop preserves Docker volumes', () => {
  for (const source of [stopSh, stopPs]) {
    assert.match(source, /down --remove-orphans/u);
    assert.doesNotMatch(source, /down\s+(?:[^\n\r]*\s)?-v(?:\s|$)/u);
    assert.doesNotMatch(source, /--volumes/u);
    assert.match(source, /volume was preserved/u);
  }
  assert.match(stopBat, /stop-both-vm\.ps1/u);
});

test('dual VM backup is database-consistent and integrity-verified', () => {
  for (const source of [backupSh, backupPs]) {
    assert.match(source, /sqlite-backup\.mjs/u);
    assert.match(source, /PRAGMA integrity_check/u);
    assert.match(source, /pg_dump/u);
    assert.match(source, /pg_restore --list/u);
    assert.match(source, /docker cp/u);
    assert.match(source, /checksums\.sha256/u);
    assert.match(source, /manifest\.json/u);
    assert.match(source, /MGC_VM_BACKUP_RETENTION_DAYS/u);
    assert.match(source, /MGC_VM_BACKUP_INCLUDE_SECRETS/u);
  }
  assert.match(backupBat, /backup-both-vm\.ps1/u);
});

test('Linux backup treats optional runtime artifacts as optional', () => {
  assert.match(backupSh, /if \[\[ -d "\$DEST\/okno-audit" \]\]; then/u);
  assert.match(backupSh, /if \[\[ -f "\$DEST\/runtime-config\.json" \]\]; then/u);
  assert.match(backupSh, /exit 0\s*$/u);
});

test('dual VM restore verifies the bundle, creates a safety backup and requires explicit confirmation', () => {
  for (const source of [restoreSh, restorePs]) {
    assert.match(source, /MGC_VM_RESTORE_CONFIRM/u);
    assert.match(source, /RESTORE/u);
    assert.match(source, /checksums\.sha256/u);
    assert.match(source, /dual-vm-cpu-only-no-ai/u);
    assert.match(source, /backup-both-vm/u);
    assert.match(source, /pre-restore/u);
    assert.match(source, /PRAGMA integrity_check/u);
    assert.match(source, /pg_restore/u);
    assert.match(source, /api\/ready/u);
    assert.match(source, /health\/ready/u);
  }
  assert.match(restoreBat, /restore-both-vm\.ps1/u);
  assert.match(restoreBat, /replaces BOTH pilot databases/u);
});

test('restore replaces databases only and preserves runtime configuration, audit logs and VM secrets', () => {
  for (const source of [restoreSh, restorePs]) {
    assert.match(source, /intentionally preserved/u);
    assert.doesNotMatch(source, /runtime-config\.json[^\n\r]*(?:cp|Copy-Item)/u);
    assert.doesNotMatch(source, /okno-audit[^\n\r]*(?:cp|Copy-Item)/u);
  }
});
