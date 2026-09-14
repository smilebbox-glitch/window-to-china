/**
 * Behavioural security contracts, verified against a running pilot.
 *
 * The rest of the suite mostly asserts that source files *contain* certain text.
 * That catches nothing when the text stays and the behaviour changes — and it
 * produced at least one false PASS in the past (the security preflight reported
 * "compose localhost bind default" while the service published on 0.0.0.0,
 * because the string it grepped for appears in the healthcheck).
 *
 * Everything here goes through HTTP against the real server instead.
 *
 *   BASE_URL=http://127.0.0.1:3000 node --test tests/security-runtime.mjs
 *
 * ADMIN_API_TOKEN, when exported, additionally exercises the authenticated side
 * of each contract. Without it those assertions are skipped, not silently passed.
 */
import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15_000);
const adminToken = process.env.ADMIN_API_TOKEN?.trim() || "";

function call(pathname, init = {}) {
  const { headers = {}, ...rest } = init;
  return fetch(new URL(pathname, baseUrl), {
    ...rest,
    headers: { accept: "application/json", ...headers },
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

const asAdmin = (init = {}) => ({
  ...init,
  headers: { ...(init.headers ?? {}), "x-admin-token": adminToken },
});

test("anonymous /api/admin/status exposes no operational internals", async () => {
  const response = await call("/api/admin/status");
  assert.equal(response.status, 200, "the console shell must still load without a token");
  const payload = await response.json();

  assert.equal(payload.restricted, true);
  assert.equal(payload.principal.authenticated, false);
  assert.ok(payload.runtime?.sources, "source toggles stay visible so the console can render");

  for (const field of ["process", "integrations", "operations", "reliability", "external"]) {
    assert.equal(payload[field], undefined, `${field} must not be exposed to an anonymous caller`);
  }
  assert.equal(payload.auth.adminTokenConfigured, undefined, "must not tell a stranger which secrets are unset");
  assert.equal(payload.auth.proxySecretConfigured, undefined);

  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /"\/data\//u, "filesystem paths must not leak");
  assert.doesNotMatch(serialized, /"pid"/u, "process metadata must not leak");
});

test("anonymous /api/admin/governance withholds configuration findings", async () => {
  const response = await call("/api/admin/governance");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.restricted, true);
  assert.equal(payload.validation, undefined, "validation names the secrets that are still weak");
  assert.equal(payload.locks, undefined);
});

test("anonymous /api/admin/reliability hides the database path and scheduler secret state", async () => {
  const response = await call("/api/admin/reliability");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.restricted, true);
  assert.equal(payload.database.path, "");
  assert.equal(payload.scheduler.configured, undefined);
});

test("write endpoints reject an anonymous caller", async () => {
  const config = await call("/api/admin/config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sources: { "fx.cbr": false } }),
  });
  assert.equal(config.status, 401);

  const backup = await call("/api/admin/backup");
  assert.equal(backup.status, 401);

  const audit = await call("/api/admin/audit?limit=5");
  assert.equal(audit.status, 401);
});

test("scheduler endpoint rejects a missing and a published-placeholder token", async () => {
  const noToken = await call("/api/internal/refresh", { method: "POST" });
  assert.equal(noToken.status, 403);

  const placeholder = await call("/api/internal/refresh", {
    method: "POST",
    headers: { "x-scheduler-token": "change-me-before-pilot" },
  });
  assert.equal(placeholder.status, 403, "the placeholder shipped in .env.example must never be a working token");
});

test("/api/metrics is not readable without the configured token", async () => {
  const response = await call("/api/metrics", { headers: { accept: "text/plain" } });
  assert.equal(
    response.status,
    404,
    "METRICS_TOKEN must be set in any deployment this suite runs against; one-click launchers generate it",
  );
});

test("a spoofable X-Forwarded-For is never accepted as a client identity", async () => {
  // The header used to key the limiter directly, so every rotated value started
  // a fresh window and the limit capped nothing. Unless TRUSTED_PROXY says a
  // proxy rewrites the header, such a request must be accounted against the
  // ceiling shared by all untrusted traffic — which rotation cannot escape.
  for (const address of ["203.0.113.7", "198.51.100.4", "192.0.2.9"]) {
    const response = await call("/api/session", { headers: { "x-forwarded-for": address } });
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("x-ratelimit-scope"),
      "untrusted-shared",
      `a forwarded address must not become an identity (sent ${address})`,
    );
  }
});

test("the shared ceiling actually rejects a rotating flood", { skip: process.env.RATE_LIMIT_EXHAUSTION === "1" ? false : "set RATE_LIMIT_EXHAUSTION=1 to run the slow exhaustion check" }, async () => {
  // Deliberately opt-in: proving exhaustion means issuing more requests than the
  // shared ceiling allows, which is too slow for every CI run.
  let blocked = false;
  for (let index = 0; index < 5000 && !blocked; index += 1) {
    const response = await call("/api/session", {
      headers: { "x-forwarded-for": `203.0.113.${index % 254 + 1}` },
    });
    if (response.status === 429) blocked = true;
  }
  assert.ok(blocked, "rotating the forwarded header must eventually hit the shared ceiling");
});

test("responses carry the security headers declared in next.config.ts", async () => {
  const response = await fetch(new URL("/", baseUrl), {
    headers: { accept: "text/html" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  assert.equal(response.status, 200);
  const expected = {
    "content-security-policy": /default-src 'self'/u,
    "x-content-type-options": /^nosniff$/u,
    "x-frame-options": /^SAMEORIGIN$/u,
    "referrer-policy": /strict-origin-when-cross-origin/u,
    "strict-transport-security": /max-age=31536000/u,
    "cross-origin-opener-policy": /same-origin/u,
    "permissions-policy": /geolocation=\(\)/u,
  };
  for (const [header, pattern] of Object.entries(expected)) {
    assert.match(response.headers.get(header) ?? "", pattern, `missing or wrong ${header}`);
  }
});

test("API responses are never cached", async () => {
  const response = await call("/api/session");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/u);
});

test("readiness reports configuration validity and leaks no filesystem path", async () => {
  const response = await call("/api/ready");
  const payload = await response.json();
  assert.equal(typeof payload.checks.configurationValid, "boolean");
  assert.ok(Array.isArray(payload.configuration.failures));
  assert.equal(payload.database.path, undefined, "the public probe must not publish the SQLite path");
  assert.equal(
    response.status,
    payload.status === "ready" ? 200 : 503,
    "readiness status code must follow the readiness verdict",
  );
  assert.equal(payload.status, "ready", "a deployment under test must not be running with blocking config findings");
});

test("authenticated admin sees the full operational payload", { skip: adminToken ? false : "ADMIN_API_TOKEN not set" }, async () => {
  const response = await call("/api/admin/status", asAdmin());
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.restricted, false);
  assert.equal(payload.principal.authenticated, true);
  assert.equal(payload.principal.role, "admin");
  assert.ok(payload.process?.pid, "an authenticated operator still gets process metadata");
  assert.ok(payload.integrations?.outbound?.hosts?.length, "and the outbound allow-list");
  assert.ok(payload.operations?.governance?.validation, "and configuration validation");
});

test("authenticated admin can read the audit trail", { skip: adminToken ? false : "ADMIN_API_TOKEN not set" }, async () => {
  const response = await call("/api/admin/audit?limit=5", asAdmin());
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.records));
  assert.equal(typeof payload.verified, "boolean");
});
