import type { Metadata } from "next";
import { NewsDashboardLive } from "@/components/news-dashboard-live";

export const metadata: Metadata = {
  title: "Новости — Окно в Китай",
  description: "Актуальные новости автопрома Китая и России, компании, технологии и регулирование.",
};

export default function NewsPage() {
  return <NewsDashboardLive />;
}
