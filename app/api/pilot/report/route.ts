import { authorize } from "@/lib/auth";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { pilotKpiSnapshot } from "@/lib/pilot-program";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "editor", context.requestId);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const days = Math.max(1, Math.min(90, Number(url.searchParams.get("days") || 14)));
  return jsonWithContext(context, pilotKpiSnapshot(days), { headers: { "cache-control": "no-store" } });
}
