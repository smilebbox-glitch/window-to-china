"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Factory, FlaskConical, PackageSearch, Route, ShieldAlert } from "lucide-react";
import type { NewsItem } from "@/lib/data";
import { rankNews, type IntelligenceAudience } from "@/lib/intelligence-ranking";
import { SourceTrustBadge } from "@/components/source-trust-badge";

type LiveResponse = { news: NewsItem[]; errors?: string[] };

const audienceIcons: Record<IntelligenceAudience, typeof BriefcaseBusiness> = {
  "Руководство": BriefcaseBusiness,
  "R&D": FlaskConical,
  "Закупки": PackageSearch,
  "Производство": Factory,
  "Логистика": Route,
};

function levelClass(level: string) {
  if (level === "Критично") return "border-[#f1b9bd] bg-[#fff3f4] text-[#be2f3b]";
  if (level === "Высокий приоритет") return "border-[#f3d1a5] bg-[#fff8ef] text-[#ad5c0c]";
  if (level === "Наблюдение") return "border-[#bfd9f3] bg-[#f2f8ff] text-[#1266be]";
  return "border-[#dce6ef] bg-[#f6f9fc] text-[#6c819a]";
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

  const statusLabel = status === "loading" ? "Обновление…" : status === "live" ? "Live" : status === "partial" ? "Частично" : "Offline";
  const statusClass = status === "live" ? "text-[#08785a]" : status === "partial" ? "text-[#ad650f]" : status === "offline" ? "text-[#b93642]" : "text-[#7186a2]";

  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce7f1] bg-white shadow-[0_14px_42px_rgba(22,48,83,.055)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e6edf4] px-4 py-5 sm:px-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#147efb]"><ShieldAlert className="size-4" /> Intelligence Ranking</div>
          <h2 className="mt-2 text-xl font-black tracking-[-.025em] text-[#102a58] sm:text-2xl">Что действительно важно для компании</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[#7186a2] sm:text-sm">Рейтинг учитывает свежесть, авторитет источника и бизнес-сигналы и показывает, кому внутри компании материал наиболее релевантен.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border border-[#dce7f1] bg-[#f7fbff] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.11em] ${statusClass}`}>
          <span className={`size-1.5 rounded-full ${status === "live" ? "bg-emerald-500" : status === "partial" ? "bg-amber-500" : status === "offline" ? "bg-red-500" : "bg-slate-400"}`} />
          {statusLabel}
        </span>
      </div>

      <div className="border-b border-[#e6edf4] bg-[#f8fbfe] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAudience("Все")} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${audience === "Все" ? "border-[#147efb] bg-[#147efb] text-white" : "border-[#d8e5f0] bg-white text-[#5f7896] hover:border-[#b9d6ef] hover:text-[#17345f]"}`}>Все</button>
          {(Object.keys(audienceIcons) as IntelligenceAudience[]).map((value) => {
            const Icon = audienceIcons[value];
            return (
              <button key={value} type="button" onClick={() => setAudience(value)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${audience === value ? "border-[#147efb] bg-[#147efb] text-white" : "border-[#d8e5f0] bg-white text-[#5f7896] hover:border-[#b9d6ef] hover:text-[#17345f]"}`}>
                <Icon className="size-3.5" />
                {value}
                <span className={audience === value ? "text-white/70" : "text-[#98a8b9]"}>{audienceCounts.get(value) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-px bg-[#e7eef5] lg:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <article key={item.id} className="group bg-white p-4 transition hover:bg-[#f9fcff] sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.08em] ${levelClass(item.intelligence.level)}`}>{item.intelligence.level} · {item.intelligence.score}</span>
              <SourceTrustBadge sourceType={item.sourceType} compact />
              {item.commercialVehicle && <span className="rounded-full border border-[#f0d5b0] bg-[#fff8ee] px-2 py-1 text-[9px] font-black text-[#b86816]">Грузовики</span>}
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[.08em] text-[#8a9caf]">{item.source}</p>
            <h3 className="mt-1.5 text-[15px] font-black leading-6 text-[#17345f] transition group-hover:text-[#147efb]">{item.title}</h3>
            <p className="mt-3 text-xs leading-5 text-[#6f84a0]">{item.intelligence.whyItMatters}</p>
            <div className="mt-3 rounded-xl border border-[#dce9f5] bg-[#f7fbff] p-3 text-xs leading-5 text-[#4d6988]">
              <span className="mb-1 block text-[9px] font-black uppercase tracking-[.1em] text-[#147efb]">Что проверить</span>
              {item.intelligence.recommendedAction}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-[#edf2f6] pt-3 text-[10px] text-[#8799ac]">
              <span className="font-bold text-[#5f7896]">{item.intelligence.primaryAudience}</span>
              <span>·</span>
              <span className="line-clamp-1">{item.intelligence.signals.slice(0, 2).join(", ") || "фоновый сигнал"}</span>
              <a href={item.url} target="_blank" rel="noreferrer" className="ml-auto grid size-7 place-items-center rounded-lg border border-[#dce7f1] bg-white text-[#147efb] transition hover:border-[#b9d6ef] hover:bg-[#f5faff]" aria-label="Открыть источник"><ArrowUpRight className="size-3.5" /></a>
            </div>
          </article>
        ))}
        {visible.length === 0 && <div className="col-span-full bg-white p-8 text-center text-sm text-[#7186a2]">{status === "offline" ? "Лента недоступна." : "Нет сигналов выбранного уровня для этого подразделения."}</div>}
      </div>
    </section>
  );
}
