"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  Radar,
  Sparkles,
  TrendingUp,
  Truck,
  Zap,
} from "lucide-react";
import { autoEvents, type NewsItem } from "@/lib/data";
import { detectFocusEntities } from "@/lib/news-focus";
import { rankCommercialVehicleNews, rankNews, type RankedNewsItem } from "@/lib/intelligence-ranking";
import { marketBrands, marketTotals } from "@/lib/market-data";
import { BrandLogo } from "@/components/brand-logo";
import { SourceTrustBadge } from "@/components/source-trust-badge";

type NewsResponse = { news?: NewsItem[]; errors?: string[] };

const number = new Intl.NumberFormat("ru-RU");
const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });

function levelTone(item: RankedNewsItem) {
  if (item.intelligence.level === "Критично") return "critical";
  if (item.intelligence.level === "Высокий приоритет") return "high";
  return "watch";
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function CorporateHome() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "partial" | "offline">("loading");
  const [previousVisit, setPreviousVisit] = useState<string | null>(null);
  const [visitReady, setVisitReady] = useState(false);

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

  useEffect(() => {
    const sessionKey = "window-to-china:visit-baseline";
    const storedSession = sessionStorage.getItem(sessionKey);
    if (storedSession !== null) {
      setPreviousVisit(storedSession === "FIRST" ? null : storedSession);
      setVisitReady(true);
      return;
    }

    const lastVisit = localStorage.getItem("window-to-china:last-visit");
    setPreviousVisit(lastVisit);
    sessionStorage.setItem(sessionKey, lastVisit ?? "FIRST");
    localStorage.setItem("window-to-china:last-visit", new Date().toISOString());
    setVisitReady(true);
  }, []);

  const ranked = useMemo(() => rankNews(news), [news]);
  const attention = useMemo(() => ranked.filter((item) => item.intelligence.score >= 64).slice(0, 3), [ranked]);
  const criticalCount = useMemo(() => ranked.filter((item) => item.intelligence.level === "Критично").length, [ranked]);
  const highCount = useMemo(() => ranked.filter((item) => item.intelligence.level === "Высокий приоритет").length, [ranked]);
  const focusCount = useMemo(() => news.filter((item) => detectFocusEntities(item).some((entity) => entity === "GWM" || entity === "SHACMAN")).length, [news]);
  const newSinceVisit = useMemo(() => previousVisit ? news.filter((item) => Date.parse(item.publishedAt) > Date.parse(previousVisit)).length : 0, [news, previousVisit]);
  const truckSignals = useMemo(() => rankCommercialVehicleNews(news).slice(0, 3), [news]);
  const marketLeaders = useMemo(() => marketBrands.filter((item) => item.sales2026Ytd !== null).sort((a, b) => (b.sales2026Ytd ?? 0) - (a.sales2026Ytd ?? 0)).slice(0, 8), []);
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return autoEvents.filter((event) => event.country === "Китай" && event.end >= iso).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3);
  }, []);

  const executiveLead = attention[0];
  const updateLabel = status === "live" ? "Live" : status === "partial" ? "Частично" : status === "offline" ? "Offline" : "Обновление";

  return (
    <main className="px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
      <div className="mx-auto max-w-[1540px] space-y-4">
        <section className="corp-hero corp-hero-home min-h-[220px]">
          <div className="corp-hero-content max-w-[820px] py-8">
            <p className="corp-kicker">MGC · China Automotive Intelligence</p>
            <h1 className="corp-title">Окно в Китай</h1>
            <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white/90 sm:text-2xl">Автопром. Рынки. Реальные возможности.</p>
            <p className="corp-subtitle max-w-[720px]">От новостей к управленческому сигналу: рынок, локализация, коммерческий транспорт, технологии и события Китая в одном корпоративном контуре.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/analysis" className="inline-flex items-center gap-2 rounded-xl bg-[#167df6] px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(22,125,246,.25)] transition hover:bg-[#0f70e6]">Ключевые сигналы <ArrowRight className="size-4" /></Link>
              <Link href="/executive" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15">Executive Brief</Link>
            </div>
          </div>
          <div className="corp-tagline">Точные данные.<br />Быстрые решения.</div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveKpi icon={AlertTriangle} label="Критические сигналы" value={String(criticalCount)} note="требуют внимания" tone="red" />
          <ExecutiveKpi icon={Zap} label="Высокий приоритет" value={String(highCount)} note="в текущей ленте" tone="orange" />
          <ExecutiveKpi icon={Radar} label="GWM + SHACMAN" value={String(focusCount)} note="сигналов в фокусе" tone="blue" />
          <ExecutiveKpi icon={Gauge} label="Рынок 2026" value={compact.format(marketTotals.sales2026Ytd)} note="легковых за янв–июль" tone="green" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]">
          <div className="corp-card overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-[#e4edf5] px-4 py-4 sm:px-5">
              <div>
                <div className="flex items-center gap-2"><AlertTriangle className="size-5 text-[#e44949]" /><h2 className="corp-section-title !text-[20px]">Требует внимания</h2></div>
                <p className="mt-1 text-xs text-[#7186a2]">Ранжирование по влиянию на руководство, производство, закупки, R&D и логистику</p>
              </div>
              <Link href="/analysis" className="corp-section-link inline-flex items-center gap-1">Все сигналы <ArrowRight className="size-4" /></Link>
            </div>

            <div className="divide-y divide-[#e8eff5]">
              {attention.map((item) => {
                const tone = levelTone(item);
                const focus = detectFocusEntities(item);
                return (
                  <article key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[62px_minmax(0,1fr)_auto] sm:items-center sm:px-5">
                    <div className={`executive-score executive-score-${tone}`}>{item.intelligence.score}</div>
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={`executive-priority executive-priority-${tone}`}>{item.intelligence.level}</span>
                        {focus.slice(0, 2).map((entity) => <span key={entity} className="corp-pill !min-h-5 !px-2 !text-[10px]">{entity}</span>)}
                        <span className="text-[10px] text-[#8a9bb0]">{dateTime(item.publishedAt)}</span>
                      </div>
                      <a href={item.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-[15px] font-black leading-5 text-[#112b5b] transition hover:text-[#147efb]">{item.title}</a>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6f84a0]">{item.intelligence.whyItMatters}</p>
                    </div>
                    <Link href="/analysis" className="hidden rounded-xl border border-[#dce8f3] bg-[#f7faff] px-3 py-2 text-xs font-bold text-[#17416f] transition hover:border-[#b9d8f5] hover:bg-white sm:inline-flex">Разобрать</Link>
                  </article>
                );
              })}

              {attention.length === 0 && status === "loading" && <div className="h-[260px] animate-pulse bg-[#f3f7fb]" />}
              {attention.length === 0 && status !== "loading" && <div className="px-5 py-10 text-center text-sm text-[#7186a2]">Приоритетные сигналы появятся после обновления новостной ленты.</div>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <section className="executive-change-card">
              <div className="flex items-center gap-2 text-[#0e4e9b]"><TrendingUp className="size-5" /><h2 className="text-lg font-black tracking-[-0.02em]">Что изменилось с вашего визита</h2></div>
              {visitReady && previousVisit ? (
                <>
                  <div className="mt-5 flex items-end gap-3"><span className="text-5xl font-black tracking-[-0.05em] text-[#0c8a64]">+{newSinceVisit}</span><span className="pb-1 text-sm font-semibold text-[#5f7896]">новых материалов</span></div>
                  <p className="mt-3 text-xs leading-5 text-[#7186a2]">Последний визит: {new Date(previousVisit).toLocaleString("ru-RU")}. Сервис отмечает публикации, появившиеся после него.</p>
                </>
              ) : (
                <>
                  <div className="mt-5 flex items-center gap-3"><CheckCircle2 className="size-9 text-[#0c8a64]" /><span className="text-lg font-black text-[#15345f]">Базовая точка сохранена</span></div>
                  <p className="mt-3 text-xs leading-5 text-[#7186a2]">Это первый визит на этом устройстве. При следующем входе здесь появится число новых материалов.</p>
                </>
              )}
              <Link href="/news" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#147efb]">Посмотреть изменения <ArrowRight className="size-4" /></Link>
            </section>

            <section className="executive-brief-card">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Sparkles className="size-5 text-[#147efb]" /><h2 className="text-lg font-black tracking-[-0.02em] text-[#102a58]">Executive Brief</h2></div><span className="corp-pill corp-pill-blue">{updateLabel}</span></div>
              {executiveLead ? (
                <>
                  <p className="mt-4 text-sm font-bold leading-6 text-[#244568]">Главный сигнал сейчас: {executiveLead.title}</p>
                  <p className="mt-2 text-xs leading-5 text-[#6d83a0]">{executiveLead.intelligence.recommendedAction}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">{executiveLead.intelligence.signals.slice(0, 3).map((signal) => <span key={signal} className="corp-pill">{signal}</span>)}</div>
                </>
              ) : <p className="mt-4 text-sm leading-6 text-[#6d83a0]">После загрузки ленты здесь появится краткий управленческий вывод по наиболее важному сигналу.</p>}
              <Link href="/executive" className="mt-5 inline-flex w-full items-center justify-between rounded-xl border border-[#cfe1f2] bg-[#f7fbff] px-4 py-3 text-sm font-black text-[#10417a]">Полный brief <ArrowRight className="size-4" /></Link>
            </section>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(310px,.75fr)]">
          <div className="corp-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4edf5] px-4 py-4 sm:px-5">
              <div><h2 className="corp-section-title !text-[20px]">Продажи автомобилей в России</h2><p className="mt-1 text-xs text-[#7186a2]">Январь–июль 2026 · логотипы брендов · фокус на китайских марках</p></div>
              <Link href="/market" className="corp-section-link inline-flex items-center gap-1">Полная статистика <ArrowRight className="size-4" /></Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f5f9fd] text-[10px] font-black uppercase tracking-[.08em] text-[#7890aa]"><tr><th className="px-5 py-3">Бренд</th><th className="px-4 py-3">Продажи</th><th className="px-4 py-3">Динамика</th><th className="px-4 py-3">Страна</th><th className="px-5 py-3">Сигнал</th></tr></thead>
                <tbody className="divide-y divide-[#e8eff5]">
                  {marketLeaders.map((item) => (
                    <tr key={item.brand} className="transition hover:bg-[#f8fbfe]">
                      <td className="px-5 py-3"><BrandLogo brand={item.brand} size="sm" showName /></td>
                      <td className="px-4 py-3 font-black tabular-nums text-[#17345f]">{number.format(item.sales2026Ytd ?? 0)}</td>
                      <td className={`px-4 py-3 font-black tabular-nums ${(item.yoy2026 ?? 0) >= 0 ? "text-[#0a8f65]" : "text-[#d43e49]"}`}>{item.yoy2026 === null ? "—" : `${item.yoy2026 >= 0 ? "+" : ""}${item.yoy2026.toLocaleString("ru-RU")}%`}</td>
                      <td className="px-4 py-3 text-xs text-[#6f84a0]">{item.origin}</td>
                      <td className="max-w-[290px] px-5 py-3 text-xs leading-5 text-[#607995]">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <section className="corp-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Truck className="size-5 text-[#147efb]" /><h2 className="text-lg font-black text-[#102a58]">Truck Radar</h2></div><Link href="/trucks" className="corp-section-link">Открыть →</Link></div>
              <div className="mt-4 space-y-3">
                {truckSignals.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-[#e1ebf4] bg-[#f9fcff] p-3 transition hover:border-[#bfd9f0] hover:bg-white"><div className="flex items-center gap-2"><span className="executive-score executive-score-watch !size-8 !text-xs">{item.commercialVehicle.score}</span><span className="text-[10px] font-black uppercase tracking-[.08em] text-[#7186a2]">{item.commercialVehicle.segment}</span></div><p className="mt-2 line-clamp-2 text-sm font-black leading-5 text-[#17345f]">{item.title}</p></a>)}
                {truckSignals.length === 0 && <p className="text-xs leading-5 text-[#7186a2]">Грузовые сигналы появятся после загрузки ленты.</p>}
              </div>
            </section>

            <section className="corp-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-[#147efb]" /><h2 className="text-lg font-black text-[#102a58]">Ближайшие события</h2></div><Link href="/calendar" className="corp-section-link">Все →</Link></div>
              <div className="mt-4 divide-y divide-[#e8eff5]">
                {upcomingEvents.map((event) => <a key={event.id} href={event.url} target="_blank" rel="noreferrer" className="block py-3 first:pt-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black leading-5 text-[#17345f]">{event.shortName}</p><p className="mt-1 text-xs text-[#7186a2]">{event.city} · {new Date(`${event.start}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</p></div>{event.priority === "high" && <span className="executive-priority executive-priority-high">priority</span>}</div></a>)}
              </div>
            </section>
          </div>
        </section>

        <section className="corp-card flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2 text-xs text-[#69809e]"><Clock3 className="size-4" /><span>{status === "loading" ? "Обновляем ленту…" : status === "offline" ? "Живая лента временно недоступна" : status === "partial" ? "Часть источников временно недоступна" : `Загружено материалов: ${news.length}`}</span></div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link href="/travel-guide" className="rounded-xl border border-[#d9e6f1] bg-white px-3 py-2 text-xs font-bold text-[#234a75] hover:bg-[#f6faff]">Подготовиться к поездке</Link>
            <Link href="/analysis" className="rounded-xl border border-[#d9e6f1] bg-white px-3 py-2 text-xs font-bold text-[#234a75] hover:bg-[#f6faff]">Открыть аналитику</Link>
            <Link href="/market" className="rounded-xl bg-[#0e315c] px-3 py-2 text-xs font-black text-white hover:bg-[#0a274c]">Рынок и продажи</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function ExecutiveKpi({ icon: Icon, label, value, note, tone }: { icon: typeof Gauge; label: string; value: string; note: string; tone: "red" | "orange" | "blue" | "green" }) {
  return (
    <article className={`executive-kpi executive-kpi-${tone}`}>
      <div className="flex items-center justify-between gap-3"><span className={`executive-kpi-icon executive-kpi-icon-${tone}`}><Icon className="size-5" /></span><ArrowRight className="size-4 opacity-35" /></div>
      <div className="mt-3 flex items-end gap-3"><p className="text-4xl font-black tracking-[-0.05em] text-[#102a58]">{value}</p><p className="pb-1 text-xs font-semibold text-[#7186a2]">{note}</p></div>
      <p className="mt-2 text-xs font-black uppercase tracking-[.08em] text-[#4f6a89]">{label}</p>
    </article>
  );
}
