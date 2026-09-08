import type { Metadata } from "next";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { MarketDashboard } from "@/components/market-dashboard";

export const metadata: Metadata = {
  title: "Рынок — Окно в Китай",
  description: "Рыночные данные по автомобильным маркам России и Китая.",
};

export default function MarketPage() {
  return (
    <CorporatePageFrame className="corporate-page-market">
      <CorporatePageHero
        variant="home"
        kicker="Рынок и бренды"
        title={<>Автомобильный рынок России и Китая</>}
        subtitle="Проверенные данные, динамика продаж, позиции брендов и факторы, которые меняют автомобильный рынок."
        tagline={<>Данные для решений.<br />Не шум.</>}
      />
      <MarketDashboard />
    </CorporatePageFrame>
  );
}
