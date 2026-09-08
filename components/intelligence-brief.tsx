"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Factory, FlaskConical, PackageSearch, Route, ShieldAlert } from "lucide-react";
import type { NewsItem } from "@/lib/data";
import { rankNews, type IntelligenceAudience } from "@/lib/intelligence-ranking";

type LiveResponse = { news: NewsItem[]; errors?: string[] };

const audienceIcons: Record<IntelligenceAudience, typeof BriefcaseBusiness> = {
  "Руководство": BriefcaseBusiness,
  "R&D": FlaskConical,
  "Закупки": PackageSearch,
  "Производство": Factory,
  "Логистика": Route,
};

function levelClass(level: string) {
  if (level === "Критично") return "border-red-500 bg-red-500 text-white";
  if (level === "Высокий приоритет") return "border-orange-400 bg-orange-400 text-black";
  if (level === "Наблюдение") return "border-blue-500 bg-blue-500 text-white";
  return "border-zinc-600 bg-zinc-800 text-zinc-300";
}

export function IntelligenceBrief() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "partial" | "offline">("loading");
  const [audience, setAudience] = useState<IntelligenceAudience | "Все">("Все");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/news", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(22000)]) });
        if (!response.ok) throw new Error();
        const payload = await response.json() as LiveResponse;
        setNews(payload.news ?? []);
        setStatus(payload.errors?.length ? "partial" : "live");
      } catch {
        if (!controller.signal.aborted) setStatus("offline");
      }
    })();
    return () => controller.abort();
  }, []);

  const ranked = useMemo(() => rankNews(news), [news]);
  const visible = useMemo(() => ranked
    .filter((item) => item.intelligence.level !== "Фон")
    .filter((item) => audience === "Все" || item.intelligence.audiences.find((impact) => impact.audience === audience && impact.score > 0))
    .slice(0, 6), [audience, ranked]);

  const audienceCounts = useMemo(() => {
    const counts = new Map<IntelligenceAudience, number>();
    for (const item of ranked.filter((entry) => entry.intelligence.level !== "Фон")) {
      for (const impact of item.intelligence.audiences.filter((entry) => entry.score >= 20)) counts.set(impact.audience, (counts.get(impact.audience) ?? 0) + 1);
    }
    return counts;
  }, [ranked]);

  return <section className="border-b border-white/8 bg-[#071011]">
    <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-300"><ShieldAlert className="size-4" /> Intelligence Ranking v1.7.1</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Что действительно важно для компании</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Детерминированный рейтинг оценивает свежесть, авторитет источника и бизнес-сигналы и показывает, кому внутри компании материал наиболее релевантен.</p></div>
        <span className={`text-xs font-bold uppercase tracking-[0.1em] ${status === "live" ? "text-emerald-300" : status === "partial" ? "text-amber-300" : status === "offline" ? "text-red-300" : "text-slate-500"}`}>{status === "loading" ? "Обновление…" : status}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => setAudience("Все")} className={`border px-3 py-2 text-xs font-bold ${audience === "Все" ? "border-violet-400 bg-violet-400/15 text-white" : "border-white/10 text-slate-500 hover:text-white"}`}>Все</button>
        {(Object.keys(audienceIcons) as IntelligenceAudience[]).map((value) => { const Icon = audienceIcons[value]; return <button key={value} type="button" onClick={() => setAudience(value)} className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-bold ${audience === value ? "border-violet-400 bg-violet-400/15 text-white" : "border-white/10 text-slate-500 hover:text-white"}`}><Icon className="size-3.5" />{value}<span className="text-slate-600">{audienceCounts.get(value) ?? 0}</span></button>; })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => <article key={item.id} className="border border-white/8 bg-[#0a1516] p-4">
          <div className="flex flex-wrap items-center gap-2"><span className={`border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${levelClass(item.intelligence.level)}`}>{item.intelligence.level} · {item.intelligence.score}</span><span className="text-[11px] font-semibold text-slate-600">{item.source}</span>{item.commercialVehicle && <span className="border border-orange-400/20 bg-orange-400/5 px-2 py-1 text-[10px] font-bold text-orange-300">Грузовики</span>}</div>
          <h3 className="mt-3 text-base font-semibold leading-6 text-slate-100">{item.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">{item.intelligence.whyItMatters}</p>
          <div className="mt-3 border-l-2 border-violet-400/50 pl-3 text-xs leading-5 text-slate-400">{item.intelligence.recommendedAction}</div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-600"><span>{item.intelligence.primaryAudience}</span><span>·</span><span>{item.intelligence.signals.slice(0, 2).join(", ") || "фоновый сигнал"}</span><a href={item.url} target="_blank" rel="noreferrer" className="ml-auto text-cyan-300 hover:text-cyan-200"><ArrowUpRight className="size-4" /></a></div>
        </article>)}
        {visible.length === 0 && <div className="border border-dashed border-white/10 p-6 text-sm text-slate-600">{status === "offline" ? "Лента недоступна." : "Нет сигналов выбранного уровня для этого подразделения."}</div>}
      </div>
    </div>
  </section>;
}
