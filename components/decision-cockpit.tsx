"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Crosshair,
  Database,
  RefreshCw,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import type { NewsItem } from "@/lib/data";
import { rankNews, type RankedNewsItem } from "@/lib/intelligence-ranking";
import {
  decisionMarketMetrics,
  marketDataMethodology,
  russiaHcvJuly2026Brands,
  russiaHcvJuly2026Source,
  type DecisionMarketMetric,
} from "@/lib/decision-market-data";

const number = new Intl.NumberFormat("ru-RU");

type NewsResponse = { news: NewsItem[]; errors?: string[]; updatedAt?: string };

type Status = "live" | "partial" | "offline";

export function DecisionCockpit() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<Status>("live");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/news", { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error("news load failed");
      const payload = await response.json() as NewsResponse;
      setNews(payload.news || []);
      setStatus(payload.errors?.length ? "partial" : "live");
    } catch {
      setStatus("offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ranked = useMemo(() => rankNews(news), [news]);
  const corporateSignals = ranked.filter((item) => effectiveScore(item) >= 45).slice(0, 8);
  const criticalCount = ranked.filter((item) => effectiveScore(item) >= 72).length;
  const highCount = ranked.filter((item) => effectiveScore(item) >= 60 && effectiveScore(item) < 72).length;
  const truckCount = ranked.filter((item) => Boolean(item.commercialVehicle) && effectiveScore(item) >= 45).length;

  const audienceCounts = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of corporateSignals) {
      const audiences = item.commercialVehicle?.audiences ?? item.intelligence.audiences;
      for (const audience of audiences.slice(0, 3)) totals.set(audience.audience, (totals.get(audience.audience) || 0) + 1);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [corporateSignals]);

  return (
    <main className="mgc-surface min-h-[calc(100vh-4rem)] text-zinc-950">
      <div className="mx-auto max-w-[1560px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <section className="overflow-hidden border border-zinc-300 bg-white shadow-[0_18px_60px_rgba(18,24,35,0.08)]">
          <div className="grid xl:grid-cols-[minmax(0,1fr)_520px]">
            <div className="bg-[#101114] p-7 text-white sm:p-9">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#7d9aff]"><Crosshair className="size-4" /> v1.7.2 · Corporate Decision Cockpit</div>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">Общие сигналы компании — без персонального Watchlist</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">Единый рейтинг значимости для руководства, R&D, закупок, производства и логистики. Приоритет определяется business score, а не пользовательскими настройками.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.08em]">
                <StatusBadge status={status} />
                <span className="border border-white/10 px-3 py-2 text-zinc-300">{news.length} материалов в индексе</span>
                <span className="border border-white/10 px-3 py-2 text-zinc-300">корпоративный порог 45/100</span>
              </div>
            </div>
            <div className="grid grid-cols-2 bg-[#eef1f6] sm:grid-cols-4 xl:grid-cols-2">
              <HeroMetric label="Критично" value={criticalCount} note="score ≥ 72" icon={AlertTriangle} />
              <HeroMetric label="Высокий" value={highCount} note="score 60–71" icon={Crosshair} />
              <HeroMetric label="Truck signals" value={truckCount} note="HCV / MCV / LCV" icon={Truck} />
              <HeroMetric label="Market facts" value={decisionMarketMetrics.length} note="с источником и периодом" icon={Database} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <section className="border border-zinc-300 bg-white">
              <div className="flex items-end justify-between gap-4 border-b border-zinc-200 p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#285fff]">Corporate Priority Feed</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Главные сигналы для компании</h2>
                </div>
                <button type="button" onClick={() => void load()} className="grid size-10 place-items-center border border-zinc-300 text-zinc-500 hover:text-[#285fff]" title="Обновить">
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="divide-y divide-zinc-200">
                {corporateSignals.length ? corporateSignals.map((item) => <SignalRow key={item.id} item={item} />) : <p className="p-6 text-sm text-zinc-500">Сигналов с business score ≥ 45 пока нет.</p>}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#285fff]">Market Data</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Цифры отдельно от новостей</h2></div>
                <a href="/market" className="text-sm font-bold text-[#285fff] hover:underline">Полный рынок →</a>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{decisionMarketMetrics.map((metric) => <MarketFact key={metric.id} metric={metric} />)}</div>
            </section>

            <section className="border border-zinc-300 bg-white">
              <div className="border-b border-zinc-200 p-5"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#285fff]"><Truck className="size-4" /> HCV Snapshot</p><h2 className="mt-2 text-xl font-black">Россия · июль 2026</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase tracking-[0.08em] text-zinc-500"><tr><th className="px-5 py-3">Бренд</th><th className="px-4 py-3">Происхождение</th><th className="px-4 py-3">Продажи</th><th className="px-5 py-3">YoY</th></tr></thead>
                  <tbody>{russiaHcvJuly2026Brands.map((row) => <tr key={row.brand} className="border-t border-zinc-200"><td className="px-5 py-3 font-black">{row.brand}</td><td className="px-4 py-3 text-zinc-500">{row.origin}</td><td className="px-4 py-3 font-bold tabular-nums">{number.format(row.units)}</td><td className="px-5 py-3"><Trend value={row.yoy} /></td></tr>)}</tbody>
                </table>
              </div>
              <div className="border-t border-zinc-200 p-4 text-xs text-zinc-500">Источник: <a href={russiaHcvJuly2026Source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#285fff] hover:underline">{russiaHcvJuly2026Source.label}</a> · {russiaHcvJuly2026Source.date}</div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="border border-zinc-300 bg-[#101114] p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7d9aff]">Единая шкала</p>
              <div className="mt-4 space-y-3 text-sm">
                <PriorityRule label="Критично" range="72–100" note="эскалация руководству и ответственным функциям" />
                <PriorityRule label="Высокий приоритет" range="60–71" note="проверить влияние и назначить владельца" />
                <PriorityRule label="Наблюдение" range="45–59" note="держать в корпоративном радаре" />
                <PriorityRule label="Фон" range="0–44" note="не перегружать основной Decision Cockpit" />
              </div>
            </section>

            <section className="border border-zinc-300 bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500"><Users className="size-4" /> Затронутые функции</p>
              <div className="mt-4 space-y-3">{audienceCounts.length ? audienceCounts.map(([name, count]) => <div key={name} className="flex items-center justify-between border-b border-zinc-100 pb-2 text-sm"><span className="font-semibold">{name}</span><span className="font-black tabular-nums text-[#285fff]">{count}</span></div>) : <p className="text-sm text-zinc-500">Нет сигналов выше корпоративного порога.</p>}</div>
            </section>

            <section className="border border-zinc-300 bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500"><ShieldCheck className="size-4" /> Методология</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">{marketDataMethodology.map((item) => <li key={item}>• {item}</li>)}</ul>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function effectiveScore(item: RankedNewsItem) {
  return item.commercialVehicle?.score ?? item.intelligence.score;
}

function SignalRow({ item }: { item: RankedNewsItem }) {
  const score = effectiveScore(item);
  const assessment = item.commercialVehicle ?? item.intelligence;
  return (
    <article className="grid gap-4 p-5 lg:grid-cols-[90px_minmax(0,1fr)_220px]">
      <div><div className={`grid size-16 place-items-center border text-xl font-black ${score >= 72 ? "border-red-300 bg-red-50 text-red-700" : score >= 60 ? "border-orange-300 bg-orange-50 text-orange-700" : "border-blue-200 bg-blue-50 text-[#285fff]"}`}>{score}</div><p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">business score</p></div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500"><span>{item.market}</span><span>·</span><span>{item.brand}</span>{item.commercialVehicle && <><span>·</span><span>{item.commercialVehicle.segment}</span></>}</div>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-lg font-black leading-6 hover:text-[#285fff]">{item.title}</a>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{item.summary}</p>
        <p className="mt-3 text-xs text-zinc-400">{item.source} · {new Date(item.publishedAt).toLocaleDateString("ru-RU")}</p>
      </div>
      <div className="space-y-3 text-xs leading-5">
        <div className="border border-zinc-200 bg-zinc-50 p-3"><p className="font-black uppercase tracking-[0.08em] text-zinc-500">Почему важно</p><p className="mt-1 text-zinc-700">{assessment.whyItMatters}</p></div>
        <div className="border border-blue-200 bg-blue-50 p-3"><p className="font-black uppercase tracking-[0.08em] text-[#285fff]">Что проверить</p><p className="mt-1 text-zinc-700">{assessment.recommendedAction}</p></div>
      </div>
    </article>
  );
}

function MarketFact({ metric }: { metric: DecisionMarketMetric }) {
  return (
    <article className={`border p-5 ${metric.status === "forecast" ? "border-violet-300 bg-violet-50" : "border-zinc-300 bg-white"}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">{metric.geography} · {metric.segment}</p><h3 className="mt-2 font-black">{metric.label}</h3></div><span className={`px-2 py-1 text-[10px] font-black uppercase ${metric.status === "forecast" ? "bg-violet-200 text-violet-900" : "bg-emerald-100 text-emerald-800"}`}>{metric.status === "forecast" ? "Прогноз" : "Факт"}</span></div>
      <p className="mt-4 text-3xl font-black tracking-[-0.04em]">{metric.displayValue}</p>
      <p className="mt-1 text-xs text-zinc-500">{metric.period}{metric.yoy !== undefined ? ` · YoY ${metric.yoy > 0 ? "+" : ""}${metric.yoy}%` : ""}</p>
      <p className="mt-3 text-xs leading-5 text-zinc-600">{metric.note}</p>
      <a href={metric.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block text-xs font-bold text-[#285fff] hover:underline">{metric.sourceLabel} · {metric.sourceDate}</a>
    </article>
  );
}

function HeroMetric({ label, value, note, icon: Icon }: { label: string; value: number; note: string; icon: typeof Building2 }) {
  return <div className="border-b border-r border-zinc-300 p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">{label}</p><Icon className="size-4 text-[#285fff]" /></div><p className="mt-3 text-3xl font-black tracking-[-0.04em]">{number.format(value)}</p><p className="mt-1 text-xs text-zinc-500">{note}</p></div>;
}

function StatusBadge({ status }: { status: Status }) {
  const text = status === "live" ? "LIVE" : status === "partial" ? "PARTIAL" : "OFFLINE";
  const cls = status === "live" ? "border-emerald-500/40 text-emerald-300" : status === "partial" ? "border-orange-500/40 text-orange-300" : "border-red-500/40 text-red-300";
  return <span className={`border px-3 py-2 ${cls}`}>{text}</span>;
}

function PriorityRule({ label, range, note }: { label: string; range: string; note: string }) {
  return <div className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0"><div className="flex items-center justify-between gap-3"><span className="font-black">{label}</span><span className="font-black text-[#7d9aff]">{range}</span></div><p className="mt-1 text-xs leading-5 text-zinc-400">{note}</p></div>;
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  return <span className={`inline-flex items-center gap-1 font-black tabular-nums ${positive ? "text-emerald-700" : "text-red-600"}`}>{positive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}{positive ? "+" : ""}{value.toLocaleString("ru-RU")}%</span>;
}
