import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const operations = read("lib/pilot-operations.ts");
const page = read("app/executive/page.tsx");
const panel = read("components/executive-operations-panel.tsx");
const route = read("app/api/pilot/operations/route.ts");
const reliability = read("app/api/admin/reliability/route.ts");
const env = read(".env.example");
const compose = read("compose.yaml");
const runtime = read("tests/runtime-smoke.mjs");

for (const token of ["GO", "DEGRADED", "STALE", "NO_GO", "pilotOperationsStatus", "executiveMinimumRole", "latestNewsAggregate"]) {
  check(operations.includes(token), `operations contract missing ${token}`);
}
check(operations.includes('governancePolicy().sla["news.aggregate"]'), "Executive freshness is not bound to governed news SLA");
check(page.includes("hasRole(principal, minimum)"), "Executive page is not protected by minimum role");
check(page.includes("ExecutiveOperationsPanel"), "Executive page does not show operational trust panel");
check(panel.includes("Go/No-Go"), "operational panel missing go/no-go decision");
check(panel.includes("SLA freshness"), "operational panel missing freshness SLA");
check(route.includes("pilotOperationsStatus()"), "pilot operations API is not wired");
check(reliability.includes("pilotOperations: pilotOperationsStatus()"), "admin reliability does not expose pilot gate");
check(env.includes("EXECUTIVE_MIN_ROLE=viewer"), "Executive RBAC env setting is undocumented");
check(compose.includes("EXECUTIVE_MIN_ROLE:"), "Executive RBAC env is not passed to container");
check(runtime.includes("/api/pilot/operations"), "runtime smoke does not verify pilot operations endpoint");

if (failures.length) {
  console.error("NO-GO: v1.7.4 Pilot Operations preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("GO: v1.7.4 Pilot Operations contracts; executiveRBAC=on; freshnessSLA=on; operationalStatus=GO|DEGRADED|STALE; goNoGo=on");
