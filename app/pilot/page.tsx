import { headers } from "next/headers";
import { hasRole, resolvePrincipal } from "@/lib/auth";
import { PilotControl } from "@/components/pilot-control";
import { PilotFeedback } from "@/components/pilot-feedback";

export const dynamic = "force-dynamic";

export default async function PilotPage() {
  const incoming = await headers();
  const request = new Request("http://internal/pilot", { headers: Object.fromEntries(incoming.entries()) });
  const principal = resolvePrincipal(request);
  if (hasRole(principal, "editor")) return <PilotControl canAdmin={hasRole(principal, "admin")} />;
  return <PilotFeedback />;
}
