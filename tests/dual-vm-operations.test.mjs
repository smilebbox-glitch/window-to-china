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
const diagnosticsSh = read('scripts/diagnostics-both-vm.sh');
const diagnosticsPs = read('scripts/diagnostics-both-vm.ps1');
const updateSh = read('scripts/update-both-vm.sh');
const updatePs = read('scripts/update-both-vm.ps1');
const reportSh = read('scripts/ops-report-both-vm.sh');
const reportPs = read('scripts/ops-report-both-vm.ps1');
const controlSh = read('scripts/vm-control.sh');
const statusBat = read('STATUS_BOTH_VM.bat');
const stopBat = read('STOP_BOTH_VM.bat');
const backupBat = read('BACKUP_BOTH_VM.bat');
const restoreBat = read('RESTORE_BOTH_VM.bat');
const diagnosticsBat = read('DIAGNOSTICS_BOTH_VM.bat');
const updateBat = read('UPDATE_BOTH_VM.bat');
const reportBat = read('OPS_REPORT_BOTH_VM.bat');
const controlBat = read('MGC_VM_CONTROL.bat');

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

test('dual VM status validates Okno temporary ingress and scheduler isolation', () => {
  for (const source of [statusSh, statusPs]) {
    assert.match(source, /china-auto-radar-scheduler/u);
    assert.match(source, /ReadonlyRootfs/u);
    assert.match(source, /SecurityOpt/u);
    assert.match(source, /CapDrop/u);
    assert.match(source, /CapAdd/u);
    assert.match(source, /no-new-privileges/u);
    assert.match(source, /3000\/tcp/u);
    assert.match(source, /scheduler is internal/u);
    assert.match(source, /Okno v Kitai ingress isolation/u);
  }
});

test('dual VM status validates MGC LAN ingress isolation and hardened nginx runtime', () => {
  for (const source of [statusSh, statusPs]) {
    assert.match(source, /ReadonlyRootfs/u);
    assert.match(source, /SecurityOpt/u);
    assert.match(source, /CapDrop/u);
    assert.match(source, /CapAdd/u);
    assert.match(source, /no-new-privileges/u);
    assert.match(source, /CHOWN/u);
    assert.match(source, /SETGID/u);
    assert.match(source, /SETUID/u);
    assert.match(source, /SYS_ADMIN/u);
    assert.match(source, /NET_ADMIN/u);
    assert.match(source, /SYS_PTRACE/u);
    assert.match(source, /DAC_OVERRIDE/u);
    assert.match(source, /docker port/u);
    assert.match(source, /ingress isolation/u);
  }
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

test('dual diagnostics collect operational state without copying secrets by default', () => {
  for (const source of [diagnosticsSh, diagnosticsPs]) {
    assert.match(source, /MGC_VM_DIAGNOSTICS_ROOT/u);
    assert.match(source, /MGC_VM_DIAGNOSTICS_INCLUDE_LOGS/u);
    assert.match(source, /docker-stats\.txt/u);
    assert.match(source, /api\/ready/u);
    assert.match(source, /health\/ready/u);
    assert.match(source, /checksums\.sha256/u);
    assert.doesNotMatch(source, /Config\.Env/u);
    assert.doesNotMatch(source, /(?:cp|Copy-Item)[^\n\r]*\.env\.vm/u);
  }
  assert.match(diagnosticsBat, /diagnostics-both-vm\.ps1/u);
  assert.match(diagnosticsBat, /No \.env\.vm secrets/u);
});

test('dual update is backup-first, fast-forward-only and never force-resets local work', () => {
  for (const source of [updateSh, updatePs]) {
    assert.match(source, /backup-both-vm/u);
    assert.match(source, /fetch origin main/u);
    assert.match(source, /merge-base --is-ancestor/u);
    assert.match(source, /pull --ff-only origin main/u);
    assert.match(source, /status-both-vm/u);
    assert.match(source, /core\.fileMode=false/u);
    assert.match(source, /No automatic data rollback was attempted/u);
    assert.doesNotMatch(source, /reset --hard/u);
    assert.doesNotMatch(source, /clean -f/u);
  }
  assert.match(updateBat, /update-both-vm\.ps1/u);
  assert.match(updateBat, /never force-reset/u);
});

test('IT operations report is read-only, capacity-aware and backup-freshness-aware', () => {
  for (const source of [reportSh, reportPs]) {
    assert.match(source, /MGC_VM_REPORT_ROOT/u);
    assert.match(source, /MGC_VM_DISK_WARN_GB/u);
    assert.match(source, /MGC_VM_DISK_NO_GO_GB/u);
    assert.match(source, /MGC_VM_BACKUP_MAX_AGE_HOURS/u);
    assert.match(source, /readiness-both-vm/u);
    assert.match(source, /status-both-vm/u);
    assert.match(source, /checksums\.sha256/u);
    assert.match(source, /operations\.json/u);
    assert.match(source, /backup_checksum_valid/u);
    assert.match(source, /disk_free_gb/u);
    assert.match(source, /MGC_VM_REPORT_CI_SKIP_ACCEPTANCE/u);
    assert.match(source, /GITHUB_ACTIONS/u);
    assert.doesNotMatch(source, /Config\.Env/u);
    assert.doesNotMatch(source, /(?:cp|Copy-Item)[^\n\r]*\.env\.vm/u);
    assert.doesNotMatch(source, /docker\s+compose[^\n\r]*(?:up|down)/u);
  }
  assert.match(reportBat, /ops-report-both-vm\.ps1/u);
  assert.match(reportBat, /Read-only check/u);
});

test('single operations consoles expose lifecycle, acceptance/readiness and IT report actions', () => {
  for (const operation of ['START', 'STATUS', 'BACKUP', 'DIAGNOSTICS', 'UPDATE', 'RESTORE', 'STOP', 'ACCEPTANCE', 'READINESS', 'OPS REPORT']) {
    assert.match(controlBat, new RegExp(operation, 'u'));
    assert.match(controlSh, new RegExp(operation, 'u'));
  }
  for (const script of [
    'start-both-vm',
    'status-both-vm',
    'backup-both-vm',
    'diagnostics-both-vm',
    'update-both-vm',
    'restore-both-vm',
    'stop-both-vm',
    'readiness-both-vm',
    'ops-report-both-vm',
  ]) {
    assert.match(controlSh, new RegExp(`${script}\\.sh`, 'u'));
  }
  assert.match(controlBat, /START_BOTH_VM\.bat/u);
  assert.match(controlBat, /UPDATE_BOTH_VM\.bat/u);
  assert.match(controlBat, /RESTORE_BOTH_VM\.bat/u);
  assert.match(controlBat, /READINESS_BOTH_VM\.bat/u);
  assert.match(controlBat, /OPS_REPORT_BOTH_VM\.bat/u);
});
