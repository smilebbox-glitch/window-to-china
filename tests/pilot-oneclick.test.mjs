import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const t = (p) => fs.readFile(new URL(`../${p}`, import.meta.url), 'utf8');

test('pilot packages native one-click launchers', async () => {
  const pkg = JSON.parse(await t('package.json'));
  assert.match(pkg.version, /^\d+\.\d+\.\d+-pilot$/u);
  const [bat, sh, ps] = await Promise.all([t('START.bat'), t('start.sh'), t('scripts/one-click-start.ps1')]);
  assert.match(bat, /start-lan\.ps1/u);
  assert.match(sh, /one-click-start\.sh/u);
  assert.match(ps, /docker compose build/u);
  assert.match(ps, /docker compose up -d/u);
});

test('one-click launchers bootstrap secrets and support offline image', async () => {
  const [sh, ps] = await Promise.all([t('scripts/one-click-start.sh'), t('scripts/one-click-start.ps1')]);
  for (const src of [sh, ps]) {
    assert.match(src, /SCHEDULER_TOKEN/u);
    assert.match(src, /USER_DATA_HMAC_KEY/u);
    assert.match(src, /AUDIT_HMAC_KEY/u);
    assert.match(src, /okno-v-kitai-image\.tar/u);
    assert.match(src, /\.pilot-access\.txt/u);
  }
});

test('Git checkout prefers fresh source and cannot silently start a stale offline image', async () => {
  const [bat, sh, ps, sw] = await Promise.all([
    t('START.bat'),
    t('scripts/one-click-start.sh'),
    t('scripts/one-click-start.ps1'),
    t('public/sw.js'),
  ]);

  assert.doesNotMatch(bat, /Starting current local copy/u);
  assert.match(bat, /git pull --ff-only origin main/u);
  assert.match(bat, /if errorlevel 1/u);
  assert.match(bat, /START will not launch an older local copy/u);

  for (const src of [sh, ps]) {
    assert.match(src, /USE_OFFLINE_IMAGE/u);
    assert.match(src, /Git source checkout/u);
    assert.match(src, /--force-recreate/u);
    assert.match(src, /Source revision/u);
  }

  assert.match(sh, /\[\[ -d \.git \]\]/u);
  assert.match(ps, /Test-Path \(Join-Path \$Root '\.git'\)/u);
  assert.match(sw, /v179-3/u);
  assert.match(sw, /Application JavaScript and CSS are network-first/u);
});

test('Windows downloaded source package cannot silently use a stale calendar image', async () => {
  const [bat, verifier] = await Promise.all([
    t('START.bat'),
    t('scripts/verify-calendar-ui.ps1'),
  ]);

  assert.match(bat, /Source package mode detected/u);
  assert.match(bat, /okno-v-kitai-image\.tar\.disabled-by-start/u);
  assert.match(bat, /verify-calendar-ui\.ps1/u);
  assert.match(bat, /verify-calendar-ui\.ps1" -Runtime/u);
  assert.match(bat, /docker compose down/u);

  assert.match(verifier, /В календарь/u);
  assert.match(verifier, /hotel\\\.tripUrl|hotel\.tripUrl/u);
  assert.match(verifier, /trip\\\.com|trip\.com/u);
  assert.match(verifier, /STALE RUNTIME DETECTED/u);
});

test('LAN access is enabled by default and launchers expose a LAN URL', async () => {
  const [compose, env, sh, ps, winLan] = await Promise.all([
    t('compose.yaml'),
    t('.env.example'),
    t('scripts/one-click-start.sh'),
    t('scripts/one-click-start.ps1'),
    t('scripts/start-lan.ps1'),
  ]);

  assert.match(compose, /APP_BIND_ADDRESS:-0\.0\.0\.0/u);
  assert.match(env, /^APP_BIND_ADDRESS=0\.0\.0\.0$/mu);
  assert.match(env, /^ALLOW_PUBLIC_BIND=YES$/mu);

  for (const src of [sh, ps]) {
    assert.match(src, /127\.0\.0\.1/u);
    assert.match(src, /LAN URL/u);
    assert.match(src, /0\.0\.0\.0/u);
  }

  assert.match(winLan, /Set-EnvValue 'APP_BIND_ADDRESS' '0\.0\.0\.0'/u);
  assert.match(winLan, /Set-EnvValue 'ALLOW_PUBLIC_BIND' 'YES'/u);
  assert.match(winLan, /New-NetFirewallRule/u);
  assert.match(winLan, /RemoteAddress LocalSubnet/u);
  assert.match(winLan, /Other PCs:/u);
});

test('Windows LAN launcher recovers safely from an occupied port', async () => {
  const winLan = await t('scripts/start-lan.ps1');
  assert.match(winLan, /Test-TcpPortAvailable/u);
  assert.match(winLan, /label=com\.mgc\.service=okno-v-kitai/u);
  assert.match(winLan, /docker rm -f/u);
  assert.match(winLan, /3001\.\.3099/u);
  assert.match(winLan, /Using free port/u);
  assert.match(winLan, /LAN self-test from this PC: PASS/u);
  assert.match(winLan, /Get-PortOwnerText/u);
});
