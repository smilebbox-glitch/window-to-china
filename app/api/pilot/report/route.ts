import { authorize } from "@/lib/auth";
import { pilotControlMinimumRole } from "@/lib/pilot-access";
import { pilotProgramSummary } from "@/lib/pilot-program";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, pilotControlMinimumRole(), context.requestId);
  if (auth.response) return auth.response;
  const limit = checkRateLimit({ context, scope: "pilot-report-read", limit: Number(process.env.RATE_LIMIT_READ_PER_MINUTE || 120), actor: auth.principal.subject });
  if (!limit.allowed) return jsonWithContext(context, { error: "Слишком много запросов." }, { status: 429, headers: rateLimitHeaders(limit) });
  return jsonWithContext(context, pilotProgramSummary(), { headers: { "cache-control": "no-store", ...rateLimitHeaders(limit) } });
}
