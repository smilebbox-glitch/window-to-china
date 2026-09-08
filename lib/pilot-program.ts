import { randomUUID } from "node:crypto";
import type { Principal } from "@/lib/auth";
import { hasRole } from "@/lib/auth";
import { getPilotDb } from "@/lib/pilot-db";
import { pilotOperationsStatus } from "@/lib/pilot-operations";
import { identityKeyForSubject } from "@/lib/user-context";

export type PilotMemberRole = "participant" | "manager" | "sponsor" | "admin";
export type PilotMemberStatus = "invited" | "active" | "paused" | "completed" | "removed";
export type PilotFeedbackSeverity = "note" | "minor" | "major" | "blocker";
export type PilotOutcome = "GO" | "ADJUST" | "STOP";

export type PilotMember = {
  userKey: string;
  cohort: string;
  participantCode: string;
  department: string;
  pilotRole: PilotMemberRole;
  status: PilotMemberStatus;
  joinedAt: string;
  updatedAt: string;
};

export type PilotFeedbackInput = {
  category?: string;
  severity?: PilotFeedbackSeverity;
  rating?: number;
  usefulSignal?: boolean;
  savedMinutes?: number;
  comment?: string;
};

function intEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function floatEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function pilotCohortName() {
  return (process.env.PILOT_COHORT_NAME?.trim() || "wave-1").slice(0, 80);
}

export function pilotCohortEnforcementEnabled() {
  return process.env.PILOT_ENFORCE_COHORT?.trim().toUpperCase() === "YES";
}

export function pilotKpiPolicy() {
  return {
    minCohort: intEnv("PILOT_MIN_COHORT", 5, 1, 1000),
    targetCohort: intEnv("PILOT_TARGET_COHORT", 10, 1, 1000),
    activeRate: floatEnv("PILOT_KPI_ACTIVE_RATE", 60, 0, 100),
    returnRate: floatEnv("PILOT_KPI_RETURN_RATE", 40, 0, 100),
    minRating: floatEnv("PILOT_KPI_MIN_RATING", 3.8, 1, 5),
    minFeedback: intEnv("PILOT_KPI_MIN_FEEDBACK", 3, 0, 10000),
    minUsefulSignals: intEnv("PILOT_KPI_MIN_USEFUL_SIGNALS", 2, 0, 10000),
  };
}

function memberFromRow(row: Record<string, unknown>): PilotMember {
  return {
    userKey: String(row.user_key),
    cohort: String(row.cohort),
    participantCode: String(row.participant_code),
    department: String(row.department),
    pilotRole: String(row.pilot_role) as PilotMemberRole,
    status: String(row.status) as PilotMemberStatus,
    joinedAt: String(row.joined_at),
    updatedAt: String(row.updated_at),
  };
}

export function getPilotMember(userKey: string, cohort = pilotCohortName()) {
  const db = getPilotDb();
  const row = db.prepare("SELECT * FROM pilot_members WHERE user_key=? AND cohort=?").get(userKey, cohort) as Record<string, unknown> | undefined;
  return row ? memberFromRow(row) : null;
}

export function listPilotMembers(cohort = pilotCohortName()) {
  const db = getPilotDb();
  return (db.prepare("SELECT * FROM pilot_members WHERE cohort=? ORDER BY status,department,participant_code").all(cohort) as Array<Record<string, unknown>>).map(memberFromRow);
}

function normalizeRole(value: unknown): PilotMemberRole {
  return ["participant", "manager", "sponsor", "admin"].includes(String(value)) ? String(value) as PilotMemberRole : "participant";
}

function normalizeStatus(value: unknown): PilotMemberStatus {
  return ["invited", "active", "paused", "completed", "removed"].includes(String(value)) ? String(value) as PilotMemberStatus : "active";
}

export function enrollPilotSubject(input: {
  subject: string;
  department: string;
  participantCode: string;
  pilotRole?: PilotMemberRole;
  status?: PilotMemberStatus;
  cohort?: string;
}) {
  const userKey = identityKeyForSubject(input.subject);
  const cohort = (input.cohort?.trim() || pilotCohortName()).slice(0, 80);
  const participantCode = input.participantCode.trim().slice(0, 60);
  const department = input.department.trim().slice(0, 120);
  if (!participantCode || !department) throw new Error("participantCode и department обязательны.");
  const pilotRole = normalizeRole(input.pilotRole);
  const status = normalizeStatus(input.status);
  const db = getPilotDb();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO pilot_members(user_key,cohort,participant_code,department,pilot_role,status,joined_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(user_key) DO UPDATE SET cohort=excluded.cohort,participant_code=excluded.participant_code,
      department=excluded.department,pilot_role=excluded.pilot_role,status=excluded.status,updated_at=excluded.updated_at`)
    .run(userKey, cohort, participantCode, department, pilotRole, status, now, now);
  return getPilotMember(userKey, cohort)!;
}

export function updatePilotMember(userKey: string, input: Partial<Pick<PilotMember, "department" | "participantCode" | "pilotRole" | "status">>, cohort = pilotCohortName()) {
  const current = getPilotMember(userKey, cohort);
  if (!current) throw new Error("Участник пилота не найден.");
  const next = {
    participantCode: String(input.participantCode ?? current.participantCode).trim().slice(0, 60),
    department: String(input.department ?? current.department).trim().slice(0, 120),
    pilotRole: normalizeRole(input.pilotRole ?? current.pilotRole),
    status: normalizeStatus(input.status ?? current.status),
  };
  if (!next.participantCode || !next.department) throw new Error("participantCode и department обязательны.");
  const now = new Date().toISOString();
  getPilotDb().prepare("UPDATE pilot_members SET participant_code=?,department=?,pilot_role=?,status=?,updated_at=? WHERE user_key=? AND cohort=?")
    .run(next.participantCode, next.department, next.pilotRole, next.status, now, userKey, cohort);
  return getPilotMember(userKey, cohort)!;
}

export function principalPilotAccess(principal: Principal) {
  if (!pilotCohortEnforcementEnabled()) return { allowed: true, reason: "cohort_enforcement_disabled", member: null as PilotMember | null };
  if (hasRole(principal, "editor")) return { allowed: true, reason: "staff_bypass", member: null as PilotMember | null };
  if (!principal.authenticated) return { allowed: false, reason: "authentication_required", member: null as PilotMember | null };
  const member = getPilotMember(identityKeyForSubject(principal.subject));
  const allowed = Boolean(member && (member.status === "active" || member.status === "invited"));
  return { allowed, reason: allowed ? "active_cohort_member" : "not_in_active_cohort", member };
}

export function submitPilotFeedback(userKey: string, input: PilotFeedbackInput, cohort = pilotCohortName()) {
  const member = getPilotMember(userKey, cohort);
  if (!member || member.status !== "active") throw new Error("Обратная связь доступна только активным участникам пилота.");
  const category = String(input.category || "general").trim().slice(0, 80) || "general";
  const severity = (["note", "minor", "major", "blocker"].includes(String(input.severity)) ? String(input.severity) : "note") as PilotFeedbackSeverity;
  const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating || 0))));
  if (!Number.isFinite(rating) || rating < 1) throw new Error("Оценка 1–5 обязательна.");
  const usefulSignal = Boolean(input.usefulSignal);
  const savedMinutes = Math.max(0, Math.min(1440, Math.round(Number(input.savedMinutes || 0))));
  const comment = String(input.comment || "").trim().slice(0, 4000);
  if (!comment) throw new Error("Комментарий обязателен.");
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  getPilotDb().prepare(`INSERT INTO pilot_feedback(id,user_key,cohort,category,severity,rating,useful_signal,saved_minutes,comment,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id, userKey, cohort, category, severity, rating, usefulSignal ? 1 : 0, savedMinutes, comment, createdAt);
  return { id, cohort, category, severity, rating, usefulSignal, savedMinutes, comment, createdAt };
}

export function listPilotFeedback(cohort = pilotCohortName(), limit = 200) {
  const rows = getPilotDb().prepare(`SELECT f.id,f.user_key,f.cohort,f.category,f.severity,f.rating,f.useful_signal,f.saved_minutes,f.comment,f.created_at,
      m.participant_code,m.department,m.pilot_role
    FROM pilot_feedback f JOIN pilot_members m ON m.user_key=f.user_key
    WHERE f.cohort=? ORDER BY f.created_at DESC LIMIT ?`).all(cohort, Math.max(1, Math.min(1000, limit))) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id), participantCode: String(row.participant_code), department: String(row.department), pilotRole: String(row.pilot_role),
    category: String(row.category), severity: String(row.severity), rating: Number(row.rating), usefulSignal: Number(row.useful_signal) === 1,
    savedMinutes: Number(row.saved_minutes || 0), comment: String(row.comment), createdAt: String(row.created_at),
  }));
}

export function pilotKpiSnapshot(days = 14, cohort = pilotCohortName()) {
  const db = getPilotDb();
  const safeDays = Math.max(1, Math.min(90, Math.round(days)));
  const cutoff = new Date(Date.now() - safeDays * 86_400_000).toISOString();
  const members = listPilotMembers(cohort);
  const eligible = members.filter((member) => member.status === "active" || member.status === "completed");
  const cohortSize = eligible.length;
  const activity = db.prepare(`SELECT COUNT(DISTINCT u.user_key) AS active_users,
      COUNT(*) AS events,
      SUM(CASE WHEN u.event_name='page_view' THEN 1 ELSE 0 END) AS page_views
    FROM usage_events u JOIN pilot_members m ON m.user_key=u.user_key
    WHERE m.cohort=? AND m.status IN ('active','completed') AND u.created_at>=?`).get(cohort, cutoff) as Record<string, unknown> | undefined;
  const returnRow = db.prepare(`SELECT COUNT(*) AS returning_users FROM (
      SELECT u.user_key FROM usage_events u JOIN pilot_members m ON m.user_key=u.user_key
      WHERE m.cohort=? AND m.status IN ('active','completed') AND u.created_at>=?
      GROUP BY u.user_key HAVING COUNT(DISTINCT substr(u.created_at,1,10)) >= 2
    )`).get(cohort, cutoff) as Record<string, unknown> | undefined;
  const feedback = db.prepare(`SELECT COUNT(*) AS feedback_count,COUNT(DISTINCT user_key) AS feedback_users,
      ROUND(AVG(rating),2) AS avg_rating,SUM(useful_signal) AS useful_signals,SUM(saved_minutes) AS saved_minutes,
      SUM(CASE WHEN severity='blocker' THEN 1 ELSE 0 END) AS blockers,
      SUM(CASE WHEN severity='major' THEN 1 ELSE 0 END) AS majors
    FROM pilot_feedback WHERE cohort=? AND created_at>=?`).get(cohort, cutoff) as Record<string, unknown> | undefined;
  const departments = db.prepare(`SELECT m.department,COUNT(DISTINCT m.user_key) AS members,COUNT(u.id) AS events,COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN m.user_key END) AS active_users
    FROM pilot_members m LEFT JOIN usage_events u ON u.user_key=m.user_key AND u.created_at>=?
    WHERE m.cohort=? AND m.status IN ('active','completed') GROUP BY m.department ORDER BY members DESC,m.department`).all(cutoff, cohort) as Array<Record<string, unknown>>;

  const activeUsers = Number(activity?.active_users || 0);
  const returningUsers = Number(returnRow?.returning_users || 0);
  const activeRate = cohortSize ? Math.round((activeUsers / cohortSize) * 1000) / 10 : 0;
  const returnRate = cohortSize ? Math.round((returningUsers / cohortSize) * 1000) / 10 : 0;
  const metrics = {
    days: safeDays,
    cohort,
    cohortSize,
    invited: members.filter((member) => member.status === "invited").length,
    activeUsers,
    activeRate,
    returningUsers,
    returnRate,
    totalEvents: Number(activity?.events || 0),
    pageViews: Number(activity?.page_views || 0),
    feedbackCount: Number(feedback?.feedback_count || 0),
    feedbackUsers: Number(feedback?.feedback_users || 0),
    avgRating: Number(feedback?.avg_rating || 0),
    usefulSignals: Number(feedback?.useful_signals || 0),
    savedMinutes: Number(feedback?.saved_minutes || 0),
    blockers: Number(feedback?.blockers || 0),
    majors: Number(feedback?.majors || 0),
    departments: departments.map((row) => ({ department: String(row.department), members: Number(row.members || 0), activeUsers: Number(row.active_users || 0), events: Number(row.events || 0) })),
  };

  const policy = pilotKpiPolicy();
  const operations = pilotOperationsStatus();
  let decision: PilotOutcome = "GO";
  const reasons: string[] = [];

  if (operations.decision === "NO_GO" || metrics.blockers > 0) {
    decision = "STOP";
    if (operations.decision === "NO_GO") reasons.push("Operational gate v1.7.4 вернул NO_GO.");
    if (metrics.blockers > 0) reasons.push(`Есть blocker feedback: ${metrics.blockers}.`);
  } else {
    if (cohortSize < policy.minCohort) reasons.push(`Недостаточно участников: ${cohortSize}/${policy.minCohort}.`);
    if (metrics.activeRate < policy.activeRate) reasons.push(`Активность ниже KPI: ${metrics.activeRate}% < ${policy.activeRate}%.`);
    if (metrics.returnRate < policy.returnRate) reasons.push(`Возврат пользователей ниже KPI: ${metrics.returnRate}% < ${policy.returnRate}%.`);
    if (metrics.feedbackCount < policy.minFeedback) reasons.push(`Недостаточно feedback: ${metrics.feedbackCount}/${policy.minFeedback}.`);
    if (metrics.feedbackCount > 0 && metrics.avgRating < policy.minRating) reasons.push(`Средняя оценка ниже KPI: ${metrics.avgRating} < ${policy.minRating}.`);
    if (metrics.usefulSignals < policy.minUsefulSignals) reasons.push(`Подтверждённых полезных сигналов: ${metrics.usefulSignals}/${policy.minUsefulSignals}.`);
    if (metrics.majors > 0) reasons.push(`Есть major feedback: ${metrics.majors}; требуется corrective action.`);
    if (reasons.length) decision = "ADJUST";
  }
  if (!reasons.length) reasons.push("Operational gate и KPI controlled pilot выполнены.");

  return { generatedAt: new Date().toISOString(), policy, operations: { decision: operations.decision, briefStatus: operations.briefStatus }, metrics, decision, reasons };
}

export function savePilotReview(actor: string, reviewType: "weekly" | "final", days = reviewType === "weekly" ? 7 : 30, cohort = pilotCohortName()) {
  const snapshot = pilotKpiSnapshot(days, cohort);
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const summary = snapshot.reasons.join(" ").slice(0, 4000);
  getPilotDb().prepare("INSERT INTO pilot_reviews(id,cohort,review_type,decision,summary,kpi_json,created_at,created_by) VALUES(?,?,?,?,?,?,?,?)")
    .run(id, cohort, reviewType, snapshot.decision, summary, JSON.stringify(snapshot), createdAt, actor.slice(0, 160));
  return { id, reviewType, decision: snapshot.decision, summary, snapshot, createdAt };
}

export function listPilotReviews(cohort = pilotCohortName(), limit = 50) {
  const rows = getPilotDb().prepare("SELECT id,review_type,decision,summary,kpi_json,created_at,created_by FROM pilot_reviews WHERE cohort=? ORDER BY created_at DESC LIMIT ?")
    .all(cohort, Math.max(1, Math.min(200, limit))) as Array<Record<string, unknown>>;
  return rows.map((row) => ({ id: String(row.id), reviewType: String(row.review_type), decision: String(row.decision), summary: String(row.summary), createdAt: String(row.created_at), createdBy: String(row.created_by) }));
}
