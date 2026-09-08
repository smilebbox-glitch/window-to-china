import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const db = fs.readFileSync("lib/pilot-db.ts", "utf8");
const program = fs.readFileSync("lib/pilot-program.ts", "utf8");
const userContext = fs.readFileSync("lib/user-context.ts", "utf8");
const shell = fs.readFileSync("components/site-shell.tsx", "utf8");
const control = fs.readFileSync("components/pilot-control.tsx", "utf8");
const feedback = fs.readFileSync("components/pilot-feedback.tsx", "utf8");
const cohortApi = fs.readFileSync("app/api/pilot/cohort/route.ts", "utf8");
const feedbackApi = fs.readFileSync("app/api/pilot/feedback/route.ts", "utf8");
const reportApi = fs.readFileSync("app/api/pilot/report/route.ts", "utf8");
const reviewsApi = fs.readFileSync("app/api/pilot/reviews/route.ts", "utf8");


test("migration 4 creates controlled cohort, feedback and immutable review evidence", () => {
  assert.match(db, /version: 4/);
  assert.match(db, /controlled_corporate_pilot/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS pilot_members/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS pilot_feedback/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS pilot_reviews/);
  assert.match(db, /CHECK\(severity IN \('note','minor','major','blocker'\)\)/);
  assert.match(db, /CHECK\(decision IN \('GO','ADJUST','STOP'\)\)/);
});

test("corporate SSO subject is pseudonymized before cohort persistence", () => {
  assert.match(userContext, /identityKeyForSubject/);
  assert.match(userContext, /createHmac\("sha256"/);
  assert.match(userContext, /USER_DATA_HMAC_KEY/);
  assert.match(program, /const userKey = identityKeyForSubject\(input\.subject\)/);
  assert.doesNotMatch(db, /email TEXT|subject TEXT|login TEXT/i);
});

test("shared shell can enforce Wave 1 membership without changing application RBAC", () => {
  assert.match(program, /PILOT_ENFORCE_COHORT/);
  assert.match(program, /principalPilotAccess/);
  assert.match(program, /hasRole\(principal, "editor"\)/);
  assert.match(shell, /principalPilotAccess\(principal\)/);
  assert.match(shell, /Доступ ограничен участниками текущей пилотной волны/);
});

test("pilot APIs keep admin, editor and participant responsibilities separated", () => {
  assert.match(cohortApi, /authorize\(request, "editor"/);
  assert.match(cohortApi, /authorize\(request, "admin"/);
  assert.match(feedbackApi, /authorize\(request, "viewer"/);
  assert.match(reportApi, /authorize\(request, "editor"/);
  assert.match(reviewsApi, /authorize\(request, "editor"/);
});

test("pilot KPI is based on cohort usage, repeat days and explicit business feedback", () => {
  assert.match(program, /JOIN pilot_members m ON m\.user_key=u\.user_key/);
  assert.match(program, /COUNT\(DISTINCT substr\(u\.created_at,1,10\)\) >= 2/);
  assert.match(program, /AVG\(rating\)/);
  assert.match(program, /SUM\(useful_signal\)/);
  assert.match(program, /SUM\(saved_minutes\)/);
  assert.match(program, /rawRating < 1 \|\| rawRating > 5/);
});

test("pilot outcome is deterministic GO ADJUST STOP, with blockers mapped to STOP", () => {
  assert.match(program, /PilotOutcome = "GO" \| "ADJUST" \| "STOP"/);
  assert.match(program, /operations\.decision === "NO_GO" \|\| metrics\.blockers > 0/);
  assert.match(program, /decision = "STOP"/);
  assert.match(program, /decision = "ADJUST"/);
  assert.match(program, /savePilotReview/);
});

test("v1.7.5 contains no personal Watchlist dependency", () => {
  const scope = [program, control, feedback, cohortApi, feedbackApi, reportApi, reviewsApi].join("\n").toLowerCase();
  assert.equal(scope.includes("watchlist"), false);
  assert.equal(scope.includes("matchwatchlist"), false);
  assert.equal(scope.includes("/api/user/preferences"), false);
});
