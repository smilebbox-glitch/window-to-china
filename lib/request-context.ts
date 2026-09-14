import { randomUUID } from "node:crypto";

export type RequestContext = {
  requestId: string;
  /** Usable as an identity only when `clientIpTrusted` is true; otherwise "unknown". */
  clientIp: string;
  clientIpTrusted: boolean;
  /** Raw forwarded value, for diagnostics. Caller-controlled — never an identity. */
  reportedClientIp: string;
  userAgent: string;
  method: string;
  path: string;
};

const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{8,80}$/u;

function safeHeader(value: string | null, max = 300) {
  return (value ?? "").replace(/[\r\n]/gu, " ").trim().slice(0, max);
}

/**
 * `X-Forwarded-For` is attacker-controlled unless a reverse proxy we trust
 * overwrites it. It used to be read unconditionally, which meant the value fed
 * both the rate-limit bucket key and the `clientIp` recorded in the audit log:
 * rotating the header gave every request a fresh quota and let the caller choose
 * what the audit trail said about them.
 *
 * Set TRUSTED_PROXY=1 only when the app sits behind a proxy that strips and
 * rewrites the header (see deploy/nginx/corporate.conf.template). Otherwise the
 * forwarded address is recorded as untrusted and never used as an identity.
 */
export function trustsForwardedHeaders() {
  const value = process.env.TRUSTED_PROXY?.trim().toLocaleLowerCase("en-US") || "";
  return value === "1" || value === "true" || value === "yes";
}

export function createRequestContext(request: Request): RequestContext {
  const supplied = safeHeader(request.headers.get("x-request-id"), 80);
  const trusted = trustsForwardedHeaders();
  const forwarded = safeHeader(request.headers.get("x-forwarded-for"), 200)
    .split(",")[0]
    ?.trim();
  const realIp = safeHeader(request.headers.get("x-real-ip"), 80);
  const url = new URL(request.url);
  return {
    requestId: REQUEST_ID_RE.test(supplied) ? supplied : randomUUID(),
    clientIp: trusted ? (forwarded || realIp || "unknown") : "unknown",
    clientIpTrusted: trusted && Boolean(forwarded || realIp),
    // Kept for diagnostics only. Never use this as a rate-limit key or as an
    // identity: it is whatever the caller put in the header.
    reportedClientIp: forwarded || realIp || "",
    userAgent: safeHeader(request.headers.get("user-agent"), 300),
    method: request.method.toUpperCase(),
    path: url.pathname,
  };
}

export function contextHeaders(context: RequestContext, values: HeadersInit = {}) {
  const headers = new Headers(values);
  headers.set("x-request-id", context.requestId);
  headers.set("x-content-type-options", "nosniff");
  return headers;
}

export function jsonWithContext(
  context: RequestContext,
  body: unknown,
  init: ResponseInit = {},
) {
  return Response.json(body, {
    ...init,
    headers: contextHeaders(context, init.headers),
  });
}
