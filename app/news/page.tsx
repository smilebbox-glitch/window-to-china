import type { Metadata } from "next";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { NewsDashboardLive } from "@/components/news-dashboard-live";

export const metadata: Metadata = {
  title: "Новости — Окно в Китай",
  description: "Актуальные новости автопрома Китая и России, компании, технологии и регулирование.",
};

export default function NewsPage() {
  return (
    <CorporatePageFrame className="corporate-page-news">
      <CorporatePageHero
        variant="home"
        kicker="Новости"
        title={<>Автопром Китая и России — без информационного шума</>}
        subtitle="Свежие материалы из официальных, отраслевых и специализированных источников с переводом, дедупликацией и корпоративным приоритетом."
        tagline={<>Проверенные источники.<br />Одна понятная лента.</>}
      />
      <NewsDashboardLive />
    </CorporatePageFrame>
  );
}
