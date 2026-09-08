import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const required = [
  ".env.corporate.example",
  "compose.corporate.yaml",
  "deploy/nginx/corporate.conf.template",
  "deploy/tls/README.md",
  "scripts/start-corporate.ps1",
  "START_CORPORATE_HTTPS.bat",
  "STATUS_CORPORATE.bat",
  "STOP_CORPORATE.bat",
  "docs/CORPORATE_HTTPS_SSO_v1.7.9.md",
];

for (const file of required) {
  assert.ok(fs.existsSync(path.join(root, file)), `missing ${file}`);
}

const compose = read("compose.corporate.yaml");
assert.match(compose, /quay\.io\/oauth2-proxy\/oauth2-proxy:v7\.15\.4/);
assert.match(compose, /AUTH_MODE:\s*proxy/);
assert.match(compose, /--provider=oidc/);
assert.match(compose, /--set-xauthrequest=true/);
assert.match(compose, /--trusted-proxy-ip=172\.31\.179\.10\/32/);
assert.match(compose, /--oidc-groups-claim=/);
assert.match(compose, /corporate\.conf\.template/);
assert.match(compose, /TLS_CERT_FILE/);
assert.match(compose, /TLS_KEY_FILE/);

const appBlock = compose.slice(
  compose.indexOf("  china-auto-radar:"),
  compose.indexOf("  china-auto-radar-scheduler:"),
);
assert.ok(appBlock.length > 0, "app service block not found");
assert.doesNotMatch(appBlock, /^\s{4}ports:/m, "corporate app must not publish a direct host port");

const nginx = read("deploy/nginx/corporate.conf.template");
assert.match(nginx, /auth_request \/_oauth2_auth/);
assert.match(nginx, /auth_request_set \$sso_user\s+\$upstream_http_x_auth_request_user/);
assert.match(nginx, /X-Forwarded-User \$sso_user/);
assert.match(nginx, /X-Forwarded-Groups \$sso_groups/);
assert.match(nginx, /X-Okno-Proxy-Secret "\$\{AUTH_PROXY_SECRET\}"/);
assert.doesNotMatch(nginx, /\$http_x_forwarded_(?:user|email|groups)/i);
assert.match(nginx, /location = \/api\/metrics\s*\{\s*return 404;/s);
assert.match(nginx, /ssl_protocols TLSv1\.2 TLSv1\.3/);

const env = read(".env.corporate.example");
assert.match(env, /^CORPORATE_HOST=/m);
for (const key of ["OIDC_ISSUER_URL", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET"]) {
  assert.match(env, new RegExp(`^${key}=CHANGE_ME_IT$`, "m"));
}
for (const key of [
  "OAUTH2_PROXY_COOKIE_SECRET",
  "AUTH_PROXY_SECRET",
  "AUDIT_HMAC_KEY",
  "SCHEDULER_TOKEN",
  "USER_DATA_HMAC_KEY",
  "METRICS_TOKEN",
]) {
  assert.match(env, new RegExp(`^${key}=GENERATE_ON_FIRST_START$`, "m"));
}

const ps1 = read("scripts/start-corporate.ps1");
assert.ok([...ps1].every((char) => char.charCodeAt(0) < 128), "PowerShell launcher must stay ASCII-safe for Windows PowerShell 5.1");
assert.match(ps1, /RandomNumberGenerator/);
assert.match(ps1, /PreflightOnly/);
assert.match(ps1, /OIDC_CLIENT_SECRET/);
assert.match(ps1, /TLS certificate/);
assert.match(ps1, /docker compose/);
assert.match(ps1, /api\/ready/);

const startBat = read("START_CORPORATE_HTTPS.bat");
assert.match(startBat, /git pull --ff-only origin main/);
assert.match(startBat, /start-corporate\.ps1/);

const gitignore = read(".gitignore");
assert.match(gitignore, /deploy\/tls\/\*\.crt/);
assert.match(gitignore, /deploy\/tls\/\*\.key/);

const auth = read("lib/auth.ts");
assert.match(auth, /x-okno-proxy-secret/);
assert.match(auth, /x-forwarded-user/);
assert.match(auth, /x-forwarded-groups/);
assert.match(auth, /timingSafeEqual/);

console.log("PASS: corporate HTTPS + trusted OIDC reverse-proxy contract is structurally safe");
