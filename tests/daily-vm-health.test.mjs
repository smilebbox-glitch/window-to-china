import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const dailySh = read('scripts/daily-vm-health.sh');
const dailyPs = read('scripts/daily-vm-health.ps1');
const manageSh = read('scripts/manage-daily-vm-health.sh');
const managePs = read('scripts/manage-daily-vm-health.ps1');
const controlSh = read('scripts/vm-control.sh');
const controlBat = read('MGC_VM_CONTROL.bat');
const dailyBat = read('DAILY_VM_HEALTH.bat');

test('daily health runner is backup-aware, report-driven and duplicate-safe', () => {
  for (const source of [dailySh, dailyPs]) {
    assert.match(source, /MGC_VM_DAILY_BACKUP_AFTER_HOURS/u);
    assert.match(source, /vm-daily-logs/u);
    assert.match(source, /daily-health\.lock/u);
    assert.match(source, /backup-both-vm/u);
    assert.match(source, /ops-report-both-vm/u);
    assert.match(source, /latest\.log/u);
    assert.match(source, /DAILY VM HEALTH/u);
    assert.match(source, /NO-GO/u);
  }
});

test('daily health validates the full backup checksum bundle before trusting freshness', () => {
  assert.match(dailySh, /sha256sum -c checksums\.sha256/u);
  assert.match(dailySh, /failed SHA-256 verification/u);
  assert.match(dailyPs, /Test-ChecksumBundle/u);
  assert.match(dailyPs, /Get-FileHash/u);
  assert.match(dailyPs, /failed SHA-256 verification/u);
  for (const source of [dailySh, dailyPs]) {
    assert.match(source, /fresh verified backup will be created/u);
  }
});

test('daily operational evidence has bounded retention on Linux and Windows', () => {
  for (const source of [dailySh, dailyPs]) {
    assert.match(source, /MGC_VM_DAILY_LOG_RETENTION_DAYS/u);
    assert.match(source, /MGC_VM_REPORT_RETENTION_DAYS/u);
    assert.match(source, /Log retention/u);
    assert.match(source, /Report retention/u);
  }
  assert.match(dailySh, /-mtime/u);
  assert.match(dailySh, /-delete/u);
  assert.match(dailyPs, /AddDays/u);
  assert.match(dailyPs, /Remove-Item/u);
});

test('Linux daily scheduler is persistent, user-scoped for Docker access and reversible', () => {
  assert.match(manageSh, /systemd/u);
  assert.match(manageSh, /OnCalendar/u);
  assert.match(manageSh, /Persistent=true/u);
  assert.match(manageSh, /RandomizedDelaySec/u);
  assert.match(manageSh, /docker info/u);
  assert.match(manageSh, /User=\$TARGET_USER/u);
  assert.match(manageSh, /enable --now/u);
  assert.match(manageSh, /disable --now/u);
  assert.match(manageSh, /MGC_VM_DAILY_TIME/u);
});

test('Windows daily scheduler uses Task Scheduler without storing credentials', () => {
  assert.match(managePs, /Register-ScheduledTask/u);
  assert.match(managePs, /New-ScheduledTaskTrigger -Daily/u);
  assert.match(managePs, /StartWhenAvailable/u);
  assert.match(managePs, /MultipleInstances IgnoreNew/u);
  assert.match(managePs, /LogonType Interactive/u);
  assert.match(managePs, /Unregister-ScheduledTask/u);
  assert.match(managePs, /MGC_VM_DAILY_TIME/u);
  assert.doesNotMatch(managePs, /Password/u);
});

test('both operator consoles expose daily operations control', () => {
  assert.match(controlSh, /DAILY OPS/u);
  assert.match(controlSh, /manage-daily-vm-health\.sh/u);
  assert.match(controlBat, /DAILY OPS/u);
  assert.match(controlBat, /DAILY_VM_HEALTH\.bat/u);
  assert.match(dailyBat, /manage-daily-vm-health\.ps1/u);
});
