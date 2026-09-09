import type { Metadata } from "next";
import { CalendarSearch, Radar, SearchCheck, Sparkles } from "lucide-react";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { ExecutivePageLens } from "@/components/executive-page-lens";
import { GlobalSearch } from "@/components/global-search";
import styles from "../executive-tools.module.css";

export const metadata: Metadata = {
  title: "Поиск — Окно в Китай",
  description: "Поиск по новостям, компаниям, моделям, выставкам и разделам корпоративного пилота.",
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() ?? "";

  return (
    <CorporatePageFrame className={`corporate-page-search ${styles.searchPage}`}>
      <CorporatePageHero
        variant="home"
        kicker="Intelligence Search"
        title={<>Найдите сигнал, факт или событие за несколько секунд</>}
        subtitle="Единый поиск по актуальным новостям, брендам, моделям, выставкам и ключевым разделам MGC China Automotive Intelligence."
        tagline={<>Один запрос.<br />Весь контекст.</>}
      />
      <ExecutivePageLens
        label="Search intelligence"
        title="Поиск по рабочему контексту, а не только по заголовкам"
        description="Запрос одновременно проверяет живую новостную ленту, ключевые разделы платформы и календарь отраслевых событий. Результаты разделены по типу, чтобы быстрее перейти к действию."
        items={[
          { eyebrow: "Новости", title: "Live feed", description: "Поиск проходит по текущей новостной ленте, брендам, рынкам и источникам.", icon: <Radar className="size-5" />, tone: "blue" },
          { eyebrow: "Контекст", title: "Cross-section", description: "Система находит подходящий рабочий раздел даже без точного знания навигации.", icon: <SearchCheck className="size-5" />, tone: "green" },
          { eyebrow: "События", title: "China events", description: "Выставки и B2B-события ищутся по названию, городу, площадке и категории.", icon: <CalendarSearch className="size-5" />, tone: "orange" },
          { eyebrow: "Скорость", title: "Quick query", description: "Популярные управленческие запросы доступны как быстрые стартовые сценарии.", icon: <Sparkles className="size-5" />, tone: "red" },
        ]}
      />
      <GlobalSearch initialQuery={query} />
    </CorporatePageFrame>
  );
}
