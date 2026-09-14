import { APP_VERSION } from "@/lib/app-version";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  return jsonWithContext(
    context,
    { status: "ok", service: "okno-v-kitai", version: APP_VERSION, time: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}
