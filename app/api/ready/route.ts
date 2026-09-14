import { access, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { constants } from "node:fs";
import { auditStatus } from "@/lib/audit";
import { validatePilotConfiguration } from "@/lib/config-validation";
import { pilotDbStatus } from "@/lib/pilot-db";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { runtimeConfigPath } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  let runtimeWritable = false;
  try {
    const directory = dirname(runtimeConfigPath());
    await mkdir(directory, { recursive: true });
    await access(directory, constants.W_OK);
    runtimeWritable = true;
  } catch { runtimeWritable = false; }
  const database = pilotDbStatus();
  // Configuration validation was computed but never gated anything, so a pilot
  // would happily start with the published placeholder SCHEDULER_TOKEN or
  // USER_DATA_HMAC_KEY. Those are `fail`-level findings; treat them as not-ready
  // so the container is visibly unhealthy instead of quietly insecure.
  const configuration = validatePilotConfiguration();
  const ready = runtimeWritable && database.available && database.migrationsPending === 0 && configuration.valid;
  return jsonWithContext(context, {
    status: ready ? "ready" : "not-ready",
    checks: {
      runtimeDataWritable: runtimeWritable,
      sqliteAvailable: database.available,
      migrationsCurrent: database.migrationsPending === 0,
      configurationValid: configuration.valid,
    },
    // Only the blocking findings, by key, so an unauthenticated probe learns what
    // to fix without being handed the full configuration narrative.
    configuration: {
      valid: configuration.valid,
      failures: configuration.checks.filter((item) => item.level === "fail").map((item) => item.key),
      warnings: configuration.warnings,
    },
    // No filesystem path here: /api/ready is an unauthenticated probe.
    database: { snapshots: database.snapshots, contentItems: database.contentItems, schemaVersion: database.schemaVersion, schemaLatest: database.schemaLatest, migrationsPending: database.migrationsPending },
    audit: { integrity: auditStatus().integrity },
    time: new Date().toISOString(),
  }, { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } });
}
