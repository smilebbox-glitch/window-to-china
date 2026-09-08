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
  "identityKeyForSubject(actor)",
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

// The product may explicitly say that a personal Watchlist does not exist. What is
// forbidden is the dependency/logic itself, not the word in explanatory UI copy.
const productScope = [program, control, feedback, cohortApi, feedbackApi, reportApi, reviewsApi];
const noPersonalWatchlist = productScope.every((text) =>
  !text.includes("matchWatchlist") &&
  !text.includes("/api/user/preferences") &&
  !/from\s+["'][^"']*watchlist[^"']*["']/iu.test(text),
);
check(noPersonalWatchlist, "personal Watchlist dependency leaked into controlled pilot v1.7.5");

// CI/default demo mode deliberately keeps cohort enforcement off. When IT turns the
// real corporate gate on, preflight becomes strict about the surrounding identity and
// pseudonymisation controls instead of allowing a dangerous half-configured state.
const enforcementEnabled = process.env.PILOT_ENFORCE_COHORT?.trim().toUpperCase() === "YES";
if (enforcementEnabled) {
  const authMode = process.env.AUTH_MODE?.trim().toLocaleLowerCase("en-US") || "disabled";
  const proxySecret = process.env.AUTH_PROXY_SECRET?.trim() || "";
  const userDataKey = process.env.USER_DATA_HMAC_KEY?.trim() || "";
  const cohort = process.env.PILOT_COHORT_NAME?.trim() || "";
  const minCohort = Number(process.env.PILOT_MIN_COHORT || 5);
  const targetCohort = Number(process.env.PILOT_TARGET_COHORT || 10);

  check(authMode === "proxy", "PILOT_ENFORCE_COHORT=YES requires AUTH_MODE=proxy");
  check(proxySecret.length >= 32 && !/change-me/iu.test(proxySecret), "controlled pilot requires a strong AUTH_PROXY_SECRET (>=32 chars, not placeholder)");
  check(userDataKey.length >= 32 && !/change-me/iu.test(userDataKey), "controlled pilot requires a strong USER_DATA_HMAC_KEY (>=32 chars, not placeholder)");
  check(cohort.length > 0, "controlled pilot requires PILOT_COHORT_NAME");
  check(Number.isFinite(minCohort) && minCohort >= 1, "PILOT_MIN_COHORT must be a positive number");
  check(Number.isFinite(targetCohort) && targetCohort >= minCohort, "PILOT_TARGET_COHORT must be >= PILOT_MIN_COHORT");
}

if (failures.length) {
  console.error("NO-GO: v1.7.5 controlled pilot preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`GO: v1.7.5 controlled corporate pilot; enforcement=${enforcementEnabled ? "strict" : "off/demo"}; pseudonymization=on; KPI=on; GO/ADJUST/STOP=on; personalWatchlist=off`);
