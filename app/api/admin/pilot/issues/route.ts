import { authorize } from "@/lib/auth";
import { listPilotIssues, savePilotIssue } from "@/lib/pilot-program";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "admin", context.requestId);
  if (auth.response) return auth.response;
  const limit = checkRateLimit({ context, scope: "pilot-issues-read", limit: Number(process.env.RATE_LIMIT_READ_PER_MINUTE || 120), actor: auth.principal.subject });
  if (!limit.allowed) return jsonWithContext(context, { error: "Слишком много запросов." }, { status: 429, headers: rateLimitHeaders(limit) });
  return jsonWithContext(context, { issues: listPilotIssues() }, { headers: { "cache-control": "no-store", ...rateLimitHeaders(limit) } });
}

export async function POST(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "admin", context.requestId);
  if (auth.response) return auth.response;
  const limit = checkRateLimit({ context, scope: "pilot-issues-write", limit: Number(process.env.RATE_LIMIT_ADMIN_MUTATION_PER_5_MIN || 30), windowMs: 5 * 60 * 1000, actor: auth.principal.subject });
  if (!limit.allowed) return jsonWithContext(context, { error: "Слишком много изменений." }, { status: 429, headers: rateLimitHeaders(limit) });
  let body: Record<string, unknown> = {};
  try { body = await request.json() as Record<string, unknown>; } catch { return jsonWithContext(context, { error: "Некорректный JSON." }, { status: 400 }); }
  try {
    const issue = savePilotIssue(body, auth.principal.subject);
    return jsonWithContext(context, { ok: true, issue }, { status: 201, headers: { "cache-control": "no-store", ...rateLimitHeaders(limit) } });
  } catch (error) {
    return jsonWithContext(context, { error: error instanceof Error ? error.message : "Не удалось сохранить issue." }, { status: 400 });
  }
}
