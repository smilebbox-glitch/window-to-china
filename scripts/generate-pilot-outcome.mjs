import fs from "node:fs";
import path from "node:path";

const baseUrl = new URL(process.env.PILOT_BASE_URL || "http://127.0.0.1:3000");
const days = Math.max(1, Math.min(90, Number(process.env.PILOT_REPORT_DAYS || 30)));
const token = process.env.ADMIN_API_TOKEN?.trim() || "";
const proxySecret = process.env.AUTH_PROXY_SECRET?.trim() || "";
const proxySubject = process.env.PILOT_REPORT_SUBJECT?.trim() || "pilot-outcome-generator";
const proxyGroups = process.env.PILOT_REPORT_GROUPS?.trim() || process.env.AUTH_ADMIN_GROUP?.trim() || "okno-china-admin";
const url = new URL(`/api/pilot/report?days=${days}`, baseUrl);

const headers = { accept: "application/json" };
if (token) headers["x-admin-token"] = token;
if (proxySecret) {
  headers["x-okno-proxy-secret"] = proxySecret;
  headers["x-forwarded-user"] = proxySubject;
  headers["x-forwarded-groups"] = proxyGroups;
}

const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
if (!response.ok) {
  const body = await response.text().catch(() => "");
  console.error(`Pilot outcome report failed: HTTP ${response.status} ${body.slice(0, 500)}`);
  console.error("For AUTH_MODE=disabled provide ADMIN_API_TOKEN. For AUTH_MODE=proxy provide AUTH_PROXY_SECRET and an editor/admin group via PILOT_REPORT_GROUPS.");
  process.exit(2);
}

const report = await response.json();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.resolve("acceptance");
fs.mkdirSync(dir, { recursive: true });
const jsonPath = path.join(dir, `PILOT_OUTCOME_${stamp}.json`);
const mdPath = path.join(dir, `PILOT_OUTCOME_${stamp}.md`);

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const m = report.metrics || {};
const p = report.policy || {};
const lines = [
  "# Окно в Китай — Controlled Corporate Pilot Outcome",
  "",
  `**Решение:** ${report.decision || "UNKNOWN"}`,
  `**Cohort:** ${m.cohort || "—"}`,
  `**Период KPI:** ${m.days ?? days} дней`,
  `**Сформировано:** ${report.generatedAt || new Date().toISOString()}`,
  `**Operational gate:** ${report.operations?.decision || "—"} / ${report.operations?.briefStatus || "—"}`,
  "",
  "## KPI",
  "",
  "| Показатель | Факт | Цель |",
  "|---|---:|---:|",
  `| Участники | ${m.cohortSize ?? 0} | min ${p.minCohort ?? "—"}, target ${p.targetCohort ?? "—"} |`,
  `| Активность | ${m.activeRate ?? 0}% | ≥ ${p.activeRate ?? "—"}% |`,
  `| Возврат пользователей | ${m.returnRate ?? 0}% | ≥ ${p.returnRate ?? "—"}% |`,
  `| Feedback | ${m.feedbackCount ?? 0} | ≥ ${p.minFeedback ?? "—"} |`,
  `| Средняя оценка | ${m.avgRating ?? 0} | ≥ ${p.minRating ?? "—"} |`,
  `| Полезные бизнес-сигналы | ${m.usefulSignals ?? 0} | ≥ ${p.minUsefulSignals ?? "—"} |`,
  `| Сэкономлено времени | ${m.savedMinutes ?? 0} мин | информационно |`,
  `| Major | ${m.majors ?? 0} | 0 желательно |`,
  `| Blocker | ${m.blockers ?? 0} | 0 обязательно |`,
  "",
  "## Причины решения",
  "",
  ...((report.reasons || []).map((reason) => `- ${reason}`)),
  "",
  "## Подразделения",
  "",
  "| Подразделение | Участники | Активные | События |",
  "|---|---:|---:|---:|",
  ...((m.departments || []).map((row) => `| ${row.department} | ${row.members} | ${row.activeUsers} | ${row.events} |`)),
  "",
  "## Интерпретация",
  "",
  "- **GO** — operational gate и заданные KPI выполнены; можно планировать расширение.",
  "- **ADJUST** — критического blocker нет, но KPI/major feedback требуют корректирующих действий перед расширением.",
  "- **STOP** — operational NO_GO или blocker feedback; расширение пилота останавливается до устранения причины.",
  "",
  "> Персонального Watchlist в модели пилота нет. KPI относятся к общей корпоративной версии сервиса.",
  "",
];
fs.writeFileSync(mdPath, lines.join("\n"), "utf8");

console.log(`Pilot outcome: ${report.decision}`);
console.log(`JSON: ${jsonPath}`);
console.log(`Markdown: ${mdPath}`);
if (report.decision === "STOP") process.exit(2);
