/**
 * Single source of truth for the version the service reports at runtime.
 *
 * Before this existed, three places each carried their own stale fallback:
 * /api/admin/status answered "1.6.1-pilot", /api/health answered "1.4.0-pilot"
 * and every log line said "1.4.0-pilot" — in a repository already on 1.7.9.
 *
 * The literal below is deliberately not imported from package.json: pulling the
 * manifest into the module graph would risk bundling the dependency list into a
 * client chunk. `scripts/pilot-security-preflight.mjs` fails the build if this
 * value and package.json "version" ever drift apart, so the duplication cannot
 * go unnoticed.
 */
const PACKAGE_VERSION = "1.7.9-pilot";

export const APP_VERSION = process.env.APP_VERSION?.trim() || PACKAGE_VERSION;
