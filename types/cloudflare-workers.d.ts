/**
 * Minimal ambient declarations for the Cloudflare Workers surface this project
 * actually uses (worker/index.ts and db/index.ts).
 *
 * The runtime types normally come from `@cloudflare/workers-types`, which is not
 * a dependency here. Without them `tsc --noEmit` cannot resolve `Fetcher`,
 * `D1Database` or the `cloudflare:workers` module, so type checking had to be
 * disabled entirely (`tsc --noEmit --noCheck`) and every other type error in the
 * repository was silenced along with it.
 *
 * Keeping these declarations local makes the real type check possible with no
 * new dependency and no lockfile churn. If the project later adopts
 * `@cloudflare/workers-types`, delete this file and use the published types.
 */

interface Fetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

interface D1Database {
  prepare(query: string): unknown;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: unknown[]): Promise<T[]>;
  exec(query: string): Promise<unknown>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    [key: string]: unknown;
  };
}
