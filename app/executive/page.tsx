import { headers } from "next/headers";
import { ExecutiveBrief } from "@/components/executive-brief";
import { hasRole, resolvePrincipal } from "@/lib/auth";
import { executiveMinimumRole } from "@/lib/pilot-operations";

export const dynamic = "force-dynamic";

export default async function ExecutivePage() {
  const incoming = await headers();
  const request = new Request("http://internal/executive", { headers: Object.fromEntries(incoming.entries()) });
  const principal = resolvePrincipal(request);
  const minimum = executiveMinimumRole();

  if (!hasRole(principal, minimum)) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="border border-red-300 bg-white p-8 shadow-[0_18px_60px_rgba(18,24,35,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Executive access control</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-zinc-950">Раздел руководства недоступен для текущей роли</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600">
            Для Executive View требуется роль <strong>{minimum}</strong> или выше. Текущая роль: <strong>{principal.role}</strong>.
            В корпоративном режиме права определяются доверенным reverse proxy и группами SSO.
          </p>
          <p className="mt-4 text-xs text-zinc-500">AUTH_MODE={principal.mode} · subject={principal.subject}</p>
        </section>
      </main>
    );
  }

  return <ExecutiveBrief />;
}
