import type { Metadata } from "next";
import { BadgeCheck, Layers3, Radio, Radar } from "lucide-react";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { ExecutivePageLens } from "@/components/executive-page-lens";
import { NewsDashboardLive } from "@/components/news-dashboard-live";
import styles from "../executive-pages.module.css";

export const metadata: Metadata = {
  title: "Новости — Окно в Китай",
  description: "Актуальные новости автопрома Китая и России, компании, технологии и регулирование.",
};

export default function NewsPage() {
  return (
    <CorporatePageFrame className={`corporate-page-news ${styles.newsPage}`}>
      <CorporatePageHero
        variant="home"
        kicker="Intelligence Feed"
        title={<>Новости без информационного шума</>}
        subtitle="Свежие материалы из официальных, отраслевых и специализированных источников — с переводом, дедупликацией, приоритетом и понятным происхождением каждого сигнала."
        tagline={<>Сначала важное.<br />Потом остальное.</>}
      />
      <ExecutivePageLens
        label="News intelligence"
        title="Лента для принятия решений, а не для бесконечного чтения"
        description="Страница сохраняет полноту новостного потока, но поднимает наверх свежесть, стратегический фокус и качество источника. Живые KPI ниже остаются кликабельными фильтрами."
        items={[
          { eyebrow: "Поток", title: "Fresh-first", description: "Новые материалы идут раньше исторического контента и резервных снимков.", icon: <Radio className="size-5" />, tone: "green" },
          { eyebrow: "Качество", title: "Без дублей", description: "Кросс-источниковая дедупликация снижает повтор одной и той же новости.", icon: <Layers3 className="size-5" />, tone: "blue" },
          { eyebrow: "Доверие", title: "Source trust", description: "Официальные источники, отраслевые СМИ и оперативные каналы различаются явно.", icon: <BadgeCheck className="size-5" />, tone: "green" },
          { eyebrow: "Фокус", title: "Strategic radar", description: "GWM, SHACMAN, EVOLUTE, VOYAH, Моторинвест и ЭВИА остаются в корпоративном фокусе.", icon: <Radar className="size-5" />, tone: "orange" },
        ]}
      />
      <NewsDashboardLive />
    </CorporatePageFrame>
  );
}
