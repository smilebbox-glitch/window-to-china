import { logSecurityEvent } from "@/lib/logger";
import { recordRateLimit } from "@/lib/metrics";
import { trustsForwardedHeaders, type RequestContext } from "@/lib/request-context";

type Bucket = { startedAt: number; count: number };
type Store = Map<string, Bucket>;

const globalRateLimit = globalThis as typeof globalThis & { __oknoRateLimit?: Store };
const store = globalRateLimit.__oknoRateLimit ?? new Map<string, Bucket>();
globalRateLimit.__oknoRateLimit = store;

function clean(now: number, windowMs: number) {
  if (store.size < 5000) return;
  for (const [key, bucket] of store) {
    if (now - bucket.startedAt > windowMs * 2) store.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  /**
   * Which bucket the verdict came from. "client" means the caller was identified
   * (an authenticated actor, or a forwarded address from a trusted proxy).
   * "untrusted-shared" means it was not, so the request counts against a ceiling
   * shared by all anonymous traffic — rotating X-Forwarded-For cannot escape it.
   */
  scope: "client" | "untrusted-shared";
};

function hit(key: string, now: number, windowMs: number) {
  let bucket = store.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    bucket = { startedAt: now, count: 0 };
    store.set(key, bucket);
  }
  bucket.count += 1;
  return bucket;
}

/**
 * How much traffic all untrusted anonymous callers may generate together, as a
 * multiple of the per-client limit. Without a trusted proxy the app cannot tell
 * clients apart at all, so the per-"IP" bucket below is only a fairness hint —
 * this shared ceiling is what an attacker rotating X-Forwarded-For actually hits.
 */
function untrustedGlobalFactor() {
  const value = Number(process.env.RATE_LIMIT_UNTRUSTED_GLOBAL_FACTOR || 10);
  return Number.isFinite(value) && value >= 1 ? value : 10;
}

export function checkRateLimit(args: {
  context: RequestContext;
  scope: string;
  limit: number;
  windowMs?: number;
  actor?: string;
}): RateLimitResult {
  const windowMs = args.windowMs ?? 60_000;
  const now = Date.now();
  const authenticated = Boolean(args.actor);
  const trusted = authenticated || args.context.clientIpTrusted;
  const identity = (args.actor || (args.context.clientIpTrusted ? args.context.clientIp : args.context.reportedClientIp) || "unknown").slice(0, 180);
  const key = `${args.scope}:${trusted ? "" : "untrusted:"}${identity}`;

  const bucket = hit(key, now, windowMs);
  let count = bucket.count;
  let startedAt = bucket.startedAt;
  let effectiveLimit = args.limit;
  let verdictScope: RateLimitResult["scope"] = trusted ? "client" : "untrusted-shared";

  if (!trusted) {
    // A caller who rotates the forwarded header gets a fresh per-"IP" bucket every
    // time, so that bucket alone caps nothing. The shared ceiling does.
    const globalLimit = Math.max(args.limit, Math.ceil(args.limit * untrustedGlobalFactor()));
    const globalBucket = hit(`${args.scope}:untrusted-total`, now, windowMs);
    if (globalBucket.count / globalLimit > count / args.limit) {
      count = globalBucket.count;
      startedAt = globalBucket.startedAt;
      effectiveLimit = globalLimit;
    }
    verdictScope = "untrusted-shared";
  }

  clean(now, windowMs);
  const allowed = count <= effectiveLimit;
  const remaining = Math.max(0, effectiveLimit - count);
  const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - startedAt)) / 1000));
  if (!allowed) {
    recordRateLimit(args.scope);
    logSecurityEvent("rate_limit_exceeded", {
      outcome: "blocked",
      requestId: args.context.requestId,
      actor: identity,
      scope: args.scope,
      path: args.context.path,
      clientIp: args.context.clientIp,
      clientIpTrusted: args.context.clientIpTrusted,
      reportedClientIp: args.context.reportedClientIp,
      limit: args.limit,
      windowMs,
    });
  }
  return { allowed, limit: effectiveLimit, remaining, retryAfterSeconds, scope: verdictScope };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    // Makes it visible from outside whether the caller was actually identified,
    // instead of leaving "is this per-client or shared?" to be inferred.
    "x-ratelimit-scope": result.scope,
    ...(result.allowed ? {} : { "retry-after": String(result.retryAfterSeconds) }),
  };
}

export function rateLimitPolicy() {
  return {
    implementation: "in-process-fixed-window",
    note: "Pilot single-instance limiter. Use a shared store/gateway limiter before multi-instance scale-out.",
    trustedProxy: trustsForwardedHeaders(),
    untrustedGlobalFactor: untrustedGlobalFactor(),
    defaults: {
      readPerMinute: Number(process.env.RATE_LIMIT_READ_PER_MINUTE || 120),
      expensivePerMinute: Number(process.env.RATE_LIMIT_EXPENSIVE_PER_MINUTE || 20),
      adminMutationPerFiveMinutes: Number(process.env.RATE_LIMIT_ADMIN_MUTATION_PER_5_MIN || 30),
    },
  };
}
