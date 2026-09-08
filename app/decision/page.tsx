import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { DecisionCockpit } from "@/components/decision-cockpit";

export default function DecisionPage() {
  return (
    <CorporatePageFrame className="corporate-page-decision">
      <CorporatePageHero
        variant="home"
        kicker="Decision Cockpit"
        title={<>Данные. Инсайты. Решения.</>}
        subtitle="Корпоративный обзор ключевых сигналов, рыночных изменений и рисков без персональных Watchlists и лишних статусных карточек."
        tagline={<>Объективная аналитика.<br />Практические выводы.</>}
      />
      <DecisionCockpit />
    </CorporatePageFrame>
  );
}
