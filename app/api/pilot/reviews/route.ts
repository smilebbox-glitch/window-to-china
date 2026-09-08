import { authorize } from "@/lib/auth";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { listPilotReviews, savePilotReview } from "@/lib/pilot-program";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "editor", context.requestId);
  if (auth.response) return auth.response;
  return jsonWithContext(context, { reviews: listPilotReviews() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "editor", context.requestId);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const reviewType = body.reviewType === "final" ? "final" : "weekly";
  const days = Math.max(1, Math.min(90, Number(body.days || (reviewType === "weekly" ? 7 : 30))));
  const review = savePilotReview(auth.principal.subject, reviewType, days);
  return jsonWithContext(context, { ok: true, review }, { status: 201, headers: { "cache-control": "no-store" } });
}
