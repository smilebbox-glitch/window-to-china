import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const db = read("lib/pilot-db.ts");
const program = read("lib/pilot-program.ts");
const userContext = read("lib/user-context.ts");
const shell = read("components/site-shell.tsx");
const control = read("components/pilot-control.tsx");
const feedback = read("components/pilot-feedback.tsx");
const cohortApi = read("app/api/pilot/cohort/route.ts");
const feedbackApi = read("app/api/pilot/feedback/route.ts");
const reportApi = read("app/api/pilot/report/route.ts");
const reviewsApi = read("app/api/pilot/reviews/route.ts");
const env = read(".env.example");
const compose = read("compose.yaml");

for (const token of [
  'version: 4',
  'name: "controlled_corporate_pilot"',
  "CREATE TABLE IF NOT EXISTS pilot_members",
  "CREATE TABLE IF NOT EXISTS pilot_feedback",
  "CREATE TABLE IF NOT EXISTS pilot_reviews",
  "CHECK(pilot_role IN ('participant','manager','sponsor','admin'))",
  "CHECK(decision IN ('GO','ADJUST','STOP'))",
]) check(db.includes(token), `pilot-db missing ${token}`);

for (const token of [
  "identityKeyForSubject",
  'createHmac("sha256"',
  "USER_DATA_HMAC_KEY",
]) check(userContext.includes(token), `user-context missing ${token}`);

for (const token of [
  "pilotCohortEnforcementEnabled",
  "principalPilotAccess",
  "pilotKpiSnapshot",
  "COUNT(DISTINCT substr(u.created_at,1,10)) >= 2",
  'decision = "STOP"',
  'decision = "ADJUST"',
  'PilotOutcome = "GO" | "ADJUST" | "STOP"',
  "rawRating < 1 || rawRating > 5",
]) check(program.includes(token), `pilot-program missing ${token}`);

check(shell.includes("principalPilotAccess"), "shared SiteShell does not enforce controlled cohort");
check(shell.includes('href: "/pilot"'), "pilot route is missing from navigation");
check(control.includes("Pilot Control Room"), "Pilot Control Room UI missing");
check(feedback.includes("Обратная связь по «Окну в Китай»"), "participant feedback UI missing");

check(cohortApi.includes('authorize(request, "editor"'), "cohort GET must require editor");
check(cohortApi.includes('authorize(request, "admin"'), "cohort mutation must require admin");
check(feedbackApi.includes('authorize(request, "viewer"'), "feedback POST must require viewer");
check(reportApi.includes('authorize(request, "editor"'), "KPI report must require editor");
check(reviewsApi.includes('authorize(request, "editor"'), "pilot reviews must require editor");

for (const token of [
  "PILOT_COHORT_NAME=wave-1",
  "PILOT_ENFORCE_COHORT=NO",
  "PILOT_MIN_COHORT=5",
  "PILOT_TARGET_COHORT=10",
  "PILOT_KPI_ACTIVE_RATE=60",
  "PILOT_KPI_RETURN_RATE=40",
  "PILOT_KPI_MIN_RATING=3.8",
]) check(env.includes(token), `.env.example missing ${token}`);

for (const token of [
  "PILOT_COHORT_NAME:",
  "PILOT_ENFORCE_COHORT:",
  "PILOT_KPI_ACTIVE_RATE:",
  "PILOT_KPI_MIN_USEFUL_SIGNALS:",
]) check(compose.includes(token), `compose missing ${token}`);

const noPersonalWatchlist = [program, control, feedback, cohortApi, feedbackApi, reportApi, reviewsApi]
  .every((text) => !text.toLocaleLowerCase("en-US").includes("watchlist") && !text.includes("matchWatchlist") && !text.includes("/api/user/preferences"));
check(noPersonalWatchlist, "personal Watchlist logic leaked into controlled pilot v1.7.5");

if (failures.length) {
  console.error("NO-GO: v1.7.5 controlled pilot preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("GO: v1.7.5 controlled corporate pilot; cohort=on; pseudonymization=on; KPI=on; GO/ADJUST/STOP=on; personalWatchlist=off");
