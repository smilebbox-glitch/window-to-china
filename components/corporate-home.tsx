"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  Building2,
  Factory,
  Globe2,
  Newspaper,
  Route,
  Ship,
  Sparkles,
  Truck,
} from "lucide-react";
import type { NewsItem } from "@/lib/data";
import { detectFocusEntities } from "@/lib/news-focus";
import { SourceTrustBadge } from "@/components/source-trust-badge";

type NewsResponse = { news?: NewsItem[]; errors?: string[] };

const directionTiles = [
  { label: "Китайский авторынок", note: "Продажи, бренды и технологии", href: "/market", icon: Globe2 },
  { label: "Российский авторынок", note: "Позиции марок и динамика", href: "/market", icon: Building2 },
  { label: "Импорт и экспорт", note: "Поставки и торговые потоки", href: "/analysis", icon: Ship },
  { label: "Локализация", note: "Производство и кооперация", href: "/analysis", icon: Factory },
  { label: "Электромобили", note: "NEV и новые технологии", href: "/news?q=NEV", icon: BatteryCharging },
  { label: "Сотрудничество", note: "Партнёрства и инвестиции", href: "/executive", icon: Sparkles },
] as const;

const focusOrder = ["VOYAH", "EVOLUTE", "Моторинвест", "ЭВИА", "GWM", "SHACMAN"] as const;

function cardAccent(item: NewsItem) {
  const focus = detectFocusEntities(item)[0];
  if (focus === "VOYAH") return "from-[#0f294d] via-[#254e76] to-[#86b8d9]";
  if (focus === "EVOLUTE") return "from-[#e8eef4] via-[#cbd8e3] to-[#8ba8bd]";
  if (focus === "Моторинвест") return "from-[#e8f3ff] via-[#c9e2f6] to-[#8fb7d8]";
  if (focus === "ЭВИА") return "from-[#e8f1fb] via-[#bdd5e8] to-[#789fbe]";
  if (focus === "GWM") return "from-[#dce7ef] via-[#a6bdcd] to-[#557793]";
  return "from-[#d8e9f6] via-[#9cc4df] to-[#477ca1]";
}

export function CorporateHome() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "partial" | "offline">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/news", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18000)]) })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = await response.json() as NewsResponse;
        setNews(payload.news ?? []);
        setStatus(payload.errors?.length ? "partial" : "live");
      })
      .catch(() => setStatus("offline"));
    return () => controller.abort();
  }, []);

  const featured = useMemo(() => {
    const sorted = [...news].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const selected: NewsItem[] = [];
    for (const entity of focusOrder) {
      const item = sorted.find((candidate) => detectFocusEntities(candidate).includes(entity));
      if (item && !selected.some((current) => current.id === item.id)) selected.push(item);
      if (selected.length === 4) break;
    }
    for (const item of sorted) {
      if (selected.length === 4) break;
      if (!selected.some((current) => current.id === item.id)) selected.push(item);
    }
    return selected;
  }, [news]);

  const current = useMemo(() => [...news].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 6), [news]);

  return (
    <main className="px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
      <div className="mx-auto max-w-[1540px] space-y-4">
        <section className="corp-hero corp-hero-home">
          <div className="corp-hero-content">
            <p className="corp-kicker">Окно в Китай</p>
            <h1 className="corp-title">Китай. Автопром.<br />Реальные возможности.</h1>
            <p className="corp-subtitle">Актуальные новости, аналитика и проверенные отраслевые сигналы для стратегических решений в автомобильной индустрии.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/market" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#147efb] px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(20,126,251,.24)] hover:bg-[#096fe3]">Исследовать рынок <ArrowRight className="size-4" /></Link>
              <Link href="/analysis" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/40 bg-white/90 px-4 text-sm font-bold text-[#12305f] hover:bg-white">Рынок и аналитика</Link>
            </div>
          </div>
          <div className="corp-tagline">Ближе к рынку.<br />Дальше вместе.</div>
        </section>

        <section className="corp-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="corp-section-title">Главные новости</h2>
              <p className="mt-1 text-xs text-[#7287a3]">Последние материалы из подключённых источников</p>
            </div>
            <Link href="/news" className="corp-section-link inline-flex items-center gap-1">Все новости <ArrowRight className="size-4" /></Link>
          </div>

          {status === "offline" && <div className="mb-3 rounded-xl border border-[#e6edf4] bg-[#f6f9fc] px-4 py-3 text-sm text-[#6f85a0]">Живая лента временно недоступна. Интерфейс пилота работает, данные обновятся после восстановления источников.</div>}
          {status === "loading" && <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#edf3f8]"><div className="h-full w-1/3 animate-pulse rounded-full bg-[#2587ff]" /></div>}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {featured.map((item) => {
              const focus = detectFocusEntities(item);
              return (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-[#e0eaf3] bg-white transition hover:-translate-y-0.5 hover:border-[#b9d5ef] hover:shadow-[0_12px_30px_rgba(31,77,115,.10)]">
                  <div className={`relative h-28 bg-gradient-to-br ${cardAccent(item)} p-4`}>
                    <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(120deg,transparent_0_45%,white_46%_47%,transparent_48%)]" />
                    <span className="relative text-[11px] font-black uppercase tracking-[.16em] text-white/90">{focus[0] ?? item.brand}</span>
                    <Newspaper className="absolute bottom-4 right-4 size-7 text-white/80" />
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1.5">{focus.slice(0, 2).map((entity) => <span key={entity} className="corp-pill corp-pill-blue">{entity}</span>)}<span className="corp-pill">{item.market}</span></div>
                    <h3 className="mt-3 line-clamp-3 text-[15px] font-black leading-5 text-[#0e285b] group-hover:text-[#0877ec]">{item.title}</h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#7186a2]">{item.summary}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#8a9bb0]"><span>{new Date(item.publishedAt).toLocaleDateString("ru-RU")}</span><span>·</span><span className="font-semibold text-[#607894]">{item.source}</span><SourceTrustBadge sourceType={item.sourceType} compact /></div>
                  </div>
                </a>
              );
            })}
            {featured.length === 0 && Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[290px] animate-pulse rounded-xl border border-[#e2eaf2] bg-[#f1f6fa]" />)}
          </div>
        </section>

        <section className="corp-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-4"><h2 className="corp-section-title">Актуальные направления</h2><Link href="/analysis" className="corp-section-link">Вся аналитика →</Link></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {directionTiles.map((item) => {
              const Icon = item.icon;
              return <Link key={item.label} href={item.href} className="group rounded-xl border border-[#e0eaf3] bg-[#fafdff] p-3 transition hover:border-[#b9d7f0] hover:bg-white hover:shadow-[0_8px_24px_rgba(34,79,118,.07)]"><Icon className="size-5 text-[#1780f7]" /><h3 className="mt-3 text-sm font-black text-[#10285c]">{item.label}</h3><p className="mt-1 text-[11px] leading-4 text-[#7890aa]">{item.note}</p></Link>;
            })}
          </div>
        </section>

        <Link href="/trucks" className="group relative block overflow-hidden rounded-2xl border border-[#cfe0ed] bg-[linear-gradient(90deg,#102a49,#1b466d_55%,#2c6b98)] px-5 py-5 text-white shadow-[0_12px_32px_rgba(29,68,103,.12)] sm:px-7">
          <div className="absolute inset-y-0 right-0 w-[58%] bg-[url('/corporate/hero-trucks.svg')] bg-cover bg-center opacity-55 mix-blend-screen" />
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="grid size-11 place-items-center rounded-xl bg-white/12"><Truck className="size-6" /></span>
            <div><h2 className="text-lg font-black">Коммерческий транспорт</h2><p className="mt-1 text-sm text-[#cfe2f2]">Грузовики, автобусы, спецтехника. Рынки, производители и новые технологии.</p></div>
            <span className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#12305f]">Перейти в раздел <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </div>
        </Link>

        {current.length > 0 && <section className="corp-card p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><h2 className="corp-section-title">Последние обновления</h2><span className={`corp-pill ${status === "partial" ? "" : "corp-pill-green"}`}>{status === "partial" ? "часть источников недоступна" : "лента обновлена"}</span></div><div className="divide-y divide-[#e8eff5]">{current.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="grid gap-2 py-3 text-sm sm:grid-cols-[110px_minmax(0,1fr)_260px] sm:items-center"><span className="text-xs text-[#8295ab]">{new Date(item.publishedAt).toLocaleDateString("ru-RU")}</span><span className="font-bold text-[#17305f] hover:text-[#0878ec]">{item.title}</span><span className="flex flex-wrap items-center justify-end gap-2 text-right text-xs text-[#8295ab]"><span className="max-w-[130px] truncate">{item.source}</span><SourceTrustBadge sourceType={item.sourceType} compact /></span></a>)}</div></section>}
      </div>
    </main>
  );
}
