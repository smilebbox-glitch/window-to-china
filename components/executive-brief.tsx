"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarRange,
  FileText,
  Printer,
  RefreshCw,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import type { NewsItem } from "@/lib/data";
import { buildIntelligenceBrief, type BriefPeriod } from "@/lib/intelligence-brief";
import { decisionMarketMetrics } from "@/lib/decision-market-data";
import { SourceTrustBadge } from "@/components/source-trust-badge";

const number = new Intl.NumberFormat("ru-RU");

type NewsResponse = { news: NewsItem[]; errors?: string[]; updatedAt?: string };
type Status = "live" | "partial" | "offline";

export function ExecutiveBrief() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [period, setPeriod] = useState<BriefPeriod>("daily");
  const [status, setStatus] = useState<Status>("live");
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/news", { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error("news load failed");
      const payload = await response.json() as NewsResponse;
      setNews(payload.news || []);
      setGeneratedAt(new Date());
      setStatus(payload.errors?.length ? "partial" : "live");
    } catch {
      setStatus("offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const brief = useMemo(() => buildIntelligenceBrief(news, period, generatedAt), [news, period, generatedAt]);
  const freshFacts = decisionMarketMetrics.filter((metric) => metric.status === "actual").slice(0, 4);

  return (
    <main className="mgc-surface min-h-[calc(100vh-4rem)] text-zinc-950 print:bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9 print:max-w-none print:px-0 print:py-0">
        <section className="overflow-hidden border border-zinc-300 bg-white shadow-[0_18px_60px_rgba(18,24,35,0.08)] print:shadow-none">
          <div className="grid xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="bg-[#101114] p-7 text-white sm:p-9 print:bg-white print:text-black">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#7d9aff] print:text-zinc-500"><FileText className="size-4" /> v1.7.3 · Executive Intelligence Brief</div>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">Управленческий дайджест: что изменилось и что требует решения</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400 print:text-zinc-600">Daily/Weekly brief формируется из общей корпоративной ленты и business score. Персонального Watchlist нет: руководство и функции компании видят одну и ту же базовую картину.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.08em] print:hidden">
                <StatusBadge status={status} />
                <button type="button" onClick={() => setPeriod("daily")} className={`border px-3 py-2 ${period === "daily" ? "border-[#7d9aff] bg-[#285fff] text-white" : "border-white/15 text-zinc-300"}`}>24 часа</button>
                <button type="button" onClick={() => setPeriod("weekly")} className={`border px-3 py-2 ${period === "weekly" ? "border-[#7d9aff] bg-[#285fff] text-white" : "border-white/15 text-zinc-300"}`}>7 дней</button>
                <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-zinc-300 hover:text-white"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Обновить</button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-zinc-300 hover:text-white"><Printer className="size-3.5" /> Печать / PDF</button>
              </div>
              <p className="mt-5 text-xs text-zinc-500 print:text-zinc-500">{brief.periodLabel} · сформировано {new Date(brief.generatedAt).toLocaleString("ru-RU")}</p>
            </div>

            <div className="grid grid-cols-2 bg-[#eef1f6]">
              <Metric label="Критично" value={brief.criticalCount} note="score ≥ 72" icon={AlertTriangle} />
              <Metric label="Высокий" value={brief.highPriorityCount} note="score 60–71" icon={ShieldCheck} />
              <Metric label="Truck signals" value={brief.truckSignalCount} note="score ≥ 45" icon={Truck} />
              <Metric label="Источники" value={brief.sourceCount} note={`${brief.materialCount} материалов`} icon={Building2} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 space-y-6">
            <section className="border border-zinc-300 bg-white p-6">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#285fff]"><CalendarRange className="size-4" /> Executive Summary</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Кратко для руководителя</h2>
              <div className="mt-5 grid gap-3">
                {brief.executiveSummary.map((line, index) => <div key={`${index}-${line}`} className="border-l-4 border-[#285fff] bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700">{line}</div>)}
              </div>
            </section>

            <section className="border border-zinc-300 bg-white">
              <div className="border-b border-zinc-200 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#285fff]">Decision Signals</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Главные события периода</h2>
              </div>
              <div className="divide-y divide-zinc-200">
                {brief.signals.length ? brief.signals.map((signal) => (
                  <article key={signal.id} className="grid gap-4 p-5 lg:grid-cols-[80px_minmax(0,1fr)_260px]">
                    <div>
                      <div className={`grid size-14 place-items-center border text-lg font-black ${signal.score >= 72 ? "border-red-300 bg-red-50 text-red-700" : signal.score >= 60 ? "border-orange-300 bg-orange-50 text-orange-700" : "border-blue-200 bg-blue-50 text-[#285fff]"}`}>{signal.score}</div>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-400">score</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500"><span>{signal.market}</span><span>·</span><span>{signal.brand}</span>{signal.segment && <><span>·</span><span>{signal.segment}</span></>}</div>
                      <a href={signal.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-lg font-black leading-6 hover:text-[#285fff]">{signal.title}</a>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{signal.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">{signal.audiences.map((audience) => <span key={audience} className="border border-zinc-200 px-2 py-1">{audience}</span>)}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400"><span className="font-semibold text-zinc-600">{signal.source}</span><SourceTrustBadge sourceType={signal.sourceType} compact /><span>·</span><span>{new Date(signal.publishedAt).toLocaleString("ru-RU")}</span></div>
                    </div>
                    <div className="space-y-3 text-xs leading-5">
                      <div className="border border-zinc-200 bg-zinc-50 p-3"><p className="font-black uppercase tracking-[0.08em] text-zinc-500">Почему важно</p><p className="mt-1 text-zinc-700">{signal.whyItMatters}</p></div>
                      <div className="border border-blue-200 bg-blue-50 p-3"><p className="font-black uppercase tracking-[0.08em] text-[#285fff]">Что проверить</p><p className="mt-1 text-zinc-700">{signal.recommendedAction}</p></div>
                    </div>
                  </article>
                )) : <div className="p-6 text-sm leading-6 text-zinc-500">За выбранный период нет корпоративных сигналов с business score ≥ 45. Проверьте состояние источников и свежесть агрегированной ленты.</div>}
              </div>
            </section>

            <section>
              <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#285fff]">Market Pulse</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Фактические рыночные ориентиры</h2></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {freshFacts.map((metric) => <article key={metric.id} className="border border-zinc-300 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{metric.geography} · {metric.segment}</p><h3 className="mt-2 text-sm font-black">{metric.label}</h3><p className="mt-3 text-2xl font-black">{metric.displayValue}</p><p className="mt-1 text-xs text-zinc-500">{metric.period}</p><a href={metric.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs font-bold text-[#285fff] hover:underline">{metric.sourceLabel}</a></article>)}
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start print:static">
            <section className="border border-zinc-300 bg-[#101114] p-5 text-white print:bg-white print:text-black">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#7d9aff] print:text-zinc-500"><Users className="size-4" /> Затронутые функции</p>
              <div className="mt-4 space-y-3">
                {brief.audienceCounts.length ? brief.audienceCounts.map((entry) => <div key={entry.audience} className="flex items-center justify-between border-b border-white/10 pb-2 text-sm print:border-zinc-200"><span className="font-semibold">{entry.audience}</span><span className="font-black text-[#7d9aff] print:text-[#285fff]">{entry.count}</span></div>) : <p className="text-sm text-zinc-400 print:text-zinc-600">Нет функций с сигналами выше корпоративного порога.</p>}
              </div>
            </section>

            <section className="border border-zinc-300 bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500"><BarChart3 className="size-4" /> География периода</p>
              <div className="mt-4 space-y-3">
                {Object.entries(brief.marketCounts).sort((a, b) => b[1] - a[1]).map(([market, count]) => <div key={market} className="flex items-center justify-between border-b border-zinc-100 pb-2 text-sm"><span>{market}</span><span className="font-black tabular-nums text-[#285fff]">{count}</span></div>)}
                {!Object.keys(brief.marketCounts).length && <p className="text-sm text-zinc-500">Нет свежих материалов.</p>}
              </div>
            </section>

            <section className="border border-orange-300 bg-orange-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">Что контролировать дальше</p>
              <div className="mt-4 space-y-3">
                {brief.watchNext.length ? brief.watchNext.map((item, index) => <div key={`${index}-${item}`} className="border-t border-orange-200 pt-3 first:border-t-0 first:pt-0"><p className="text-sm leading-6 text-zinc-700">{index + 1}. {item}</p></div>) : <p className="text-sm text-zinc-600">Новых контрольных действий за выбранный период не сформировано.</p>}
              </div>
            </section>

            <section className="border border-zinc-300 bg-white p-5 text-xs leading-5 text-zinc-500">
              <p className="font-black uppercase tracking-[0.12em] text-zinc-700">Принцип</p>
              <p className="mt-3">Brief не использует персональные Watchlists. Все значения business score и рекомендации основаны на общей корпоративной модели v1.7.1/v1.7.2.</p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: number; note: string; icon: typeof AlertTriangle }) {
  return <div className="border-b border-r border-zinc-300 p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">{label}</p><Icon className="size-4 text-[#285fff]" /></div><p className="mt-3 text-3xl font-black tracking-[-0.04em]">{number.format(value)}</p><p className="mt-1 text-xs text-zinc-500">{note}</p></div>;
}

function StatusBadge({ status }: { status: Status }) {
  const text = status === "live" ? "LIVE" : status === "partial" ? "PARTIAL" : "OFFLINE";
  const cls = status === "live" ? "border-emerald-500/40 text-emerald-300" : status === "partial" ? "border-orange-500/40 text-orange-300" : "border-red-500/40 text-red-300";
  return <span className={`border px-3 py-2 ${cls}`}>{text}</span>;
}
