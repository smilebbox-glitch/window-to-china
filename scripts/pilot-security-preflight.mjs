import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const failures = [];
const checks = [];
function check(condition, label) {
  checks.push({ label, ok: Boolean(condition) });
  if (!condition) failures.push(label);
}

// Normalize line endings so the same security checks behave identically on
// Windows (CRLF), macOS, Linux, GitHub Actions, and GitHub Codespaces.
const compose = (await readFile("compose.yaml", "utf8")).replace(/\r\n?/gu, "\n");
check(compose.includes("read_only: true"), "compose read-only root filesystem");
check(compose.includes("no-new-privileges:true"), "compose no-new-privileges");
check(compose.includes("cap_drop:\n      - ALL"), "compose drops all capabilities");
// The published port binding is the only line that decides network exposure.
// A plain `compose.includes("127.0.0.1")` passes on any file that merely mentions
// loopback somewhere (INTERNAL_APP_URL, the healthcheck), so it reported PASS
// while the service actually defaulted to every interface. Parse the real value.
const publishedBind = compose.match(/^\s*-\s*"\$\{APP_BIND_ADDRESS:-([^}]+)\}:/mu)?.[1] ?? "";
check(Boolean(publishedBind), "compose publishes the app port through APP_BIND_ADDRESS");
check(
  publishedBind === "127.0.0.1" || publishedBind === "0.0.0.0",
  `compose bind default is a known value (found: ${publishedBind || "none"})`,
);
check(compose.includes("okno-runtime-data:/data"), "runtime config has dedicated volume");
check(compose.includes("/api/ready"), "healthcheck uses readiness endpoint");

const env = await readFile(".env.example", "utf8");
// A LAN-exposed default is a deliberate product choice here, but it must stay an
// explicit, documented opt-in rather than an accident of the compose file.
if (publishedBind === "0.0.0.0") {
  check(
    env.includes("ALLOW_PUBLIC_BIND") && /APP_BIND_ADDRESS=127\.0\.0\.1/u.test(env),
    "LAN-exposed bind default is documented in .env.example together with the localhost-only alternative",
  );
  console.log("NOTE  compose exposes the app on all interfaces by default (APP_BIND_ADDRESS=0.0.0.0); a host firewall or reverse proxy is mandatory.");
}
check(env.includes("AUTH_MODE=disabled"), "auth mode is explicit");
check(env.includes("TRUSTED_PROXY=0"), "forwarded-header trust is off by default");

// lib/app-version.ts duplicates the manifest version on purpose (importing
// package.json could pull the dependency list into a client chunk). Fail loudly
// if the two ever drift, so no endpoint can report a stale version again.
const manifestVersion = JSON.parse(await readFile("package.json", "utf8")).version;
const appVersionSource = await readFile("lib/app-version.ts", "utf8");
const declaredVersion = appVersionSource.match(/PACKAGE_VERSION\s*=\s*"([^"]+)"/u)?.[1] ?? "";
check(
  declaredVersion === manifestVersion,
  `lib/app-version.ts PACKAGE_VERSION must equal package.json version (${declaredVersion || "none"} vs ${manifestVersion})`,
);

// The weak published placeholders must never reach a running container as a
// compose default; they are only allowed to exist in .env.example as markers the
// one-click launchers replace with generated secrets.
check(
  !/SCHEDULER_TOKEN:\s*\$\{SCHEDULER_TOKEN:-/u.test(compose),
  "compose must not ship a default value for SCHEDULER_TOKEN",
);

// Anything that grants a role or reads the caller's identity has to keep going
// through lib/auth.ts, and operational payloads through revealsOperationalDetail.
const statusRoute = await readFile("app/api/admin/status/route.ts", "utf8");
check(statusRoute.includes("revealsOperationalDetail"), "admin status must gate operational detail behind an authenticated principal");
const readyRoute = await readFile("app/api/ready/route.ts", "utf8");
check(readyRoute.includes("validatePilotConfiguration"), "readiness must fail while configuration validation reports blocking findings");
check(env.includes("AUTH_PROXY_SECRET="), "trusted proxy secret configurable");
check(env.includes("METRICS_TOKEN="), "metrics protection configurable");
check(env.includes("OUTBOUND_ALLOWLIST="), "outbound allow-list configurable");

async function collect(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await collect(path));
    else if (/\.(ts|tsx)$/u.test(entry.name)) result.push(path);
  }
  return result;
}
const sourceFiles = [...await collect("app"), ...await collect("lib")];
const directFetch = [];
for (const file of sourceFiles) {
  const text = await readFile(file, "utf8");
  // `readdir` returns OS-native separators. Normalize before applying the
  // intentional loopback exception so Windows does not report a false gate
  // failure and reviewers do not miss real direct outbound fetches.
  const normalizedFile = file.replaceAll("\\", "/");
  const internalLoopbackException = normalizedFile === "app/api/internal/refresh/route.ts";
  if (normalizedFile !== "lib/outbound.ts" && !internalLoopbackException && /\bfetch\s*\(/u.test(text)) directFetch.push(file);
}
check(directFetch.length === 0, `all external server fetch calls centralized; only internal refresh loopback is excepted${directFetch.length ? `: ${directFetch.join(", ")}` : ""}`);

for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.label}`);
if (failures.length) {
  console.error(`\n${failures.length} security preflight check(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length}/${checks.length} security preflight checks passed.`);
