import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { resolveUserContext, withUserCookie } from "@/lib/user-context";
import { getPilotMember, pilotCohortEnforcementEnabled, pilotCohortName } from "@/lib/pilot-program";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const user = resolveUserContext(request);
  const member = getPilotMember(user.userKey);
  return jsonWithContext(context, {
    cohort: pilotCohortName(),
    enforcement: pilotCohortEnforcementEnabled(),
    eligible: Boolean(member && (member.status === "active" || member.status === "invited")),
    member: member ? {
      participantCode: member.participantCode,
      department: member.department,
      pilotRole: member.pilotRole,
      status: member.status,
      joinedAt: member.joinedAt,
    } : null,
  }, { headers: withUserCookie(user, { "cache-control": "no-store" }) });
}
