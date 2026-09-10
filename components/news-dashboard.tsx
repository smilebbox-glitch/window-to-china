"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, Clock3, Languages, RefreshCw, Search, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { seedNews, type Market, type NewsItem } from "@/lib/data";
import { detectFocusEntities, focusEntities, focusScore, type FocusEntity } from "@/lib/news-focus";
import { FavoriteButton } from "@/components/favorite-button";
import { SourceTrustBadge } from "@/components/source-trust-badge";

type Filter = "Все" | "В фокусе" | FocusEntity | "Отрасль";
type Priority = "Критично" | "Высокая" | "Средняя" | "Фоновая";
type PriorityFilter = "Все уровни" | Priority;
type Topic = "Стратегия" | "Геополитика" | "Локализация" | "Продажи" | "Поставки" | "Технологии";
type TopicFilter = "Все темы" | Topic;
type MarketFilter = "Все рынки" | Market;
type QuickView = "none" | "critical" | "strategic" | "focus";
type NewsWithReceipt = NewsItem & { receivedAt?: string };
type RatedNews = NewsWithReceipt & { score: number; priority: Priority; topics: Topic[]; focusEntities: FocusEntity[] };
type LiveResponse = { news: NewsWithReceipt[]; sourceCount: number; totalSources: number; errors: string[] };

const filters: Filter[] = ["Все", "В фокусе", ...focusEntities, "Отрасль"];
const priorities: PriorityFilter[] = ["Все уровни", "Критично", "Высокая", "Средняя", "Фоновая"];
const topics: TopicFilter[] = ["Все темы", "Стратегия", "Геополитика", "Локализация", "Продажи", "Поставки", "Технологии"];
const markets: MarketFilter[] = ["Все рынки", "Россия", "Китай", "Международный"];
const patterns: Array<{ topic: Topic; pattern: RegExp; weight: number }> = [
  { topic: "Геополитика", pattern: /санкц|пошлин|тариф|экспортн|импортн|огранич|запрет|правитель|минпром|регулир|закон|комплаенс|международ|геополит|关税|制裁|出口管制|政策/iu, weight: 30 },
  { topic: "Стратегия", pattern: /стратег|инвестиц|руковод|президент|партнер|альянс|сделк|развити|план|реорганиз|strategy|investment|合作|战略/iu, weight: 24 },
  { topic: "Локализация", pattern: /локализ|производств|завод|сборк|мощност|площадк|конвейер|factory|产能|工厂|本地化/iu, weight: 22 },
  { topic: "Поставки", pattern: /постав|логист|компонент|цепочк|сырь|дефицит|дилер|склад|supplier|供应链|零部件|交付/iu, weight: 18 },
  { topic: "Продажи", pattern: /продаж|рынок|спрос|цена|доля|регистрац|статист|sales|销量|市场|价格/iu, weight: 14 },
  { topic: "Технологии", pattern: /технолог|батаре|электро|гибрид|двигател|трансмисс|автопилот|безопасност|technology|电池|智能驾驶|新能源/iu, weight: 10 },
];
const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Moscow",
});

function formatDateTime(value: string) { return `${dateTimeFormatter.format(new Date(value)).replace(" г.", "")} МСК`; }
function compactSummary(value: string, title: string) {
  const clean = value.replace(/\s+/gu, " ").trim();
  const titleWords = new Set(title.toLocaleLowerCase("ru-RU").match(/[\p{L}\p{N}]{4,}/gu) ?? []);
  const sentences = clean.match(/[^.!?]+[.!?]?/gu)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [clean];
  const chosen = sentences.find((sentence) => {
    const words = sentence.toLocaleLowerCase("ru-RU").match(/[\p{L}\p{N}]{4,}/gu) ?? [];
    return words.length > 0 && words.filter((word) => titleWords.has(word)).length / words.length < 0.45;
  }) ?? sentences[0] ?? clean;
  const withoutDots = chosen.replace(/(?:…|\.{2,})+$/u, "").trim();
  if (withoutDots.length <= 170) return /[.!?]$/u.test(withoutDots) ? withoutDots : `${withoutDots}.`;
  const shortened = withoutDots.slice(0, 166).replace(/\s+\S*$/u, "").replace(/[,:;–—-]+$/u, "").trim();
  return `${shortened}.`;
}
function isDisplayableNews(item: NewsWithReceipt) {
  const title = item.title.replace(/\s+/gu, " ").trim();
  const summary = item.summary.replace(/\s+/gu, " ").trim();
  const originalTitle = (item.originalTitle ?? "").replace(/\s+/gu, " ").trim();
  const combined = `${title} ${summary} ${originalTitle}`;
  if (!/\p{L}{3}/u.test(title)) return false;
  if (summary.length < 24) return false;
  if (/не удалось (?:получить|загрузить|извлечь|прочитать).{0,40}(?:текст|новост|материал)|текст (?:недоступен|не получен)|content unavailable|failed to (?:load|fetch|extract|read)|unable to (?:load|fetch|extract|read)/iu.test(summary)) return false;
  const replacementChars = combined.match(/�/gu)?.length ?? 0;
  if (replacementChars >= 2 || /\?{6,}/u.test(combined)) return false;
  return true;
}
function mergeNews(live: NewsWithReceipt[]) {
  const merged = new Map<string, NewsWithReceipt>();
  for (const item of [...live, ...seedNews]) {
    if (!isDisplayableNews(item) || merged.has(item.url)) continue;
    merged.set(item.url, item);
  }
  return [...merged.values()];
}
function rateNews(item: NewsWithReceipt): RatedNews {
  const text = `${item.title} ${item.summary} ${item.originalTitle ?? ""}`;
  const detectedTopics = patterns.filter((entry) => entry.pattern.test(text));
  const entities = detectFocusEntities(item);
  const ageDays = Math.max(0, (Date.now() - new Date(item.publishedAt).getTime()) / 86_400_000);
  const recencyScore = Math.max(0, 12 - Math.min(12, ageDays / 8));
  const score = Math.min(100, Math.round(focusScore(item) + recencyScore + detectedTopics.reduce((total, topic) => total + topic.weight, 0)));
  const priority: Priority = score >= 72 ? "Критично" : score >= 52 ? "Высокая" : score >= 30 ? "Средняя" : "Фоновая";
  return { ...item, score, priority, topics: detectedTopics.map((entry) => entry.topic), focusEntities: entities };
}
function priorityClass(priority: Priority) {
  if (priority === "Критично") return "border-red-600 bg-red-600 text-white";
  if (priority === "Высокая") return "border-orange-500 bg-orange-500 text-black";
  if (priority === "Средняя") return "border-blue-700 bg-blue-700 text-white";
  return "border-zinc-300 bg-zinc-100 text-zinc-600";
}
function focusClass(entity: FocusEntity) {
  if (entity === "SHACMAN") return "border-orange-500 bg-orange-50 text-orange-800";
  if (entity === "GWM") return "border-blue-700 bg-blue-50 text-blue-800";
  if (entity === "EVOLUTE") return "border-emerald-700 bg-emerald-50 text-emerald-800";
  if (entity === "VOYAH") return "border-violet-700 bg-violet-50 text-violet-800";
  if (entity === "Моторинвест") return "border-cyan-700 bg-cyan-50 text-cyan-800";
  return "border-slate-700 bg-slate-50 text-slate-800";
}

export function NewsDashboard() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Все");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("Все уровни");
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("Все темы");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("Все рынки");
  const [quickView, setQuickView] = useState<QuickView>("none");
  const [query, setQuery] = useState("");
  const [news, setNews] = useState<NewsWithReceipt[]>(seedNews.filter(isDisplayableNews));
  const [status, setStatus] = useState<"loading" | "live" | "partial" | "offline">("loading");

  const loadLiveNews = useCallback(async () => {
    setStatus((current) => current === "live" ? current : "loading");
    try {
      const response = await fetch("/api/news", { cache: "no-store", signal: AbortSignal.timeout(18000) });
      if (!response.ok) throw new Error();
      const payload = await response.json() as LiveResponse;
      setNews(mergeNews(payload.news));
      setStatus(payload.errors.length === 0 ? "live" : "partial");
    } catch {
      setNews(seedNews.filter(isDisplayableNews));
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadLiveNews(), 0);
    const interval = window.setInterval(() => void loadLiveNews(), 15 * 60 * 1000);
    return () => { window.clearTimeout(initialLoad); window.clearInterval(interval); };
  }, [loadLiveNews]);

  const ratedNews = useMemo(() => news.map(rateNews), [news]);
  const filteredNews = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
    return ratedNews
      .filter((item) => quickView === "none" || (quickView === "critical" ? item.priority === "Критично" : quickView === "strategic" ? item.topics.includes("Стратегия") || item.topics.includes("Геополитика") : item.focusEntities.length > 0))
      .filter((item) => {
        if (activeFilter === "Все") return true;
        if (activeFilter === "В фокусе") return item.focusEntities.length > 0;
        if (activeFilter === "Отрасль") return item.focusEntities.length === 0;
        return item.focusEntities.includes(activeFilter);
      })
      .filter((item) => priorityFilter === "Все уровни" || item.priority === priorityFilter)
      .filter((item) => topicFilter === "Все темы" || item.topics.includes(topicFilter))
      .filter((item) => marketFilter === "Все рынки" || item.market === marketFilter)
      .filter((item) => !normalizedQuery || `${item.title} ${item.summary} ${item.source} ${item.focusEntities.join(" ")}`.toLocaleLowerCase("ru-RU").includes(normalizedQuery))
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  }, [activeFilter, marketFilter, priorityFilter, query, quickView, ratedNews, topicFilter]);

  const counts = useMemo(() => ({
    critical: ratedNews.filter((item) => item.priority === "Критично").length,
    strategic: ratedNews.filter((item) => item.topics.includes("Стратегия") || item.topics.includes("Геополитика")).length,
    focus: ratedNews.filter((item) => item.focusEntities.length > 0).length,
  }), [ratedNews]);
  const hasActiveFilters = quickView !== "none" || activeFilter !== "Все" || priorityFilter !== "Все уровни" || topicFilter !== "Все темы" || marketFilter !== "Все рынки" || query.length > 0;
  function resetFilters() { setQuickView("none"); setActiveFilter("Все"); setPriorityFilter("Все уровни"); setTopicFilter("Все темы"); setMarketFilter("Все рынки"); setQuery(""); }
  function showQuickView(view: Exclude<QuickView, "none">) {
    resetFilters();
    setQuickView(view);
    window.setTimeout(() => document.getElementById("news-feed")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return <main className="mgc-surface min-h-[calc(100vh-4rem)] text-zinc-950"><div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
    <section className="mb-7 border border-zinc-300 bg-white shadow-[0_18px_60px_rgba(18,24,35,0.08)]"><div className="grid lg:grid-cols-[minmax(0,1fr)_520px]">
      <div className="relative overflow-hidden bg-[#101114] p-6 text-white sm:p-8 lg:p-10"><div className="absolute inset-y-0 right-0 w-40 bg-[linear-gradient(135deg,transparent_35%,rgba(38,95,255,.22)_35%,rgba(38,95,255,.22)_52%,transparent_52%)]" /><div className="relative"><div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400"><span className="h-0.5 w-8 bg-[#285fff]" /> Стратегический мониторинг</div><h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.94] tracking-[-0.055em] sm:text-5xl lg:text-6xl">Окно<br /><span className="text-[#5f84ff]">в Китай</span></h1><p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">Стратегический мониторинг автопрома России и Китая: SHACMAN, GWM, EVOLUTE, VOYAH, Моторинвест, ЭВИА, геополитика, локализация и поставки.</p></div></div>
      <div className="grid bg-[#eceff4] sm:grid-cols-3"><Metric label="Критично" value={counts.critical} detail="требуют внимания" accent="red" active={quickView === "critical"} onClick={() => showQuickView("critical")} /><Metric label="Стратегия" value={counts.strategic} detail="геополитика" accent="blue" active={quickView === "strategic"} onClick={() => showQuickView("strategic")} /><Metric label="Бренды / компании" value={counts.focus} detail="материалов в фокусе" accent="orange" active={quickView === "focus"} onClick={() => showQuickView("focus")} /></div>
    </div></section>

    <section id="news-feed" className="scroll-mt-24"><div className="min-w-0">
      <div className="mb-5 border border-zinc-300 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 border-b border-zinc-200 pb-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500"><SlidersHorizontal className="size-4 text-[#285fff]" /> Фильтры ленты · сначала свежие{hasActiveFilters && <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="ml-auto h-8 rounded-none text-xs normal-case tracking-normal text-[#1f4ed8] hover:bg-blue-50">Сбросить</Button>}</div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterSelect value={priorityFilter} values={priorities} onChange={(value) => setPriorityFilter(value as PriorityFilter)} />
        <FilterSelect value={topicFilter} values={topics} onChange={(value) => setTopicFilter(value as TopicFilter)} />
        <FilterSelect value={marketFilter} values={markets} onChange={(value) => setMarketFilter(value as MarketFilter)} />
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" aria-label="Поиск по новостям" className="h-11 rounded-none border-zinc-300 bg-white pl-9 text-zinc-950 placeholder:text-zinc-400" /></div>
      </div><Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as Filter)} className="mt-4"><TabsList className="h-auto max-w-full justify-start overflow-x-auto rounded-none bg-zinc-100 p-1">{filters.map((filter) => <TabsTrigger key={filter} value={filter} className="min-h-10 flex-none rounded-none px-4 text-zinc-500 data-[state=active]:bg-[#111216] data-[state=active]:text-white">{filter}</TabsTrigger>)}</TabsList></Tabs></div>
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-500"><span>{filteredNews.length} материалов после фильтрации</span><LiveStatus status={status} /></div>
      {filteredNews.length ? <div className="divide-y divide-zinc-200 border border-zinc-300 bg-white">{filteredNews.map((item, index) => <NewsRow key={item.id} item={item} index={index} />)}</div> : <div className="border border-dashed border-zinc-300 bg-white px-6 py-20 text-center"><Search className="mx-auto size-8 text-zinc-300" /><h2 className="mt-4 font-semibold">Ничего не найдено</h2><p className="mt-2 text-sm text-zinc-500">Измените фильтры или покажите всю ленту.</p><Button type="button" onClick={resetFilters} className="mt-5 rounded-none bg-[#111216] text-white hover:bg-[#285fff]">Показать все новости</Button></div>}
    </div></section>
  </div></main>;
}

function FilterSelect({ value, values, onChange }: { value: string; values: readonly string[]; onChange: (value: string) => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="h-11 w-full cursor-pointer rounded-none border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50"><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>;
}
function NewsRow({ item, index }: { item: RatedNews; index: number }) {
  return <article className="group grid gap-4 p-5 transition-colors hover:bg-zinc-50 sm:grid-cols-[56px_minmax(0,1fr)_190px] sm:p-6"><div><span className="font-mono text-xs font-bold text-zinc-400">{String(index + 1).padStart(2, "0")}</span><div className="mt-3 h-0.5 w-8 bg-[#285fff]" /></div><div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="outline" className={priorityClass(item.priority)}>{item.priority}</Badge>{item.focusEntities.length ? item.focusEntities.map((entity) => <Badge key={entity} variant="outline" className={focusClass(entity)}>{entity}</Badge>) : <Badge variant="outline" className="border-zinc-300 bg-white text-zinc-600">Отрасль</Badge>}{item.topics.slice(0, 2).map((topic) => <span key={topic} className="text-xs font-medium text-zinc-500">#{topic.toLocaleLowerCase("ru-RU")}</span>)}{item.translated && <span className="inline-flex items-center gap-1 text-xs text-violet-700"><Languages className="size-3.5" /> ZH → RU</span>}</div><h2 className="max-w-4xl text-lg font-bold leading-7 text-zinc-950 group-hover:text-[#1f4ed8]">{item.title}</h2><p className="mt-2 max-w-4xl text-[15px] leading-6 text-zinc-600">{compactSummary(item.summary, item.title)}</p>{item.originalTitle && <p className="mt-3 line-clamp-2 border-l-2 border-violet-300 pl-3 text-sm leading-6 text-zinc-500">{item.originalTitle}</p>}</div><div className="flex items-end justify-between gap-4 sm:flex-col sm:items-end"><div className="text-left text-xs sm:text-right"><div className="flex flex-col items-start gap-1.5 sm:items-end"><p className="font-semibold text-zinc-800">{item.source}</p><SourceTrustBadge sourceType={item.sourceType} /></div><p className="mt-2 inline-flex items-center gap-1 font-medium text-zinc-600" title="Время первого получения новости сервисом «Окно в Китай»"><Clock3 className="size-3" /> Получено: {item.receivedAt ? formatDateTime(item.receivedAt) : "нет данных"}</p><p className="mt-1 text-zinc-400">Опубликовано: {formatDateTime(item.publishedAt)}</p><p className="mt-1 text-zinc-400">{item.market}</p></div><div className="flex flex-wrap justify-end gap-2"><FavoriteButton item={{ itemType: "news", itemId: item.id, title: item.title, url: item.url, metadata: { brand: item.brand, focusEntities: item.focusEntities, market: item.market, source: item.source, sourceType: item.sourceType } }} className="rounded-none border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100" /><a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 px-1 text-sm font-bold text-[#1f4ed8] hover:text-[#111216] focus-visible:ring-2 focus-visible:ring-[#285fff]">Первоисточник <ArrowUpRight className="size-4" /></a></div></div></article>;
}
function Metric({ label, value, detail, accent, active, onClick }: { label: string; value: number; detail: string; accent: "red" | "blue" | "orange"; active: boolean; onClick: () => void }) {
  const accents = { red: "border-t-red-600 hover:bg-red-50", blue: "border-t-[#285fff] hover:bg-blue-50", orange: "border-t-orange-500 hover:bg-orange-50" };
  return <button type="button" onClick={onClick} aria-pressed={active} className={`cursor-pointer border-b border-r border-zinc-300 border-t-4 p-5 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285fff] sm:p-6 ${accents[accent]} ${active ? "bg-white shadow-inner" : "bg-transparent"}`}><p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">{label}</p><div className="mt-3 flex items-end justify-between gap-3"><span className="text-4xl font-black leading-none text-zinc-950">{value}</span><span className="max-w-24 text-right text-xs leading-4 text-zinc-500">{detail}</span></div><span className="mt-4 inline-flex text-xs font-bold text-[#1f4ed8]">Показать новости →</span></button>;
}
function LiveStatus({ status }: { status: "loading" | "live" | "partial" | "offline" }) {
  if (status === "loading") return <span className="inline-flex items-center gap-1.5"><RefreshCw className="size-3.5 animate-spin" /> Обновление ленты</span>;
  if (status === "offline") return <span className="inline-flex items-center gap-1.5"><ShieldAlert className="size-3.5" /> Резервная лента</span>;
  return <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="size-3.5" /> Лента обновлена</span>;
}
