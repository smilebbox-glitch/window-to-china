import { authorize } from "@/lib/auth";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { listPilotFeedback, submitPilotFeedback } from "@/lib/pilot-program";
import { resolveUserContext, withUserCookie } from "@/lib/user-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "editor", context.requestId);
  if (auth.response) return auth.response;
  return jsonWithContext(context, { feedback: listPilotFeedback() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "viewer", context.requestId);
  if (auth.response) return auth.response;
  const user = resolveUserContext(request);
  const body = await request.json().catch(() => ({}));
  try {
    const feedback = submitPilotFeedback(user.userKey, {
      category: typeof body.category === "string" ? body.category : "general",
      severity: body.severity,
      rating: body.rating,
      usefulSignal: Boolean(body.usefulSignal),
      savedMinutes: body.savedMinutes,
      comment: typeof body.comment === "string" ? body.comment : "",
    });
    return jsonWithContext(context, { ok: true, feedback }, {
      status: 201,
      headers: withUserCookie(user, { "cache-control": "no-store" }),
    });
  } catch (error) {
    return jsonWithContext(context, { error: error instanceof Error ? error.message : "Не удалось сохранить обратную связь." }, {
      status: 400,
      headers: withUserCookie(user, { "cache-control": "no-store" }),
    });
  }
}
