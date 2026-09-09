import { BatteryCharging, Factory, Route, ShieldCheck } from "lucide-react";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { ExecutivePageLens } from "@/components/executive-page-lens";
import { TruckRadar } from "@/components/truck-radar";
import styles from "../executive-pages.module.css";

export default function TrucksPage() {
  return (
    <CorporatePageFrame className={`corporate-page-trucks ${styles.trucksPage}`}>
      <CorporatePageHero
        variant="trucks"
        kicker="Commercial Vehicle Intelligence"
        title={<>Truck Radar · Китай ↔ Россия</>}
        subtitle="Актуальные сигналы по HCV, MCV, LCV, тягачам, самосвалам и спецтехнике — с фокусом на рынок, локализацию, силовые установки, поставки и регуляторные риски."
        tagline={<>Грузовой рынок.<br />Решения по фактам.</>}
      />
      <ExecutivePageLens
        label="Truck intelligence"
        title="От упоминания бренда к операционному сигналу"
        description="Живые KPI ниже показывают реальную структуру текущей ленты. В карточках сохраняются бизнес-важность, сегмент, рынки, силовая установка и следующий вопрос для проверки."
        items={[
          { eyebrow: "Сегменты", title: "HCV · MCV · LCV", description: "Тяжёлые, среднетоннажные и лёгкие грузовики рассматриваются раздельно.", icon: <Factory className="size-5" />, tone: "blue" },
          { eyebrow: "Рынки", title: "China ↔ Russia", description: "Отдельно видны китайские, российские и кросс-рыночные сигналы.", icon: <Route className="size-5" />, tone: "green" },
          { eyebrow: "Технологии", title: "New energy", description: "EV, battery swap, водород и гибридные решения выделяются в грузовом контексте.", icon: <BatteryCharging className="size-5" />, tone: "orange" },
          { eyebrow: "Решение", title: "Почему важно", description: "Каждый сильный сигнал сопровождается рекомендацией, что проверить дальше.", icon: <ShieldCheck className="size-5" />, tone: "red" },
        ]}
      />
      <TruckRadar />
    </CorporatePageFrame>
  );
}
