import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { TruckRadar } from "@/components/truck-radar";

export default function TrucksPage() {
  return (
    <CorporatePageFrame className="corporate-page-trucks">
      <CorporatePageHero
        variant="trucks"
        kicker="Коммерческий транспорт"
        title={<>Грузовой радар</>}
        subtitle="Актуальная аналитика и проверенные сигналы по китайским и российским грузовикам: HCV, MCV, LCV, технологии, локализация и поставки."
        tagline={<>Китай ↔ Россия.<br />Рынки и технологии.</>}
      />
      <TruckRadar />
    </CorporatePageFrame>
  );
}
