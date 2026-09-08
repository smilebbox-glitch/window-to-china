import { getPilotDb } from "@/lib/pilot-db";
import { savePilotFeedback, ensurePilotProgramTables } from "@/lib/pilot-program";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { resolveUserContext, withUserCookie } from "@/lib/user-context";
import { trackUsage } from "@/lib/user-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const user = resolveUserContext(request);
  const limit = checkRateLimit({ context, scope: "pilot-feedback-read", limit: Number(process.env.RATE_LIMIT_READ_PER_MINUTE || 120), actor: user.userKey });
  if (!limit.allowed) return jsonWithContext(context, { error: "Слишком много запросов." }, { status: 429, headers: withUserCookie(user, rateLimitHeaders(limit)) });
  ensurePilotProgramTables();
  const db = getPilotDb();
  const row = db.prepare("SELECT COUNT(*) AS count, MAX(created_at) AS latest FROM pilot_feedback WHERE user_key=?").get(user.userKey) as Record<string, unknown> | undefined;
  return jsonWithContext(context, { submissions: Number(row?.count || 0), latest: row?.latest ? String(row.latest) : null }, { headers: withUserCookie(user, { "cache-control": "no-store", ...rateLimitHeaders(limit) }) });
}

export async function POST(request: Request) {
  const context = createRequestContext(request);
  const user = resolveUserContext(request);
  const limit = checkRateLimit({ context, scope: "pilot-feedback-write", limit: 20, windowMs: 60 * 60 * 1000, actor: user.userKey });
  if (!limit.allowed) return jsonWithContext(context, { error: "Слишком много отзывов за короткое время." }, { status: 429, headers: withUserCookie(user, rateLimitHeaders(limit)) });
  let body: Record<string, unknown> = {};
  try { body = await request.json() as Record<string, unknown>; } catch { return jsonWithContext(context, { error: "Некорректный JSON." }, { status: 400, headers: withUserCookie(user) }); }
  try {
    const feedback = savePilotFeedback(user.userKey, body);
    trackUsage(user.userKey, "pilot_feedback", "/pilot-feedback", { outcome: feedback.outcome, workFunction: feedback.workFunction, rating: feedback.rating, usefulness: feedback.usefulness });
    return jsonWithContext(context, { ok: true, feedback: { id: feedback.id, createdAt: feedback.createdAt } }, { status: 201, headers: withUserCookie(user, { "cache-control": "no-store", ...rateLimitHeaders(limit) }) });
  } catch (error) {
    return jsonWithContext(context, { error: error instanceof Error ? error.message : "Не удалось сохранить отзыв." }, { status: 400, headers: withUserCookie(user) });
  }
}
