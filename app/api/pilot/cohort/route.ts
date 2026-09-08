import { authorize } from "@/lib/auth";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { enrollPilotSubject, listPilotMembers, pilotCohortName } from "@/lib/pilot-program";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "editor", context.requestId);
  if (auth.response) return auth.response;
  const members = listPilotMembers().map((member) => ({
    participantCode: member.participantCode,
    department: member.department,
    pilotRole: member.pilotRole,
    status: member.status,
    joinedAt: member.joinedAt,
    updatedAt: member.updatedAt,
    keyFingerprint: member.userKey.slice(0, 12),
  }));
  return jsonWithContext(context, { cohort: pilotCohortName(), members }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const context = createRequestContext(request);
  const auth = authorize(request, "admin", context.requestId);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  try {
    const member = enrollPilotSubject({
      subject: typeof body.subject === "string" ? body.subject : "",
      department: typeof body.department === "string" ? body.department : "",
      participantCode: typeof body.participantCode === "string" ? body.participantCode : "",
      pilotRole: body.pilotRole,
      status: body.status,
      cohort: typeof body.cohort === "string" ? body.cohort : undefined,
    });
    return jsonWithContext(context, {
      ok: true,
      member: {
        participantCode: member.participantCode,
        department: member.department,
        pilotRole: member.pilotRole,
        status: member.status,
        cohort: member.cohort,
        keyFingerprint: member.userKey.slice(0, 12),
      },
      privacy: "Raw SSO subject was not stored in pilot_members.",
    }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonWithContext(context, { error: error instanceof Error ? error.message : "Некорректные данные участника." }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
