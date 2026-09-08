import { AnalysisWorkbenchLive } from "@/components/analysis-workbench-live";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { IntelligenceBrief } from "@/components/intelligence-brief";

export default function AnalysisPage() {
  return (
    <CorporatePageFrame className="corporate-page-analysis">
      <CorporatePageHero
        variant="home"
        kicker="Рынок и аналитика"
        title={<>Аналитика и сигналы автомобильного рынка</>}
        subtitle="Сопоставляем новости, рынок, технологии, регулирование и корпоративную значимость — с понятными выводами для R&D, закупок, производства и логистики."
        tagline={<>Данные создают<br />новые возможности.</>}
      />
      <IntelligenceBrief />
      <AnalysisWorkbenchLive />
    </CorporatePageFrame>
  );
}
