import type { Metadata } from "next";
import { BadgeCheck, CreditCard, PlaneTakeoff, Smartphone } from "lucide-react";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { ExecutivePageLens } from "@/components/executive-page-lens";
import { TravelGuide } from "@/components/travel-guide";
import styles from "../executive-tools.module.css";

export const metadata: Metadata = {
  title: "Перед поездкой — Окно в Китай",
  description: "Документы, приложения, оплата, связь и правила для деловой поездки в Китай.",
};

export default function TravelGuidePage() {
  return (
    <CorporatePageFrame className={`corporate-page-travel ${styles.travelPage}`}>
      <CorporatePageHero
        variant="travel"
        kicker="Business Travel Intelligence"
        title={<>Деловая поездка в Китай без организационных сюрпризов</>}
        subtitle="Документы, оплата, приложения, связь, багаж, официальные ограничения и деловой этикет — в одном рабочем контуре подготовки."
        tagline={<>Готовность до вылета.<br />Фокус после прилёта.</>}
      />
      <ExecutivePageLens
        label="Travel readiness"
        title="Не чек-лист ради чек-листа — контроль готовности к поездке"
        description="Раздел помогает закрыть базовые риски до вылета: проверить въезд, настроить оплату и приложения, подготовить документы и не потерять рабочее время уже в Китае."
        items={[
          { eyebrow: "Документы", title: "Entry ready", description: "Ключевые документы и правила въезда собраны рядом с официальными ссылками для проверки перед поездкой.", icon: <BadgeCheck className="size-5" />, tone: "green" },
          { eyebrow: "Оплата", title: "Payment ready", description: "Alipay, WeChat Pay, UnionPay и резервные способы оплаты готовятся ещё до вылета.", icon: <CreditCard className="size-5" />, tone: "blue" },
          { eyebrow: "Телефон", title: "China apps", description: "Навигация, такси, отели, перевод и связь собраны с прямыми ссылками на приложения.", icon: <Smartphone className="size-5" />, tone: "orange" },
          { eyebrow: "Поездка", title: "Operational ready", description: "Багаж, ограничения, адреса на китайском и деловой этикет снижают риск потери времени на месте.", icon: <PlaneTakeoff className="size-5" />, tone: "red" },
        ]}
      />
      <TravelGuide />
    </CorporatePageFrame>
  );
}
