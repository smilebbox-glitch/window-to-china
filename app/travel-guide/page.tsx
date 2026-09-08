import type { Metadata } from "next";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { TravelGuide } from "@/components/travel-guide";

export const metadata: Metadata = {
  title: "Перед поездкой — Окно в Китай",
  description: "Документы, приложения, оплата, связь и правила для деловой поездки в Китай.",
};

export default function TravelGuidePage() {
  return (
    <CorporatePageFrame className="corporate-page-travel">
      <CorporatePageHero
        variant="travel"
        kicker="Перед поездкой"
        title={<>Подготовка к деловой поездке в Китай</>}
        subtitle="Документы, оплата, связь, приложения, таможенные правила и деловой этикет — без лишних чек-листов и дублирующих блоков."
        tagline={<>Подготовка заранее.<br />Работа без сюрпризов.</>}
      />
      <TravelGuide />
    </CorporatePageFrame>
  );
}
