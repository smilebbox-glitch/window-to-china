import { headers } from "next/headers";
import { PilotControlRoom } from "@/components/pilot-control-room";
import { hasRole, resolvePrincipal } from "@/lib/auth";
import { pilotControlMinimumRole } from "@/lib/pilot-access";

export const dynamic = "force-dynamic";

export default async function PilotPage() {
  const incoming = await headers();
  const request = new Request("http://internal/pilot", { headers: Object.fromEntries(incoming.entries()) });
  const principal = resolvePrincipal(request);
  const minimum = pilotControlMinimumRole();

  if (!hasRole(principal, minimum)) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="border border-red-300 bg-white p-8 shadow-[0_18px_60px_rgba(18,24,35,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Pilot access control</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-zinc-950">Pilot Control Room недоступен для текущей роли</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600">
            Требуется роль <strong>{minimum}</strong> или выше. Текущая роль: <strong>{principal.role}</strong>.
            В controlled corporate pilot рекомендуем ограничить этот экран группой пилот-администраторов через SSO/reverse proxy.
          </p>
        </section>
      </main>
    );
  }

  return <PilotControlRoom canManageIssues={hasRole(principal, "admin")} />;
}
