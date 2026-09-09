"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, CalendarDays, Command, LayoutGrid, Loader2, Newspaper, Search, Sparkles } from "lucide-react";
import { autoEvents, type NewsItem } from "@/lib/data";
import styles from "@/app/executive-tools.module.css";

const sections = [
  {
    href: "/news",
    title: "Новости",
    description: "Свежие материалы по автопрому Китая и России.",
    keywords: "новости китай россия автопром бренды компании модели геополитика поставки",
  },
  {
    href: "/trucks",
    title: "Коммерческий транспорт",
    description: "Грузовики, тягачи, автобусы, спецтехника и коммерческие бренды.",
    keywords: "грузовики коммерческий транспорт shacman sinotruk sitrak faw foton jac тягач самосвал",
  },
  {
    href: "/market",
    title: "Рынок",
    description: "Продажи, позиции брендов и динамика автомобильного рынка.",
    keywords: "рынок продажи статистика бренды haval gwm автомобили россия китай",
  },
  {
    href: "/analysis",
    title: "Аналитика",
    description: "Доказательный анализ отраслевых сигналов и рисков.",
    keywords: "аналитика анализ rag риски стратегия локализация поставки геополитика",
  },
  {
    href: "/calendar",
    title: "Выставки и события",
    description: "Автосалоны и B2B-выставки в Китае.",
    keywords: "выставки события автосалон b2b китай шанхай пекин гуанчжоу билеты",
  },
  {
    href: "/travel-guide",
    title: "Перед поездкой",
    description: "Практическая информация для командировок в Китай.",
    keywords: "поездка китай приложения документы правила карта связь отели перелет командировка",
  },
] as const;

const QUICK_QUERIES = ["SHACMAN", "GWM локализация", "коммерческий транспорт", "Шанхай выставка", "геополитика"];

type LiveResponse = { news?: NewsItem[] };

function normalize(value: string) {
  return value.toLocaleLowerCase("ru-RU").replace(/\s+/gu, " ").trim();
}

function includesQuery(value: string, query: string) {
  return normalize(value).includes(query);
}

export function GlobalSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialQuery);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => setDraft(initialQuery), [initialQuery]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/news", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as LiveResponse;
        setNews(payload.news ?? []);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setNews([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const query = normalize(initialQuery);

  const sectionResults = useMemo(() => {
    if (!query) return sections;
    return sections.filter((item) => includesQuery(`${item.title} ${item.description} ${item.keywords}`, query));
  }, [query]);

  const eventResults = useMemo(() => {
    if (!query) return [];
    return autoEvents
      .filter((event) => includesQuery(`${event.name} ${event.shortName} ${event.category} ${event.city} ${event.venue} ${event.note}`, query))
      .slice(0, 8);
  }, [query]);

  const newsResults = useMemo(() => {
    if (!query) return [];
    return news
      .filter((item) => includesQuery(`${item.title} ${item.summary} ${item.originalTitle ?? ""} ${item.source} ${item.brand} ${item.market}`, query))
      .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
      .slice(0, 30);
  }, [news, query]);

  const resultCount = sectionResults.length + eventResults.length + newsResults.length;

  function navigate(value: string) {
    const trimmed = value.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(draft);
  }

  return (
    <section className={styles.searchSurface}>
      <div className={styles.searchCommand}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#147efb]">
              <Command className="size-4" /> Intelligence command
            </div>
            <h2 className="mt-2 text-xl font-black tracking-[-0.025em] text-[#10285c] sm:text-2xl">Найдите нужную информацию</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6f86a4]">Бренд, рынок, технология, город, выставка или управленческий вопрос — один запрос проверяет сразу несколько рабочих контуров платформы.</p>
          </div>
          <div className="rounded-full border border-[#dce7f0] bg-white px-3 py-1.5 text-xs font-bold text-[#5c7694] shadow-sm">
            {loading ? "Лента обновляется" : `${news.length} материалов в live-контуре`}
          </div>
        </div>

        <form onSubmit={submit} className="mt-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#6480a4]" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Например: SHACMAN, Haval, Шанхай, локализация, выставка..."
              aria-label="Поиск по сервису"
              autoFocus
              className="h-14 w-full rounded-2xl border border-[#cad9e7] bg-white pl-12 pr-28 text-base font-semibold text-[#142a56] shadow-[0_8px_24px_rgba(24,61,103,.06)] outline-none transition placeholder:font-normal placeholder:text-[#8ea0b8] focus:border-[#2483ff] focus:ring-4 focus:ring-[#2483ff]/10"
            />
            <button type="submit" className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-[#147efb] px-4 text-sm font-black text-white shadow-[0_8px_18px_rgba(20,126,251,.22)] transition hover:bg-[#096fe3]">
              Найти
            </button>
          </label>
        </form>

        <div className={styles.quickQueries} aria-label="Быстрые поисковые запросы">
          <span className="flex items-center gap-1.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#8496aa]"><Sparkles className="size-3.5" /> Быстро:</span>
          {QUICK_QUERIES.map((item) => (
            <button key={item} type="button" className={styles.quickQuery} onClick={() => { setDraft(item); navigate(item); }}>
              {item}
            </button>
          ))}
        </div>

        <div className={styles.searchMetaGrid}>
          <div className={styles.searchMetaCard}><span className={styles.searchMetaLabel}>Покрытие</span><span className={styles.searchMetaValue}>Новости + разделы</span></div>
          <div className={styles.searchMetaCard}><span className={styles.searchMetaLabel}>События</span><span className={styles.searchMetaValue}>Календарь Китая</span></div>
          <div className={styles.searchMetaCard}><span className={styles.searchMetaLabel}>Результаты</span><span className={styles.searchMetaValue}>{query ? resultCount : "После запроса"}</span></div>
        </div>
      </div>

      {!query ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {sections.map((item) => <SectionCard key={item.href} item={item} />)}
        </div>
      ) : (
        <div className="space-y-7 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe9f2] bg-[#f8fbfe] px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7890aa]">Запрос</p>
              <p className="mt-1 font-black text-[#173368]">«{initialQuery}»</p>
            </div>
            <div className="text-sm font-bold text-[#486885]">Найдено: <span className="text-[#147efb]">{resultCount}</span></div>
          </div>

          {sectionResults.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-[#10285c]"><LayoutGrid className="size-5 text-[#147efb]" /> Рабочие разделы</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sectionResults.map((item) => <SectionCard key={item.href} item={item} />)}</div>
            </div>
          )}

          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-[#10285c]"><Newspaper className="size-5 text-[#147efb]" /> Актуальные новости</h2>
            {loading ? (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#e0eaf3] bg-[#f8fbfe] p-4 text-sm text-[#6f86a4]"><Loader2 className="size-4 animate-spin" /> Загружаю актуальную ленту...</div>
            ) : newsResults.length > 0 ? (
              <div className="mt-3 divide-y divide-[#e7eef5] overflow-hidden rounded-2xl border border-[#dfe9f2] bg-white">
                {newsResults.map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group grid gap-3 p-4 transition hover:bg-[#f7fbff] sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center">
                    <span className="min-w-0">
                      <span className="mb-1 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#7890aa]"><span>{item.brand}</span><span>·</span><span>{item.market}</span></span>
                      <span className="block font-black leading-6 text-[#17305f] group-hover:text-[#0878ec]">{item.title}</span>
                      <span className="mt-1 line-clamp-2 block text-sm leading-5 text-[#7186a2]">{item.summary}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2 rounded-xl bg-[#f7fafe] px-3 py-2 text-xs font-bold text-[#657f9b] sm:justify-end"><span className="truncate">{item.source}</span><ArrowUpRight className="size-4 shrink-0 text-[#147efb]" /></span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-[#d8e4ee] bg-[#fbfdff] p-5 text-sm text-[#6f86a4]">По актуальной новостной ленте совпадений нет.</div>
            )}
          </div>

          {eventResults.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-[#10285c]"><CalendarDays className="size-5 text-[#147efb]" /> Выставки и события</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {eventResults.map((event) => (
                  <Link key={event.id} href="/calendar" className="group rounded-2xl border border-[#dfe9f2] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#b9d7f0] hover:shadow-[0_10px_28px_rgba(34,79,118,.08)]">
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#147efb]">{event.category} · {event.city}</span>
                    <span className="mt-2 block font-black leading-6 text-[#10285c]">{event.name}</span>
                    <span className="mt-1 block text-sm leading-5 text-[#7186a2]">{event.note}</span>
                    <span className="mt-3 flex items-center gap-1 text-xs font-black text-[#147efb]">Открыть календарь <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5" /></span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!loading && resultCount === 0 && (
            <div className="rounded-2xl border border-dashed border-[#cad9e6] bg-[#fbfdff] px-5 py-12 text-center">
              <Search className="mx-auto size-8 text-[#9aacbd]" />
              <h2 className="mt-3 font-black text-[#17305f]">Ничего не найдено</h2>
              <p className="mt-1 text-sm text-[#7186a2]">Попробуйте название бренда, модели, города или более короткую формулировку.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SectionCard({ item }: { item: (typeof sections)[number] }) {
  return (
    <Link href={item.href} className="group rounded-2xl border border-[#dfe9f2] bg-[#fbfdff] p-4 transition hover:-translate-y-0.5 hover:border-[#b9d7f0] hover:bg-white hover:shadow-[0_10px_28px_rgba(34,79,118,.08)]">
      <span className="flex items-center justify-between gap-2 font-black text-[#10285c] group-hover:text-[#0878ec]">{item.title}<ArrowUpRight className="size-4 opacity-0 transition group-hover:opacity-100" /></span>
      <span className="mt-1 block text-sm leading-5 text-[#7186a2]">{item.description}</span>
    </Link>
  );
}
