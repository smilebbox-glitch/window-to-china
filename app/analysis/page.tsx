import { BriefcaseBusiness, DatabaseZap, SearchCheck, ShieldCheck } from "lucide-react";
import { AnalysisWorkbenchLive } from "@/components/analysis-workbench-live";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { ExecutivePageLens } from "@/components/executive-page-lens";
import { IntelligenceBrief } from "@/components/intelligence-brief";
import styles from "../executive-pages.module.css";

export default function AnalysisPage() {
  return (
    <CorporatePageFrame className={`corporate-page-analysis ${styles.analysisPage}`}>
      <CorporatePageHero
        variant="home"
        kicker="Decision Intelligence"
        title={<>Аналитика, которая приводит к следующему действию</>}
        subtitle="Сопоставляем новости, рынок, технологии, регулирование и корпоративную значимость — с доказательной базой и понятными выводами для руководства, R&D, закупок, производства и логистики."
        tagline={<>Доказательства.<br />Риски. Действия.</>}
      />
      <ExecutivePageLens
        label="Analysis workspace"
        title="Сначала доказательства — потом вывод"
        description="Рабочая зона объединяет ранжирование сигналов и доказательный анализ. Система должна показывать ограничение данных вместо уверенного предположения и сохранять связь вывода с исходными материалами."
        items={[
          { eyebrow: "Основа", title: "Evidence first", description: "Вывод формируется поверх текущего корпуса материалов и рыночных фактов.", icon: <DatabaseZap className="size-5" />, tone: "green" },
          { eyebrow: "Поиск", title: "Source-linked", description: "Ключевые тезисы сохраняют связь с доказательствами и первичными материалами.", icon: <SearchCheck className="size-5" />, tone: "blue" },
          { eyebrow: "Аудитория", title: "Business impact", description: "Руководство, R&D, закупки, производство и логистика видят разную значимость одного сигнала.", icon: <BriefcaseBusiness className="size-5" />, tone: "orange" },
          { eyebrow: "Контроль", title: "No guess", description: "При слабой доказательной базе интерфейс сообщает об ограничении, а не маскирует его.", icon: <ShieldCheck className="size-5" />, tone: "red" },
        ]}
      />
      <IntelligenceBrief />
      <AnalysisWorkbenchLive />
    </CorporatePageFrame>
  );
}
