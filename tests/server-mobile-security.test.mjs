import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

const nextConfig = read('next.config.ts');
const sw = read('public/sw.js');
const nginx = read('deploy/nginx/corporate.conf.template');
const compose = read('compose.corporate.yaml');
const corporateEnv = read('.env.corporate.example');
const dockerignore = read('.dockerignore');

test('browser and PWA responses carry hardened security controls', () => {
  assert.match(nextConfig, /Content-Security-Policy/u);
  assert.match(nextConfig, /X-Permitted-Cross-Domain-Policies/u);
  assert.match(nextConfig, /Origin-Agent-Cluster/u);
  assert.match(nextConfig, /Cross-Origin-Opener-Policy/u);
  assert.match(nextConfig, /Permissions-Policy/u);
  assert.match(nextConfig, /worker-src 'self' blob:/u);
  assert.match(nextConfig, /manifest-src 'self'/u);
  assert.match(nextConfig, /source: "\/api\/\(\.\*\)"/u);
  assert.match(nextConfig, /no-store, max-age=0/u);
});

test('service worker never caches API or cross-origin application data', () => {
  assert.match(sw, /url\.origin !== self\.location\.origin/u);
  assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/u);
  assert.match(sw, /request\.mode === "navigate"/u);
  assert.match(sw, /caches\.match\("\/offline\.html"\)/u);

  const precacheStart = sw.indexOf('const PRECACHE = [');
  const precacheEnd = sw.indexOf('];', precacheStart);
  assert.notEqual(precacheStart, -1);
  assert.notEqual(precacheEnd, -1);
  const precacheBlock = sw.slice(precacheStart, precacheEnd + 2);
  assert.doesNotMatch(precacheBlock, /\/api\//u);
});

test('corporate ingress requires modern TLS, SSO and layered abuse controls', () => {
  assert.match(nginx, /ssl_protocols TLSv1\.2 TLSv1\.3/u);
  assert.match(nginx, /ssl_session_tickets off/u);
  assert.match(nginx, /server_tokens off/u);
  assert.match(nginx, /limit_req_zone/u);
  assert.match(nginx, /limit_conn_zone/u);
  assert.match(nginx, /limit_req_status 429/u);
  assert.match(nginx, /auth_request \/_oauth2_auth/u);
  assert.match(nginx, /X-Okno-Proxy-Secret/u);
  assert.match(nginx, /proxy_hide_header X-Powered-By/u);
  assert.match(nginx, /location ~ \/\\\./u);
  assert.match(nginx, /Permissions-Policy/u);
  assert.match(nginx, /X-Permitted-Cross-Domain-Policies/u);
});

test('corporate application remains isolated and SSO is limited to the approved IdP group', () => {
  const appBlock = compose.split(/\n  china-auto-radar-scheduler:/u)[0];
  assert.doesNotMatch(appBlock, /\n    ports:/u);
  assert.match(appBlock, /AUTH_MODE: proxy/u);
  assert.match(appBlock, /AUTH_PROXY_SECRET/u);
  assert.match(appBlock, /read_only: true/u);
  assert.match(appBlock, /no-new-privileges:true/u);
  assert.match(appBlock, /cap_drop:\s*\n\s*- ALL/u);
  assert.match(compose, /--cookie-secure=true/u);
  assert.match(compose, /--cookie-samesite=lax/u);
  assert.match(compose, /OIDC_ISSUER_URL/u);
  assert.match(compose, /--scope=\$\{OIDC_SCOPE:-openid profile email groups\}/u);
  assert.match(compose, /--allowed-group=\$\{SSO_ALLOWED_GROUP:\?SSO_ALLOWED_GROUP is required\}/u);
  assert.match(corporateEnv, /OIDC_SCOPE=openid profile email groups/u);
  assert.match(corporateEnv, /SSO_ALLOWED_GROUP=okno-china-users/u);
  assert.match(compose, /OAUTH2_PROXY_COOKIE_SECRET/u);
  assert.match(compose, /AUDIT_HMAC_KEY/u);
  assert.match(compose, /USER_DATA_HMAC_KEY/u);
});

test('hardened nginx can read a locked host TLS key without broad container privilege', () => {
  const nginxStart = compose.indexOf('\n  nginx:');
  const nginxEnd = compose.indexOf('\nnetworks:', nginxStart);
  assert.notEqual(nginxStart, -1);
  assert.notEqual(nginxEnd, -1);
  const nginxBlock = compose.slice(nginxStart, nginxEnd);
  assert.match(nginxBlock, /read_only: true/u);
  assert.match(nginxBlock, /no-new-privileges:true/u);
  assert.match(nginxBlock, /cap_drop:\s*\n\s*- ALL/u);
  assert.match(nginxBlock, /cap_add:\s*\n\s*- CHOWN\s*\n\s*- DAC_READ_SEARCH\s*\n\s*- SETGID\s*\n\s*- SETUID/u);
  assert.doesNotMatch(nginxBlock, /privileged:\s*true/u);
  assert.doesNotMatch(nginxBlock, /- SYS_ADMIN/u);
  assert.doesNotMatch(nginxBlock, /- NET_ADMIN/u);
});

test('CI runtime TLS and secret material can never enter the Docker build context', () => {
  assert.match(dockerignore, /^\.ci-runtime$/mu);
});
