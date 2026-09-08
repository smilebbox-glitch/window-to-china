import type { Role } from "@/lib/auth";

function normalizeRole(value: string | undefined): Exclude<Role, "none"> {
  const normalized = value?.trim().toLocaleLowerCase("en-US");
  if (normalized === "admin" || normalized === "editor" || normalized === "viewer") return normalized;
  return "viewer";
}

/**
 * Local demo remains accessible to viewer by default. In a controlled corporate
 * pilot set PILOT_CONTROL_MIN_ROLE=admin (or editor) together with AUTH_MODE=proxy.
 */
export function pilotControlMinimumRole() {
  return normalizeRole(process.env.PILOT_CONTROL_MIN_ROLE);
}
