import { APP_VERSION } from "@/lib/app-version";
import { auditStatus } from "@/lib/audit";
import { authorize, revealsOperationalDetail } from "@/lib/auth";
import { externalSnapshot } from "@/lib/metrics";
import { outboundPolicy } from "@/lib/outbound";
import { checkRateLimit, rateLimitHeaders, rateLimitPolicy } from "@/lib/rate-limit";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { loadRuntimeConfig, runtimeConfigPath } from "@/lib/runtime-config";
import { migrationStatus, pilotDbStatus } from "@/lib/pilot-db";
import { governancePolicy, schedulerLockStatus, sourceSlaStatus } from "@/lib/governance";
import { validatePilotConfiguration } from "@/lib/config-validation";
import { sourceReliabilitySummary } from "@/lib/source-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "viewer", context.requestId);
  if (auth.response) return auth.response;
  const limit = checkRateLimit({ context, scope: "admin-read", limit: Number(process.env.RATE_LIMIT_READ_PER_MINUTE || 120), actor: auth.principal.subject });
  if (!limit.allowed) return jsonWithContext(context, { error: "Слишком много запросов." }, { status: 429, headers: rateLimitHeaders(limit) });
  const runtime = await loadRuntimeConfig();
  const authMode = process.env.AUTH_MODE?.trim() === "proxy" ? "proxy" : "disabled";

  // Everything an unauthenticated caller is allowed to see: enough for the admin
  // console shell and the ADMIN_API_TOKEN form to render, and nothing about the
  // host, the filesystem or which secrets are missing.
  const publicPayload = {
    service: "okno-v-kitai",
    version: APP_VERSION,
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    requestId: context.requestId,
    principal: auth.principal,
    auth: { mode: authMode },
    runtime,
  };

  if (!revealsOperationalDetail(auth.principal)) {
    return jsonWithContext(
      context,
      { ...publicPayload, restricted: true },
      { headers: { "cache-control": "no-store", ...rateLimitHeaders(limit) } },
    );
  }

  return jsonWithContext(
    context,
    {
      ...publicPayload,
      restricted: false,
      auth: {
        mode: authMode,
        proxySecretConfigured: Boolean(process.env.AUTH_PROXY_SECRET?.trim()),
        adminTokenConfigured: Boolean(process.env.ADMIN_API_TOKEN?.trim()),
      },
      reliability: { database: pilotDbStatus(), schedulerConfigured: Boolean(process.env.SCHEDULER_TOKEN?.trim()), summary: sourceReliabilitySummary(50) },
      integrations: {
        ragConfigured: Boolean(process.env.RAG_API_URL?.trim() && process.env.RAG_MODEL?.trim()),
        runtimeConfigPath: runtimeConfigPath(),
        outbound: outboundPolicy(),
      },
      operations: {
        audit: auditStatus(),
        rateLimit: rateLimitPolicy(),
        backup: { format: "okno-v-kitai-runtime-backup", schema: 2, secretsIncluded: false },
        governance: { policy: governancePolicy(), migrations: migrationStatus(), locks: schedulerLockStatus(), sla: sourceSlaStatus(), validation: validatePilotConfiguration() },
      },
      external: externalSnapshot(),
      process: {
        node: process.version,
        pid: process.pid,
        memory: process.memoryUsage(),
      },
    },
    { headers: { "cache-control": "no-store", ...rateLimitHeaders(limit) } },
  );
}
