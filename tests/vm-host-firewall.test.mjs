import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const startSh = read('scripts/start-both-vm.sh');
const startPs = read('scripts/start-both-vm.ps1');
const preflightSh = read('scripts/host-firewall-preflight.sh');
const applySh = read('scripts/apply-vm-firewall.sh');
const configureSh = read('scripts/configure-vm-firewall.sh');
const preflightPs = read('scripts/host-firewall-preflight.ps1');
const configurePs = read('scripts/configure-vm-firewall.ps1');
const configureBat = read('CONFIGURE_VM_FIREWALL.bat');
const checkBat = read('CHECK_VM_FIREWALL.bat');
const controlBat = read('MGC_VM_CONTROL.bat');
const controlSh = read('scripts/vm-control.sh');
const example = read('.env.vm-host.example');

test('shared launchers fail closed through host firewall preflight before service start', () => {
  for (const source of [startSh, startPs]) {
    assert.match(source, /host-firewall-preflight/u);
    assert.match(source, /MGC_VM_FIREWALL_CONTRACT_ONLY/u);
    assert.match(source, /GITHUB_ACTIONS/u);
    assert.match(source, /GITHUB_RUN_ID/u);
  }
  assert.ok(startSh.indexOf('Host firewall preflight') < startSh.indexOf('Starting Okno v Kitai'));
  assert.ok(startPs.indexOf('Host firewall preflight') < startPs.indexOf('Starting Okno v Kitai'));
});

test('host allowlist contract requires one explicit private corporate CIDR', () => {
  assert.match(example, /MGC_VM_ALLOWED_CIDR=CHANGE_ME_CORPORATE_CIDR/u);
  for (const source of [preflightSh, preflightPs]) {
    assert.match(source, /MGC_VM_ALLOWED_CIDR/u);
    assert.match(source, /RFC1918/u);
    assert.match(source, /CGNAT/u);
    assert.match(source, /3000/u);
    assert.match(source, /8080/u);
  }
});

test('Linux Docker ingress is filtered in DOCKER-USER before Docker publish rules', () => {
  for (const source of [preflightSh, applySh]) {
    assert.match(source, /DOCKER-USER/u);
    assert.match(source, /MGC-VM-FILTER/u);
    assert.match(source, /3000,8080/u);
  }
  assert.match(applySh, /-I DOCKER-USER 1 -j MGC-VM-FILTER/u);
  assert.match(applySh, /-s "\$ALLOWED_CIDR"[^\n]*-j RETURN/u);
  assert.match(applySh, /--dports 3000,8080 -j DROP/u);
  assert.match(preflightSh, /first DOCKER-USER rule/u);
  assert.match(configureSh, /mgc-vm-firewall\.service/u);
  assert.match(configureSh, /systemctl enable/u);
});

test('Windows firewall rules are exact-port, exact-CIDR and non-public-profile', () => {
  for (const source of [preflightPs, configurePs]) {
    assert.match(source, /Get-NetFirewall/u);
    assert.match(source, /3000/u);
    assert.match(source, /8080/u);
    assert.match(source, /RemoteAddress/u);
  }
  assert.match(configurePs, /-Profile Domain,Private/u);
  assert.match(configurePs, /-RemoteAddress \$AllowedCidr/u);
  assert.match(preflightPs, /Public\|Any/u);
  assert.match(preflightPs, /Broad inbound allow rule/u);
  assert.match(configureBat, /Run as administrator/u);
  assert.match(checkBat, /host-firewall-preflight\.ps1/u);
});

test('operator consoles expose firewall setup and firewall check before START', () => {
  for (const source of [controlBat, controlSh]) {
    assert.match(source, /FIREWALL SETUP/u);
    assert.match(source, /FIREWALL CHECK/u);
    assert.ok(source.indexOf('FIREWALL SETUP') < source.indexOf('START'));
  }
  assert.match(controlBat, /CONFIGURE_VM_FIREWALL\.bat/u);
  assert.match(controlBat, /CHECK_VM_FIREWALL\.bat/u);
  assert.match(controlSh, /configure-vm-firewall\.sh/u);
  assert.match(controlSh, /host-firewall-preflight\.sh/u);
});

test('firewall scripts never encode a public-any ingress rule', () => {
  for (const source of [applySh, configureSh, preflightSh, configurePs]) {
    assert.doesNotMatch(source, /(?:allow|accept)[^\n\r]*(?:0\.0\.0\.0\/0|Anywhere)/iu);
  }
});

test('Linux contract-only validation accepts private canonical CIDR and rejects unsafe CIDRs', { skip: process.platform === 'win32' }, () => {
  const baseEnv = {
    ...process.env,
    GITHUB_ACTIONS: 'true',
    MGC_VM_FIREWALL_CONTRACT_ONLY: '1',
  };
  const run = (cidr) => spawnSync('bash', ['scripts/host-firewall-preflight.sh', '--contract-only'], {
    cwd: process.cwd(),
    env: { ...baseEnv, MGC_VM_ALLOWED_CIDR: cidr },
    encoding: 'utf8',
  });

  assert.equal(run('10.77.0.0/16').status, 0);
  assert.notEqual(run('8.8.8.0/24').status, 0);
  assert.notEqual(run('10.77.1.1/24').status, 0);
  assert.notEqual(run('0.0.0.0/0').status, 0);
});
