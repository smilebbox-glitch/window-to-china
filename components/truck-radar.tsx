"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BatteryCharging, Clock3, Factory, RefreshCw, Route, Search, Truck } from "lucide-react";
import type { NewsItem } from "@/lib/data";
import { rankCommercialVehicleNews, type TruckSegment } from "@/lib/intelligence-ranking";
import { SourceTrustBadge } from "@/components/source-trust-badge";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Moscow",
});
const segments: Array<"Все сегменты" | TruckSegment> = [
  "Все сегменты",
  "HCV · тяжёлые",
  "MCV · среднетоннажные",
  "LCV · лёгкие",
  "Тягачи",
  "Самосвалы / стройка",
  "Шасси / спецтехника",
  "Грузовики · общий",
];

type MarketFilter = "Все" | "Китай" | "Россия" | "Китай ↔ Россия";
type NewsWithReceipt = NewsItem & { receivedAt?: string };
type LiveResponse = { news: NewsWithReceipt[]; updatedAt?: string; errors?: string[]; sourceCount?: number; totalSources?: number };

function formatDateTime(value: string) {
  return `${dateTimeFormatter.format(new Date(value)).replace(" г.", "")} МСК`;
}

function levelClass(level: string) {
  if (level === "Критично") return "bg-red-600 text-white";
  if (level === "Высокий приоритет") return "bg-orange-500 text-black";
  if (level === "Наблюдение") return "bg-blue-700 text-white";
  return "bg-zinc-100 text-zinc-600";
}

export function TruckRadar() {
  const [news, setNews] = useState<NewsWithReceipt[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "partial" | "offline">("loading");
  const [market, setMarket] = useState<MarketFilter>("Все");
  const [segment, setSegment] = useState<(typeof segments)[number]>("Все сегменты");
  const [query, setQuery] = useState("");

  async function load() {
    setStatus("loading");
    try {
      const response = await fetch("/api/news", { cache: "no-store", signal: AbortSignal.timeout(22000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as LiveResponse;
      setNews(payload.news ?? []);
      setStatus((payload.errors?.length ?? 0) > 0 ? "partial" : "live");
    } catch {
      setNews([]);
      setStatus("offline");
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const ranked = useMemo(() => rankCommercialVehicleNews(news), [news]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("ru-RU");
    return ranked.filter((item) => {
      const truck = item.commercialVehicle;
      if (market === "Китай" && !truck.focusMarkets.includes("Китай")) return false;
      if (market === "Россия" && !truck.focusMarkets.includes("Россия")) return false;
      if (market === "Китай ↔ Россия" && !(truck.focusMarkets.includes("Китай") && truck.focusMarkets.includes("Россия"))) return false;
      if (segment !== "Все сегменты" && truck.segment !== segment) return false;
      if (q && !`${item.title} ${item.summary} ${item.source} ${truck.brands.map((brand) => brand.brand).join(" ")}`.toLocaleLowerCase("ru-RU").includes(q)) return false;
      return true;
    });
  }, [market, query, ranked, segment]);

  const metrics = useMemo(() => ({
    china: ranked.filter((item) => item.commercialVehicle.focusMarkets.includes("Китай")).length,
    russia: ranked.filter((item) => item.commercialVehicle.focusMarkets.includes("Россия")).length,
    cross: ranked.filter((item) => item.commercialVehicle.focusMarkets.includes("Китай") && item.commercialVehicle.focusMarkets.includes("Россия")).length,
    newEnergy: ranked.filter((item) => item.commercialVehicle.powertrains.some((powertrain) => ["Электро", "Battery swap", "Водород", "Гибрид"].includes(powertrain))).length,
  }), [ranked]);

  return <main className="min-h-[calc(100vh-4rem)] bg-[#eef1f5] text-zinc-950">
    <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
      <section className="overflow-hidden border border-zinc-300 bg-[#101114] text-white shadow-[0_18px_60px_rgba(18,24,35,0.12)]">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_560px]">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-y-0 right-0 w-56 bg-[linear-gradient(135deg,transparent_30%,rgba(40,95,255,.18)_30%,rgba(40,95,255,.18)_52%,transparent_52%)]" />
            <div className="relative">
              <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400"><Truck className="size-4 text-orange-400" /> Commercial Vehicle Intelligence</div>
              <h1 className="max-w-3xl text-4xl font-black uppercase tracking-[-0.05em] sm:text-5xl">Грузовой радар<br /><span className="text-[#6f91ff]">Китай ↔ Россия</span></h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">HCV, MCV и LCV, тягачи, самосвалы и шасси. Отслеживаем китайские и российские бренды, силовые установки, локализацию, рынок, поставки и регуляторные риски.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 bg-[#e7eaf0] text-zinc-950">
            <Metric icon={Truck} label="Китай" value={metrics.china} detail="сигналов в ленте" />
            <Metric icon={Factory} label="Россия" value={metrics.russia} detail="сигналов в ленте" />
            <Metric icon={Route} label="Китай ↔ Россия" value={metrics.cross} detail="кросс-рыночных" />
            <Metric icon={BatteryCharging} label="Новая энергия" value={metrics.newEnergy} detail="EV / swap / H₂ / hybrid" />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="min-w-0">
          <div className="border border-zinc-300 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {(["Все", "Китай", "Россия", "Китай ↔ Россия"] as MarketFilter[]).map((value) => <button key={value} type="button" onClick={() => setMarket(value)} className={`h-9 border px-3 text-xs font-bold uppercase tracking-[0.08em] transition ${market === value ? "border-[#285fff] bg-[#285fff] text-white" : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500"}`}>{value}</button>)}
              <select value={segment} onChange={(event) => setSegment(event.target.value as (typeof segments)[number])} className="h-9 border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#285fff]">
                {segments.map((value) => <option key={value}>{value}</option>)}
              </select>
              <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Бренд, модель, технология..." className="h-9 w-full border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#285fff]" /></div>
              <button type="button" onClick={() => void load()} className="grid size-9 place-items-center border border-zinc-300 bg-white text-zinc-600 hover:border-[#285fff] hover:text-[#285fff]" aria-label="Обновить"><RefreshCw className={`size-4 ${status === "loading" ? "animate-spin" : ""}`} /></button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-b border-zinc-300 pb-3">
            <div><h2 className="text-xl font-black uppercase tracking-[-0.02em]">Ключевые грузовые сигналы</h2><p className="mt-1 text-sm text-zinc-500">Сортировка по бизнес-важности, а не только по дате публикации.</p></div>
            <Status status={status} />
          </div>

          <div className="mt-4 space-y-3">
            {filtered.length === 0 && <div className="border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-500">{status === "offline" ? "Лента недоступна. Проверьте соединение или состояние источников." : "По выбранным фильтрам грузовых сигналов нет."}</div>}
            {filtered.slice(0, 24).map((item) => {
              const truck = item.commercialVehicle;
              const receivedAt = (item as NewsWithReceipt).receivedAt;
              return <article key={item.id} className="border border-zinc-300 bg-white p-5 shadow-sm transition hover:border-zinc-400 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em]">
                  <span className={`px-2 py-1 ${levelClass(truck.level)}`}>{truck.level} · {truck.score}</span>
                  <span className="border border-zinc-300 bg-zinc-50 px-2 py-1 text-zinc-600">{truck.segment}</span>
                  {truck.focusMarkets.map((value) => <span key={value} className="border border-zinc-300 px-2 py-1 text-zinc-600">{value}</span>)}
                  {truck.powertrains.map((value) => <span key={value} className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">{value}</span>)}
                </div>
                <h3 className="mt-4 text-xl font-black leading-tight tracking-[-0.025em]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{item.summary}</p>
                {truck.brands.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{truck.brands.map((brand) => <span key={brand.brand} className="bg-[#eef3ff] px-2 py-1 text-xs font-bold text-[#1f4ed8]">{brand.brand} · {brand.origin}</span>)}</div>}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="border-l-4 border-[#285fff] bg-blue-50/60 p-3"><div className="text-[11px] font-black uppercase tracking-[0.12em] text-[#1f4ed8]">Почему важно</div><p className="mt-1 text-sm leading-5 text-zinc-700">{truck.whyItMatters}</p></div>
                  <div className="border-l-4 border-orange-500 bg-orange-50/70 p-3"><div className="text-[11px] font-black uppercase tracking-[0.12em] text-orange-800">Что проверить</div><p className="mt-1 text-sm leading-5 text-zinc-700">{truck.recommendedAction}</p></div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-3 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-700">{item.source}</span>
                  <SourceTrustBadge sourceType={item.sourceType} compact />
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-zinc-600" title="Время первого получения новости сервисом «Окно в Китай»"><Clock3 className="size-3" /> Получено: {receivedAt ? formatDateTime(receivedAt) : "нет данных"}</span>
                  <span>·</span>
                  <span>Опубликовано: {formatDateTime(item.publishedAt)}</span>
                  <span>·</span>
                  <span>Для: {truck.audiences.slice(0, 2).map((impact) => impact.audience).join(", ")}</span>
                  <a href={item.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-bold text-[#1f4ed8] hover:underline">Источник <ArrowUpRight className="size-3.5" /></a>
                </div>
              </article>;
            })}
          </div>
        </div>
      </section>
    </div>
  </main>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Truck; label: string; value: number; detail: string }) {
  return <div className="border-b border-r border-zinc-300 p-5"><Icon className="size-5 text-[#285fff]" /><div className="mt-3 text-3xl font-black tracking-[-0.04em]">{value}</div><div className="mt-1 text-xs font-black uppercase tracking-[0.1em]">{label}</div><div className="mt-1 text-xs text-zinc-500">{detail}</div></div>;
}

function Status({ status }: { status: "loading" | "live" | "partial" | "offline" }) {
  if (status === "live") return <span className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">Live</span>;
  if (status === "partial") return <span className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">Partial / stale fallback</span>;
  if (status === "offline") return <span className="text-xs font-bold uppercase tracking-[0.08em] text-red-700">Offline</span>;
  return <span className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Обновление...</span>;
}
