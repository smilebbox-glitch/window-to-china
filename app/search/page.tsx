import type { Metadata } from "next";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { GlobalSearch } from "@/components/global-search";

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
    <CorporatePageFrame className="corporate-page-search">
      <CorporatePageHero
        variant="home"
        kicker="Поиск"
        title={<>Найдите нужную информацию в «Окне в Китай»</>}
        subtitle="Единый поиск по актуальным новостям, брендам, моделям, выставкам и ключевым разделам пилота."
      />
      <GlobalSearch initialQuery={query} />
    </CorporatePageFrame>
  );
}
