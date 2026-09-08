import { headers } from "next/headers";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
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
      <CorporatePageFrame>
        <section className="corp-card p-8">
          <p className="corp-kicker !text-[#d03d46]">Executive access control</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#10244f]">Раздел руководства недоступен для текущей роли</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#647b98]">
            Для Executive View требуется роль <strong>{minimum}</strong> или выше. В корпоративном режиме права определяются доверенным reverse proxy и группами SSO.
          </p>
        </section>
      </CorporatePageFrame>
    );
  }

  return (
    <CorporatePageFrame className="corporate-page-executive">
      <CorporatePageHero
        variant="home"
        kicker="Executive Brief"
        title={<>Китайский рынок сегодня — больше возможностей</>}
        subtitle="Краткий управленческий обзор: ключевые изменения, проверенные рыночные факты, риски и стратегические сигналы для руководства."
        tagline={<>Сильные партнёрства.<br />Новые горизонты.</>}
      />
      <ExecutiveBrief />
    </CorporatePageFrame>
  );
}
