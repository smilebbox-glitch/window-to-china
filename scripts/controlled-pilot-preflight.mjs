import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const required = [
  "lib/pilot-program.ts",
  "lib/pilot-access.ts",
  "components/pilot-feedback-form.tsx",
  "components/pilot-control-room.tsx",
  "app/pilot/page.tsx",
  "app/pilot-feedback/page.tsx",
  "app/api/pilot/feedback/route.ts",
  "app/api/pilot/report/route.ts",
  "app/api/admin/pilot/issues/route.ts",
];

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
for (const file of required) check(fs.existsSync(file), `missing ${file}`);

const program = read("lib/pilot-program.ts");
const feedbackApi = read("app/api/pilot/feedback/route.ts");
const reportApi = read("app/api/pilot/report/route.ts");
const issuesApi = read("app/api/admin/pilot/issues/route.ts");
const control = read("components/pilot-control-room.tsx");
const feedback = read("components/pilot-feedback-form.tsx");
const pilotPage = read("app/pilot/page.tsx");
const env = read(".env.example");
const compose = read("compose.yaml");

for (const token of ["GO", "ADJUST", "STOP", "PILOT_TARGET_MIN_USERS", "PILOT_TARGET_MAX_USERS", "PILOT_MIN_USEFUL_PCT", "PILOT_MIN_REPEAT_PCT", "pilot_feedback", "pilot_issues", "P-"]) {
  check(program.includes(token), `pilot program missing ${token}`);
}
check(program.includes('targetMinUsers: intEnv("PILOT_TARGET_MIN_USERS", 5'), "default pilot minimum must be 5 users");
check(program.includes('intEnv("PILOT_TARGET_MAX_USERS", 10'), "default pilot maximum must be 10 users");
check(program.includes("event_name='page_view'"), "cohort must be based on actual product page use");
check(program.includes("/admin") === false, "control-plane /admin must not be a cohort product path");
check(program.includes("/pilot-feedback") === false, "feedback page must not inflate cohort size");
check(!program.includes("matchWatchlist") && !program.includes("user_preferences"), "controlled pilot outcome must not use personal Watchlist/preferences");

check(feedbackApi.includes("resolveUserContext"), "feedback must use pseudonymous user context");
check(feedbackApi.includes("principal.mode !== \"proxy\""), "proxy-mode feedback must require corporate identity");
check(reportApi.includes("pilotControlMinimumRole"), "pilot report must use role gate");
check(issuesApi.includes('authorize(request, "admin"'), "issue register mutations must be admin-only");
check(pilotPage.includes("pilotControlMinimumRole"), "pilot control page must be role gated");
check(feedback.includes("Имя и почта") && feedback.includes("не сохраняются"), "feedback form must disclose pseudonymous collection");
check(control.includes("не рейтинг производительности сотрудников"), "control room must state telemetry is not employee performance scoring");

for (const token of ["PILOT_CONTROL_MIN_ROLE=viewer", "PILOT_WINDOW_DAYS=10", "PILOT_TARGET_MIN_USERS=5", "PILOT_TARGET_MAX_USERS=10", "PILOT_MIN_FEEDBACK=3", "PILOT_MIN_USEFUL_PCT=70", "PILOT_MIN_REPEAT_PCT=40"]) {
  check(env.includes(token), `.env.example missing ${token}`);
}
for (const token of ["PILOT_CONTROL_MIN_ROLE:", "PILOT_TARGET_MIN_USERS:", "PILOT_TARGET_MAX_USERS:"]) check(compose.includes(token), `compose missing ${token}`);

if (failures.length) {
  console.error("NO-GO: v1.7.5 controlled pilot preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("GO: v1.7.5 controlled pilot contracts present; cohort=5-10; pseudonymous telemetry=on; personalWatchlist=off; outcomes=GO/ADJUST/STOP");
