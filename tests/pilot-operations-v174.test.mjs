import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const operations = fs.readFileSync("lib/pilot-operations.ts", "utf8");
const executivePage = fs.readFileSync("app/executive/page.tsx", "utf8");
const panel = fs.readFileSync("components/executive-operations-panel.tsx", "utf8");
const route = fs.readFileSync("app/api/pilot/operations/route.ts", "utf8");
const reliability = fs.readFileSync("app/api/admin/reliability/route.ts", "utf8");
const compose = fs.readFileSync("compose.yaml", "utf8");
const env = fs.readFileSync(".env.example", "utf8");

test("v1.7.4 defines GO DEGRADED STALE and strict pilot decision", () => {
  assert.match(operations, /BriefOperationalStatus = "GO" \| "DEGRADED" \| "STALE"/);
  assert.match(operations, /PilotDecision = "GO" \| "NO_GO"/);
  assert.match(operations, /SOURCE_SLA_NEWS_SECONDS|governancePolicy\(\)\.sla\["news\.aggregate"\]/);
  assert.match(operations, /aggregate\.state === "expired" \|\| age > policy\.maxAgeSeconds/);
  assert.match(operations, /aggregate\.qualityScore < policy\.minQuality/);
});

test("Executive View is protected by configurable RBAC", () => {
  assert.match(executivePage, /resolvePrincipal/);
  assert.match(executivePage, /hasRole\(principal, minimum\)/);
  assert.match(executivePage, /executiveMinimumRole/);
  assert.match(operations, /EXECUTIVE_MIN_ROLE/);
  assert.match(env, /EXECUTIVE_MIN_ROLE=viewer/);
  assert.match(compose, /EXECUTIVE_MIN_ROLE: \$\{EXECUTIVE_MIN_ROLE:-viewer\}/);
});

test("Executive View displays operational trust state and SLA", () => {
  assert.match(executivePage, /ExecutiveOperationsPanel/);
  assert.match(panel, /Pilot Operations · \{status\.briefStatus\}/);
  assert.match(panel, /Go\/No-Go: \{status\.decision\}/);
  assert.match(panel, /SLA freshness/);
  assert.match(panel, /Fresh sources/);
  assert.match(panel, /Stale \/ Error/);
});

test("operational endpoint and admin reliability expose the same gate", () => {
  assert.match(route, /pilotOperationsStatus\(\)/);
  assert.match(route, /authorize\(request, "viewer"/);
  assert.match(reliability, /pilotOperations: pilotOperationsStatus\(\)/);
});

test("go-no-go blocks missing database migrations or stale aggregate", () => {
  assert.match(operations, /if \(!database\.available\)/);
  assert.match(operations, /if \(migrations\.pending > 0\)/);
  assert.match(operations, /Нет агрегированного news snapshot/);
  assert.match(operations, /decision = "NO_GO"/);
});
