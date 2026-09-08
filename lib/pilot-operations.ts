import type { Role } from "@/lib/auth";
import { governancePolicy } from "@/lib/governance";
import { getPilotDb, migrationStatus, pilotDbStatus } from "@/lib/pilot-db";
import { sourceReliabilitySummary } from "@/lib/source-cache";
import type { NewsItem } from "@/lib/data";

export type BriefOperationalStatus = "GO" | "DEGRADED" | "STALE";
export type PilotDecision = "GO" | "NO_GO";

export type NewsAggregatePayload = {
  news?: NewsItem[];
  updatedAt?: string;
  sourceCount?: number;
  totalSources?: number;
  errors?: string[];
  sourceBreakdown?: Array<{ source: string; state: string; items: number; latencyMs: number }>;
};

export type PilotOperationsStatus = {
  decision: PilotDecision;
  briefStatus: BriefOperationalStatus;
  generatedAt: string;
  executiveMinimumRole: Exclude<Role, "none">;
  aggregate: {
    available: boolean;
    fetchedAt: string | null;
    ageSeconds: number | null;
    qualityScore: number | null;
    itemCount: number;
    state: string;
    sourceCount: number;
    totalSources: number;
  };
  sources: {
    fresh: number;
    stale: number;
    error: number;
    empty: number;
    total: number;
    degraded: Array<{ source: string; state: string; items: number; latencyMs: number }>;
  };
  sla: {
    maxAgeSeconds: number;
    minQuality: number;
  };
  database: ReturnType<typeof pilotDbStatus>;
  migrations: ReturnType<typeof migrationStatus>;
  reasons: string[];
};

function role(value: string | undefined): Exclude<Role, "none"> {
  const normalized = value?.trim().toLocaleLowerCase("en-US");
  if (normalized === "admin" || normalized === "editor" || normalized === "viewer") return normalized;
  return "viewer";
}

export function executiveMinimumRole() {
  return role(process.env.EXECUTIVE_MIN_ROLE);
}

function parsePayload(value: unknown): NewsAggregatePayload {
  try { return JSON.parse(String(value || "{}")) as NewsAggregatePayload; } catch { return {}; }
}

export function latestNewsAggregate() {
  const db = getPilotDb();
  const row = db.prepare(`SELECT payload_json,fetched_at,expires_at,stale_until,status,quality_score,item_count,error
    FROM source_snapshots WHERE source_key='news.aggregate' ORDER BY fetched_at DESC LIMIT 1`).get() as Record<string, unknown> | undefined;
  if (!row) return null;
  const fetchedAt = String(row.fetched_at || "");
  const fetchedMs = Date.parse(fetchedAt);
  const expiresMs = Date.parse(String(row.expires_at || ""));
  const staleMs = Date.parse(String(row.stale_until || ""));
  const now = Date.now();
  return {
    payload: parsePayload(row.payload_json),
    fetchedAt,
    ageSeconds: Number.isFinite(fetchedMs) ? Math.max(0, Math.floor((now - fetchedMs) / 1000)) : null,
    state: Number.isFinite(expiresMs) && now <= expiresMs ? "fresh" : Number.isFinite(staleMs) && now <= staleMs ? "stale" : "expired",
    qualityScore: Number(row.quality_score || 0),
    itemCount: Number(row.item_count || 0),
    status: String(row.status || ""),
    error: String(row.error || ""),
  };
}

export function pilotOperationsStatus(): PilotOperationsStatus {
  const generatedAt = new Date().toISOString();
  const database = pilotDbStatus();
  const migrations = migrationStatus();
  const policy = governancePolicy().sla["news.aggregate"];
  const aggregate = latestNewsAggregate();
  const reliability = sourceReliabilitySummary(300);
  const aggregateBreakdown = aggregate?.payload.sourceBreakdown ?? [];
  const reasons: string[] = [];

  let decision: PilotDecision = "GO";
  let briefStatus: BriefOperationalStatus = "GO";

  if (!database.available) {
    decision = "NO_GO";
    briefStatus = "STALE";
    reasons.push("SQLite runtime database недоступна.");
  }
  if (migrations.pending > 0) {
    decision = "NO_GO";
    briefStatus = "STALE";
    reasons.push(`Есть неприменённые DB migrations: ${migrations.pending}.`);
  }
  if (!aggregate) {
    decision = "NO_GO";
    briefStatus = "STALE";
    reasons.push("Нет агрегированного news snapshot для управленческого brief.");
  } else {
    const age = aggregate.ageSeconds ?? Number.POSITIVE_INFINITY;
    if (aggregate.state === "expired" || age > policy.maxAgeSeconds) {
      decision = "NO_GO";
      briefStatus = "STALE";
      reasons.push(`News aggregate устарел: ${Math.round(age / 60)} мин при SLA ${Math.round(policy.maxAgeSeconds / 60)} мин.`);
    } else if (aggregate.qualityScore < policy.minQuality || aggregate.status === "partial" || (aggregate.payload.errors?.length ?? 0) > 0) {
      briefStatus = "DEGRADED";
      reasons.push(`News aggregate свежий, но quality/status ниже целевого уровня (${aggregate.qualityScore}/100, status=${aggregate.status || "unknown"}).`);
    }
  }

  const fresh = aggregateBreakdown.filter((item) => item.state === "live").length;
  const stale = aggregateBreakdown.filter((item) => item.state === "stale").length;
  const error = aggregateBreakdown.filter((item) => item.state === "error").length;
  const empty = aggregateBreakdown.filter((item) => item.state === "empty").length;
  if (briefStatus === "GO" && (stale > 0 || error > 0)) {
    briefStatus = "DEGRADED";
    reasons.push(`Часть источников деградировала: stale=${stale}, error=${error}.`);
  }

  if (!reliability.snapshots.length && aggregate) {
    briefStatus = briefStatus === "STALE" ? "STALE" : "DEGRADED";
    reasons.push("История reliability ещё прогревается.");
  }
  if (!reasons.length) reasons.push("News aggregate свежий, SLA соблюдён, критических operational blockers нет.");

  return {
    decision,
    briefStatus,
    generatedAt,
    executiveMinimumRole: executiveMinimumRole(),
    aggregate: {
      available: Boolean(aggregate),
      fetchedAt: aggregate?.fetchedAt ?? null,
      ageSeconds: aggregate?.ageSeconds ?? null,
      qualityScore: aggregate?.qualityScore ?? null,
      itemCount: aggregate?.itemCount ?? 0,
      state: aggregate?.state ?? "missing",
      sourceCount: aggregate?.payload.sourceCount ?? 0,
      totalSources: aggregate?.payload.totalSources ?? aggregateBreakdown.length,
    },
    sources: {
      fresh,
      stale,
      error,
      empty,
      total: aggregateBreakdown.length,
      degraded: aggregateBreakdown.filter((item) => item.state === "stale" || item.state === "error").slice(0, 12),
    },
    sla: { maxAgeSeconds: policy.maxAgeSeconds, minQuality: policy.minQuality },
    database,
    migrations,
    reasons,
  };
}
