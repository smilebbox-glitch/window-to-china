"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, CalendarDays, LayoutGrid, Loader2, Newspaper, Search } from "lucide-react";
import { autoEvents, type NewsItem } from "@/lib/data";

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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  return (
    <section className="corp-card overflow-hidden">
      <form onSubmit={submit} className="border-b border-[#dfe9f2] bg-white p-4 sm:p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#6480a4]" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Например: SHACMAN, Haval, Шанхай, локализация, выставка..."
            aria-label="Поиск по сервису"
            autoFocus
            className="h-12 w-full rounded-xl border border-[#cedcea] bg-[#f7fafc] pl-12 pr-28 text-base font-semibold text-[#142a56] outline-none transition placeholder:font-normal placeholder:text-[#8ea0b8] focus:border-[#2483ff] focus:bg-white focus:ring-4 focus:ring-[#2483ff]/10"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-[#147efb] px-4 text-sm font-bold text-white hover:bg-[#096fe3]">
            Найти
          </button>
        </label>
        {query ? <p className="mt-3 text-sm font-semibold text-[#5f7795]">Найдено: {resultCount}</p> : <p className="mt-3 text-sm text-[#6f86a4]">Введите бренд, модель, тему, город или название выставки.</p>}
      </form>

      {!query ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {sections.map((item) => <SectionCard key={item.href} item={item} />)}
        </div>
      ) : (
        <div className="space-y-6 p-4 sm:p-5">
          {sectionResults.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-[#10285c]"><LayoutGrid className="size-5 text-[#147efb]" /> Разделы</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sectionResults.map((item) => <SectionCard key={item.href} item={item} />)}</div>
            </div>
          )}

          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-[#10285c]"><Newspaper className="size-5 text-[#147efb]" /> Новости</h2>
            {loading ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#e0eaf3] bg-[#f8fbfe] p-4 text-sm text-[#6f86a4]"><Loader2 className="size-4 animate-spin" /> Загружаю актуальную ленту...</div>
            ) : newsResults.length > 0 ? (
              <div className="mt-3 divide-y divide-[#e7eef5] overflow-hidden rounded-xl border border-[#dfe9f2] bg-white">
                {newsResults.map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group grid gap-2 p-4 transition hover:bg-[#f7fbff] sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center">
                    <span className="min-w-0">
                      <span className="block font-bold leading-6 text-[#17305f] group-hover:text-[#0878ec]">{item.title}</span>
                      <span className="mt-1 line-clamp-2 block text-sm leading-5 text-[#7186a2]">{item.summary}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2 text-xs text-[#8295ab] sm:justify-end"><span>{item.source}</span><ArrowUpRight className="size-4 shrink-0" /></span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-[#d8e4ee] bg-[#fbfdff] p-5 text-sm text-[#6f86a4]">По актуальной новостной ленте совпадений нет.</div>
            )}
          </div>

          {eventResults.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-[#10285c]"><CalendarDays className="size-5 text-[#147efb]" /> Выставки и события</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {eventResults.map((event) => (
                  <Link key={event.id} href="/calendar" className="rounded-xl border border-[#dfe9f2] bg-white p-4 transition hover:border-[#b9d7f0] hover:shadow-[0_8px_24px_rgba(34,79,118,.07)]">
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#147efb]">{event.category} · {event.city}</span>
                    <span className="mt-2 block font-black leading-6 text-[#10285c]">{event.name}</span>
                    <span className="mt-1 block text-sm leading-5 text-[#7186a2]">{event.note}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!loading && resultCount === 0 && (
            <div className="rounded-xl border border-dashed border-[#cad9e6] bg-[#fbfdff] px-5 py-12 text-center">
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
    <Link href={item.href} className="group rounded-xl border border-[#dfe9f2] bg-[#fbfdff] p-4 transition hover:border-[#b9d7f0] hover:bg-white hover:shadow-[0_8px_24px_rgba(34,79,118,.07)]">
      <span className="font-black text-[#10285c] group-hover:text-[#0878ec]">{item.title}</span>
      <span className="mt-1 block text-sm leading-5 text-[#7186a2]">{item.description}</span>
    </Link>
  );
}
