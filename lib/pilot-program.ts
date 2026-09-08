import { randomUUID } from "node:crypto";
import { getPilotDb } from "@/lib/pilot-db";
import { pilotOperationsStatus } from "@/lib/pilot-operations";

export type PilotOutcome = "GO" | "ADJUST" | "STOP";
export type PilotIssueSeverity = "S1" | "S2" | "S3" | "S4";
export type PilotIssueStatus = "open" | "mitigated" | "closed";

export type PilotFeedbackInput = {
  workFunction?: string;
  rating?: number;
  usefulness?: number;
  savedMinutes?: number;
  outcome?: string;
  section?: string;
  comment?: string;
};

const allowedFunctions = new Set(["R&D", "Закупки", "Логистика", "Производство", "Качество", "Руководство", "Другое"]);
const allowedOutcomes = new Set(["useful_signal", "saved_time", "decision_support", "data_quality", "issue", "no_value", "other"]);

function intEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function pilotPolicy() {
  return {
    windowDays: intEnv("PILOT_WINDOW_DAYS", 10, 3, 90),
    targetMinUsers: intEnv("PILOT_TARGET_MIN_USERS", 5, 1, 100),
    targetMaxUsers: intEnv("PILOT_TARGET_MAX_USERS", 10, 1, 200),
    minFeedback: intEnv("PILOT_MIN_FEEDBACK", 3, 1, 100),
    minUsefulPct: intEnv("PILOT_MIN_USEFUL_PCT", 70, 0, 100),
    minRepeatPct: intEnv("PILOT_MIN_REPEAT_PCT", 40, 0, 100),
  };
}

export function ensurePilotProgramTables() {
  const db = getPilotDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS pilot_feedback (
      id TEXT PRIMARY KEY,
      user_key TEXT NOT NULL,
      work_function TEXT NOT NULL DEFAULT '',
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      usefulness INTEGER NOT NULL CHECK(usefulness BETWEEN 1 AND 5),
      saved_minutes INTEGER NOT NULL DEFAULT 0 CHECK(saved_minutes BETWEEN 0 AND 480),
      outcome TEXT NOT NULL DEFAULT 'other',
      section TEXT NOT NULL DEFAULT '',
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pilot_feedback_user ON pilot_feedback(user_key, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pilot_feedback_time ON pilot_feedback(created_at DESC);

    CREATE TABLE IF NOT EXISTS pilot_issues (
      id TEXT PRIMARY KEY,
      severity TEXT NOT NULL CHECK(severity IN ('S1','S2','S3','S4')),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('open','mitigated','closed')),
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_pilot_issues_status ON pilot_issues(status, severity, updated_at DESC);
  `);
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function clean(value: unknown, max: number) {
  return String(value || "").trim().replace(/\s+/gu, " ").slice(0, max);
}

export function savePilotFeedback(userKey: string, input: PilotFeedbackInput) {
  ensurePilotProgramTables();
  const db = getPilotDb();
  const workFunctionRaw = clean(input.workFunction, 80);
  const workFunction = allowedFunctions.has(workFunctionRaw) ? workFunctionRaw : "Другое";
  const outcomeRaw = clean(input.outcome, 40);
  const outcome = allowedOutcomes.has(outcomeRaw) ? outcomeRaw : "other";
  const feedback = {
    id: randomUUID(),
    userKey,
    workFunction,
    rating: clamp(input.rating, 1, 5, 3),
    usefulness: clamp(input.usefulness, 1, 5, 3),
    savedMinutes: clamp(input.savedMinutes, 0, 480, 0),
    outcome,
    section: clean(input.section, 120),
    comment: clean(input.comment, 1200),
    createdAt: new Date().toISOString(),
  };
  db.prepare(`INSERT INTO pilot_feedback(id,user_key,work_function,rating,usefulness,saved_minutes,outcome,section,comment,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .run(feedback.id, feedback.userKey, feedback.workFunction, feedback.rating, feedback.usefulness, feedback.savedMinutes, feedback.outcome, feedback.section, feedback.comment, feedback.createdAt);
  return feedback;
}

function participantCode(userKey: string) {
  return `P-${userKey.slice(0, 6).toUpperCase()}`;
}

export function listPilotIssues() {
  ensurePilotProgramTables();
  const db = getPilotDb();
  return (db.prepare("SELECT id,severity,title,description,status,source,created_at,updated_at,updated_by FROM pilot_issues ORDER BY CASE severity WHEN 'S1' THEN 1 WHEN 'S2' THEN 2 WHEN 'S3' THEN 3 ELSE 4 END, updated_at DESC LIMIT 300").all() as Array<Record<string, unknown>>)
    .map((row) => ({
      id: String(row.id), severity: String(row.severity) as PilotIssueSeverity, title: String(row.title), description: String(row.description || ""),
      status: String(row.status) as PilotIssueStatus, source: String(row.source || "manual"), createdAt: String(row.created_at), updatedAt: String(row.updated_at), updatedBy: String(row.updated_by || ""),
    }));
}

export function savePilotIssue(input: { id?: string; severity?: string; title?: string; description?: string; status?: string; source?: string }, actor: string) {
  ensurePilotProgramTables();
  const db = getPilotDb();
  const severity = (["S1", "S2", "S3", "S4"].includes(String(input.severity)) ? String(input.severity) : "S3") as PilotIssueSeverity;
  const status = (["open", "mitigated", "closed"].includes(String(input.status)) ? String(input.status) : "open") as PilotIssueStatus;
  const title = clean(input.title, 240);
  if (!title) throw new Error("title обязателен");
  const description = clean(input.description, 2000);
  const source = clean(input.source || "manual", 80);
  const now = new Date().toISOString();
  const id = clean(input.id, 100) || randomUUID();
  const existing = db.prepare("SELECT id FROM pilot_issues WHERE id=?").get(id);
  if (existing) {
    db.prepare("UPDATE pilot_issues SET severity=?,title=?,description=?,status=?,source=?,updated_at=?,updated_by=? WHERE id=?")
      .run(severity, title, description, status, source, now, clean(actor, 160), id);
  } else {
    db.prepare("INSERT INTO pilot_issues(id,severity,title,description,status,source,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?)")
      .run(id, severity, title, description, status, source, now, now, clean(actor, 160));
  }
  return listPilotIssues().find((issue) => issue.id === id) ?? null;
}

export function pilotProgramSummary() {
  ensurePilotProgramTables();
  const db = getPilotDb();
  const policy = pilotPolicy();
  const cutoff = new Date(Date.now() - policy.windowDays * 86400000).toISOString();

  const userRows = db.prepare(`SELECT user_key, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen,
      COUNT(*) AS events, COUNT(DISTINCT substr(created_at,1,10)) AS active_days
    FROM usage_events WHERE created_at>=? GROUP BY user_key ORDER BY last_seen DESC`).all(cutoff) as Array<Record<string, unknown>>;
  const pageRows = db.prepare(`SELECT path, COUNT(*) AS views, COUNT(DISTINCT user_key) AS users
    FROM usage_events WHERE created_at>=? AND event_name='page_view' GROUP BY path ORDER BY views DESC LIMIT 40`).all(cutoff) as Array<Record<string, unknown>>;
  const feedbackRows = db.prepare("SELECT user_key,work_function,rating,usefulness,saved_minutes,outcome,section,created_at FROM pilot_feedback WHERE created_at>=? ORDER BY created_at DESC").all(cutoff) as Array<Record<string, unknown>>;
  const issueRows = listPilotIssues();

  const participants = userRows.map((row) => ({
    code: participantCode(String(row.user_key)),
    firstSeen: String(row.first_seen || ""),
    lastSeen: String(row.last_seen || ""),
    events: Number(row.events || 0),
    activeDays: Number(row.active_days || 0),
  }));
  const activeUsers = participants.length;
  const repeatUsers = participants.filter((row) => row.activeDays >= 2).length;
  const repeatPct = activeUsers ? Math.round((repeatUsers / activeUsers) * 100) : 0;
  const feedbackUsers = new Set(feedbackRows.map((row) => String(row.user_key))).size;
  const feedbackCount = feedbackRows.length;
  const usefulCount = feedbackRows.filter((row) => Number(row.usefulness || 0) >= 4).length;
  const usefulPct = feedbackCount ? Math.round((usefulCount / feedbackCount) * 100) : 0;
  const avgRating = feedbackCount ? Math.round((feedbackRows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / feedbackCount) * 10) / 10 : 0;
  const avgUsefulness = feedbackCount ? Math.round((feedbackRows.reduce((sum, row) => sum + Number(row.usefulness || 0), 0) / feedbackCount) * 10) / 10 : 0;
  const savedMinutes = feedbackRows.reduce((sum, row) => sum + Number(row.saved_minutes || 0), 0);
  const functionCounts = new Map<string, number>();
  for (const row of feedbackRows) {
    const key = String(row.work_function || "Другое");
    functionCounts.set(key, (functionCounts.get(key) || 0) + 1);
  }

  const openIssues = issueRows.filter((issue) => issue.status === "open");
  const openBySeverity = { S1: 0, S2: 0, S3: 0, S4: 0 };
  for (const issue of openIssues) openBySeverity[issue.severity] += 1;
  const operations = pilotOperationsStatus();

  let outcome: PilotOutcome = "GO";
  const reasons: string[] = [];
  const stopReasons: string[] = [];
  const adjustReasons: string[] = [];

  if (operations.decision === "NO_GO") stopReasons.push("Operational gate v1.7.4 = NO_GO.");
  if (openBySeverity.S1 > 0) stopReasons.push(`Есть открытые S1: ${openBySeverity.S1}.`);
  if (openBySeverity.S2 >= 2) stopReasons.push(`Есть ${openBySeverity.S2} открытых S2.`);

  if (activeUsers < policy.targetMinUsers) adjustReasons.push(`Участников ${activeUsers}, целевой минимум ${policy.targetMinUsers}.`);
  if (activeUsers > policy.targetMaxUsers) adjustReasons.push(`Участников ${activeUsers}, целевой максимум ${policy.targetMaxUsers}.`);
  if (feedbackUsers < policy.minFeedback) adjustReasons.push(`Feedback дали ${feedbackUsers}, нужно минимум ${policy.minFeedback}.`);
  if (activeUsers >= policy.targetMinUsers && repeatPct < policy.minRepeatPct) adjustReasons.push(`Повторное использование ${repeatPct}%, цель ≥ ${policy.minRepeatPct}%.`);
  if (feedbackCount >= policy.minFeedback && usefulPct < policy.minUsefulPct) adjustReasons.push(`Полезность ${usefulPct}%, цель ≥ ${policy.minUsefulPct}%.`);
  if (openBySeverity.S2 === 1) adjustReasons.push("Есть один открытый S2 — нужен план коррекции до расширения пилота.");

  if (stopReasons.length) {
    outcome = "STOP";
    reasons.push(...stopReasons, ...adjustReasons);
  } else if (adjustReasons.length) {
    outcome = "ADJUST";
    reasons.push(...adjustReasons);
  } else {
    reasons.push("Operational gate пройден, размер cohort в диапазоне, repeat/usefulness KPI достигнуты, S1/S2 отсутствуют.");
  }

  return {
    outcome,
    generatedAt: new Date().toISOString(),
    policy,
    operations: { decision: operations.decision, briefStatus: operations.briefStatus },
    cohort: { activeUsers, repeatUsers, repeatPct, participants },
    usage: {
      totalEvents: participants.reduce((sum, row) => sum + row.events, 0),
      pages: pageRows.map((row) => ({ path: String(row.path || ""), views: Number(row.views || 0), users: Number(row.users || 0) })),
      decisionViews: Number(pageRows.find((row) => String(row.path) === "/decision")?.views || 0),
      executiveViews: Number(pageRows.find((row) => String(row.path) === "/executive")?.views || 0),
      truckViews: Number(pageRows.find((row) => String(row.path) === "/trucks")?.views || 0),
    },
    feedback: {
      responses: feedbackCount,
      respondents: feedbackUsers,
      avgRating,
      avgUsefulness,
      usefulPct,
      savedMinutes,
      functions: [...functionCounts.entries()].map(([workFunction, count]) => ({ workFunction, count })).sort((a, b) => b.count - a.count),
    },
    issues: { open: openIssues.length, openBySeverity, total: issueRows.length },
    reasons,
  };
}
