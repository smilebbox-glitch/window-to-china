import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const program = fs.readFileSync("lib/pilot-program.ts", "utf8");
const access = fs.readFileSync("lib/pilot-access.ts", "utf8");
const feedbackApi = fs.readFileSync("app/api/pilot/feedback/route.ts", "utf8");
const reportApi = fs.readFileSync("app/api/pilot/report/route.ts", "utf8");
const issueApi = fs.readFileSync("app/api/admin/pilot/issues/route.ts", "utf8");
const feedbackUi = fs.readFileSync("components/pilot-feedback-form.tsx", "utf8");
const controlUi = fs.readFileSync("components/pilot-control-room.tsx", "utf8");
const pilotPage = fs.readFileSync("app/pilot/page.tsx", "utf8");

function productPathLiteral() {
  return program.match(/const pilotProductPaths = \[([^\]]+)\]/)?.[1] || "";
}

test("controlled pilot defaults to a 5-10 person cohort", () => {
  assert.ok(program.includes('intEnv("PILOT_TARGET_MIN_USERS", 5'));
  assert.ok(program.includes('intEnv("PILOT_TARGET_MAX_USERS", 10'));
  assert.ok(program.includes('intEnv("PILOT_WINDOW_DAYS", 10'));
});

test("pilot supports GO ADJUST STOP and S1-S4", () => {
  for (const token of ['"GO"', '"ADJUST"', '"STOP"', '"S1"', '"S2"', '"S3"', '"S4"']) assert.ok(program.includes(token), token);
  assert.ok(program.includes("openBySeverity.S1 > 0"));
  assert.ok(program.includes("openBySeverity.S2 >= 2"));
});

test("control-plane traffic does not inflate cohort", () => {
  const paths = productPathLiteral();
  assert.ok(paths.includes('"/decision"'));
  assert.ok(paths.includes('"/trucks"'));
  assert.ok(paths.includes('"/executive"'));
  assert.ok(!paths.includes('"/admin"'));
  assert.ok(!paths.includes('"/pilot"'));
  assert.ok(!paths.includes('"/pilot-feedback"'));
  assert.ok(program.includes("event_name='page_view'"));
});

test("pilot participant identity is pseudonymous and not a personnel register", () => {
  assert.match(program, /return `P-\$\{userKey\.slice\(0, 6\)\.toUpperCase\(\)\}`/);
  const tableBlock = program.match(/CREATE TABLE IF NOT EXISTS pilot_feedback \(([\s\S]*?)\);/)?.[1] || "";
  assert.ok(tableBlock.includes("user_key"));
  assert.ok(!/\bemail\b/i.test(tableBlock));
  assert.ok(!/\bname\b/i.test(tableBlock));
  assert.ok(feedbackUi.includes("Имя и почта") && feedbackUi.includes("не сохраняются"));
});

test("personal Watchlist is not part of controlled pilot outcome", () => {
  assert.ok(!program.includes("matchWatchlist"));
  assert.ok(!program.includes("user_preferences"));
  assert.ok(!reportApi.includes("preferences"));
});

test("feedback uses pseudonymous context and trusted identity in proxy mode", () => {
  assert.ok(feedbackApi.includes("resolveUserContext"));
  assert.ok(feedbackApi.includes("resolvePrincipal"));
  assert.ok(feedbackApi.includes('principal.mode !== "proxy"'));
  assert.ok(feedbackApi.includes("savePilotFeedback"));
});

test("pilot control and report share configurable RBAC", () => {
  assert.ok(access.includes("PILOT_CONTROL_MIN_ROLE"));
  assert.ok(pilotPage.includes("pilotControlMinimumRole"));
  assert.ok(reportApi.includes("pilotControlMinimumRole"));
  assert.ok(pilotPage.includes('hasRole(principal, "admin")'));
  assert.ok(issueApi.includes('authorize(request, "admin"'));
});

test("admin can move issues through open mitigated closed lifecycle", () => {
  assert.ok(program.includes('"open", "mitigated", "closed"'));
  assert.ok(controlUi.includes('setIssueStatus(issue, "open")'));
  assert.ok(controlUi.includes('setIssueStatus(issue, "mitigated")'));
  assert.ok(controlUi.includes('setIssueStatus(issue, "closed")'));
});

test("telemetry is explicitly product-pilot telemetry rather than employee scoring", () => {
  assert.ok(controlUi.includes("не рейтинг производительности сотрудников"));
  assert.ok(controlUi.includes("P-XXXXXX"));
});
