import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const operations = fs.readFileSync("lib/pilot-operations.ts", "utf8");
const executivePage = fs.readFileSync("app/executive/page.tsx", "utf8");
const reliabilityConsole = fs.readFileSync("components/reliability-console.tsx", "utf8");
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

test("operational trust state is kept in IT reliability instead of the user Executive view", () => {
  assert.doesNotMatch(executivePage, /ExecutiveOperationsPanel/);
  assert.match(reliability, /pilotOperations: pilotOperationsStatus\(\)/);
  assert.match(reliabilityConsole, /IT \/ Pilot Operations/);
  assert.match(reliabilityConsole, /Go\/No-Go: \{operations\.decision\}/);
  assert.match(reliabilityConsole, /Pilot Operations · \{operations\.briefStatus\}/);
  assert.match(reliabilityConsole, /SLA freshness/);
  assert.match(reliabilityConsole, /Fresh sources/);
  assert.match(reliabilityConsole, /Stale \/ Error/);
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
