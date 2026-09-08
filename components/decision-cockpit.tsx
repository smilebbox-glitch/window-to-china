"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Building2,
  Check,
  Crosshair,
  Database,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { NewsItem } from "@/lib/data";
import { rankNews, type RankedNewsItem } from "@/lib/intelligence-ranking";
import {
  decisionMarketMetrics,
  marketDataMethodology,
  russiaHcvJuly2026Brands,
  russiaHcvJuly2026Source,
} from "@/lib/decision-market-data";
import {
  defaultWatchlistSettings,
  hasWatchlistCriteria,
  matchWatchlist,
  normalizeWatchlistSettings,
  watchlistAudiencePresets,
  watchlistBrandPresets,
  watchlistPowertrainPresets,
  watchlistTopicPresets,
  watchlistTruckSegmentPresets,
  type WatchlistSettings,
} from "@/lib/watchlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const number = new Intl.NumberFormat("ru-RU");

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  readAt: string | null;
};

type NewsResponse = { news: NewsItem[]; errors: string[]; updatedAt: string };
type PrefsResponse = { subscriptions: Partial<WatchlistSettings>; updatedAt?: string };
type NotificationsResponse = { notifications: NotificationItem[]; unread: number };

export function DecisionCockpit() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [settings, setSettings] = useState<WatchlistSettings>(defaultWatchlistSettings);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<"live" | "partial" | "offline">("live");
  const [keywordText, setKeywordText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [newsResponse, prefsResponse, notificationResponse] = await Promise.all([
        fetch("/api/news", { cache: "no-store", signal: AbortSignal.timeout(20_000) }),
        fetch("/api/user/preferences", { cache: "no-store", signal: AbortSignal.timeout(10_000) }),
        fetch("/api/user/notifications", { cache: "no-store", signal: AbortSignal.timeout(14_000) }),
      ]);
      if (!newsResponse.ok || !prefsResponse.ok || !notificationResponse.ok) throw new Error("decision cockpit load failed");
      const newsPayload = await newsResponse.json() as NewsResponse;
      const prefsPayload = await prefsResponse.json() as PrefsResponse;
      const notificationPayload = await notificationResponse.json() as NotificationsResponse;
      const normalized = normalizeWatchlistSettings(prefsPayload.subscriptions);
      setNews(newsPayload.news || []);
      setSettings(normalized);
      setKeywordText(normalized.keywords.join(", "));
      setNotifications(notificationPayload.notifications || []);
      setUnread(notificationPayload.unread || 0);
      setStatus(newsPayload.errors?.length ? "partial" : "live");
    } catch {
      setStatus("offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ranked = useMemo(() => rankNews(news), [news]);
  const watchlistConfigured = hasWatchlistCriteria(settings);
  const matched = useMemo(() => ranked
    .map((item) => ({ item, match: matchWatchlist(item, settings) }))
    .filter((entry) => entry.match.matched), [ranked, settings]);
  const visibleSignals = (watchlistConfigured ? matched.map((entry) => entry.item) : ranked).slice(0, 6);
  const criticalCount = ranked.filter((item) => (item.commercialVehicle?.score ?? item.intelligence.score) >= 72).length;
  const intelligenceNotifications = notifications.filter((item) => item.kind === "intelligence").slice(0, 6);

  function toggle<K extends keyof WatchlistSettings>(key: K, value: string) {
    setSaved(false);
    setSettings((current) => {
      const list = current[key];
      if (!Array.isArray(list)) return current;
      const next = list.includes(value as never) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [key]: next } as WatchlistSettings;
    });
  }

  async function saveWatchlist() {
    setSaving(true);
    setSaved(false);
    const next = normalizeWatchlistSettings({
      ...settings,
      keywords: keywordText.split(",").map((item) => item.trim()).filter(Boolean),
    });
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("watchlist save failed");
      const payload = await response.json() as PrefsResponse;
      const normalized = normalizeWatchlistSettings(payload.subscriptions);
      setSettings(normalized);
      setKeywordText(normalized.keywords.join(", "));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mgc-surface min-h-[calc(100vh-4rem)] text-zinc-950">
      <div className="mx-auto max-w-[1560px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <section className="overflow-hidden border border-zinc-300 bg-white shadow-[0_18px_60px_rgba(18,24,35,0.08)]">
          <div className="grid xl:grid-cols-[minmax(0,1fr)_520px]">
            <div className="bg-[#101114] p-7 text-white sm:p-9">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#7d9aff]"><Crosshair className="size-4" /> v1.7.2 · Decision Cockpit</div>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">Из информации — в решение</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">Персональный watchlist, business score, рыночные факты и автоматические сигналы для руководства, R&D, закупок, производства и логистики.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.08em]">
                <StatusBadge status={status} />
                <span className="border border-white/10 px-3 py-2 text-zinc-300">{news.length} материалов в индексе</span>
                <span className="border border-white/10 px-3 py-2 text-zinc-300">порог {settings.minScore}/100</span>
              </div>
            </div>
            <div className="grid grid-cols-2 bg-[#eef1f6] sm:grid-cols-4 xl:grid-cols-2">
              <HeroMetric label="Критично" value={criticalCount} note="score ≥ 72" icon={AlertTriangle} />
              <HeroMetric label="Watchlist" value={matched.length} note={watchlistConfigured ? "совпадений" : "ещё не настроен"} icon={Crosshair} />
              <HeroMetric label="Непрочитано" value={unread} note="персональных alert" icon={BellRing} />
              <HeroMetric label="Market facts" value={decisionMarketMetrics.length} note="с источником и периодом" icon={Database} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="border border-zinc-300 bg-white p-5 xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#285fff]">Watchlist</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Что отслеживать</h2></div>
              <button type="button" onClick={() => void load()} className="grid size-9 place-items-center border border-zinc-300 text-zinc-500 hover:text-[#285fff]" title="Обновить"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
            </div>

            <WatchGroup title="Бренды" values={watchlistBrandPresets} selected={settings.brands} onToggle={(value) => toggle("brands", value)} />
            <WatchGroup title="Темы" values={watchlistTopicPresets} selected={settings.topics} onToggle={(value) => toggle("topics", value)} />
            <WatchGroup title="Подразделения" values={watchlistAudiencePresets} selected={settings.audiences} onToggle={(value) => toggle("audiences", value)} />
            <WatchGroup title="Сегменты грузовиков" values={watchlistTruckSegmentPresets} selected={settings.truckSegments} onToggle={(value) => toggle("truckSegments", value)} />
            <WatchGroup title="Силовая установка" values={watchlistPowertrainPresets} selected={settings.powertrains} onToggle={(value) => toggle("powertrains", value)} />

            <div className="mt-5 border-t border-zinc-200 pt-5">
              <label className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">Ключевые слова</label>
              <Input value={keywordText} onChange={(event) => { setKeywordText(event.target.value); setSaved(false); }} className="mt-2 rounded-none" placeholder="локализация, LNG, C7H…" />
              <p className="mt-1 text-xs leading-5 text-zinc-400">Через запятую. Подходит для модели, технологии, поставщика или темы.</p>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
              <label className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">Минимальный score
                <select value={settings.minScore} onChange={(event) => { setSettings((current) => ({ ...current, minScore: Number(event.target.value) })); setSaved(false); }} className="mt-2 block h-10 w-full border border-zinc-300 bg-white px-3 text-sm font-bold">
                  <option value={30}>30 · широкий мониторинг</option>
                  <option value={45}>45 · рабочий</option>
                  <option value={60}>60 · высокий сигнал</option>
                  <option value={72}>72 · только критично</option>
                </select>
              </label>
              <button type="button" aria-pressed={settings.alertsEnabled} onClick={() => { setSettings((current) => ({ ...current, alertsEnabled: !current.alertsEnabled })); setSaved(false); }} className={`h-10 border px-3 text-xs font-black uppercase ${settings.alertsEnabled ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-zinc-300 text-zinc-500"}`}>{settings.alertsEnabled ? "Alerts ON" : "Alerts OFF"}</button>
            </div>

            <Button onClick={() => void saveWatchlist()} disabled={saving} className="mt-5 w-full rounded-none bg-[#285fff] hover:bg-[#1f4ed8]">
              {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : <Save />} {saved ? "Сохранено" : "Сохранить watchlist"}
            </Button>
            <p className="mt-3 flex gap-2 text-xs leading-5 text-zinc-500"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />Настройки сохраняются в персональном профиле. Scheduler создаёт alert только при совпадении с watchlist и прохождении порога score.</p>
          </aside>

          <div className="min-w-0 space-y-6">
            <section className="border border-zinc-300 bg-white">
              <div className="flex items-end justify-between gap-4 border-b border-zinc-200 p-5">
                <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#285fff]">Priority feed</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">{watchlistConfigured ? "Сигналы по вашему watchlist" : "Главные сигналы компании"}</h2></div>
                <span className="text-xs font-semibold text-zinc-400">по business score</span>
              </div>
              <div className="divide-y divide-zinc-200">
                {visibleSignals.length ? visibleSignals.map((item) => <SignalRow key={item.id} item={item} settings={settings} showMatch={watchlistConfigured} />) : <p className="p-6 text-sm text-zinc-500">Совпадений пока нет. Расширьте watchlist или уменьшите минимальный score.</p>}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#285fff]">Market Data</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Цифры отдельно от новостей</h2></div><a href="/market" className="text-sm font-bold text-[#285fff] hover:underline">Полный рынок →</a></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{decisionMarketMetrics.map((metric) => <MarketFact key={metric.id} metric={metric} />)}</div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
              <div className="border border-zinc-300 bg-white">
                <div className="border-b border-zinc-200 p-5"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#285fff]"><Truck className="size-4" /> HCV Snapshot</p><h2 className="mt-2 text-xl font-black">Россия · июль 2026</h2></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-zinc-100 text-xs uppercase tracking-[0.08em] text-zinc-500"><tr><th className="px-5 py-3">Бренд</th><th className="px-4 py-3">Происхождение</th><th className="px-4 py-3">Продажи</th><th className="px-5 py-3">YoY</th></tr></thead><tbody>{russiaHcvJuly2026Brands.map((row) => <tr key={row.brand} className="border-t border-zinc-200"><td className="px-5 py-3 font-black">{row.brand}</td><td className="px-4 py-3 text-zinc-500">{row.origin}</td><td className="px-4 py-3 font-bold tabular-nums">{number.format(row.units)}</td><td className={`px-5 py-3 font-black ${row.yoy >= 0 ? "text-emerald-700" : "text-red-600"}`}>{row.yoy >= 0 ? "+" : ""}{row.yoy.toLocaleString("ru-RU")}%</td></tr>)}</tbody></table></div>
                <a href={russiaHcvJuly2026Source.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between border-t border-zinc-200 px-5 py-3 text-xs font-bold text-[#285fff] hover:bg-blue-50">{russiaHcvJuly2026Source.label}<ArrowUpRight className="size-4" /></a>
              </div>

              <div className="space-y-4">
                <div className="border border-zinc-300 bg-[#101114] p-5 text-white"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#7d9aff]">Правила данных</p><ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">{marketDataMethodology.map((item) => <li key={item}>• {item}</li>)}</ul></div>
                <div className="border border-zinc-300 bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Последние alerts</p>{intelligenceNotifications.length ? <div className="mt-3 space-y-3">{intelligenceNotifications.slice(0, 3).map((item) => <a key={item.id} href={item.url || "/my"} target={item.url ? "_blank" : undefined} rel={item.url ? "noopener noreferrer" : undefined} className="block border-l-2 border-[#285fff] pl-3"><span className="block text-sm font-bold leading-5">{item.title}</span><span className="mt-1 block text-xs leading-5 text-zinc-500">{item.body.slice(0, 180)}{item.body.length > 180 ? "…" : ""}</span></a>)}</div> : <p className="mt-3 text-sm leading-6 text-zinc-500">После сохранения watchlist новые совпадения будут появляться здесь и в персональных уведомлениях.</p>}</div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function WatchGroup({ title, values, selected, onToggle }: { title: string; values: readonly string[]; selected: readonly string[]; onToggle: (value: string) => void }) {
  return <div className="mt-5"><p className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">{title}</p><div className="mt-2 flex flex-wrap gap-1.5">{values.map((value) => { const active = selected.includes(value); return <button key={value} type="button" aria-pressed={active} onClick={() => onToggle(value)} className={`border px-2.5 py-1.5 text-xs font-bold ${active ? "border-[#285fff] bg-blue-50 text-[#1f4ed8]" : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400"}`}>{value}</button>; })}</div></div>;
}

function SignalRow({ item, settings, showMatch }: { item: RankedNewsItem; settings: WatchlistSettings; showMatch: boolean }) {
  const assessment = item.commercialVehicle ?? item.intelligence;
  const match = showMatch ? matchWatchlist(item, settings) : null;
  const score = assessment.score;
  return <article className="grid gap-4 p-5 md:grid-cols-[72px_minmax(0,1fr)]"><div><div className={`grid size-14 place-items-center border text-lg font-black ${score >= 72 ? "border-red-300 bg-red-50 text-red-700" : score >= 55 ? "border-orange-300 bg-orange-50 text-orange-700" : "border-blue-200 bg-blue-50 text-[#285fff]"}`}>{score}</div><p className="mt-1 text-center text-[10px] font-bold uppercase text-zinc-400">score</p></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-500"><span>{assessment.level}</span><span>·</span><span>{item.source}</span><span>·</span><span>{item.market}</span></div><h3 className="mt-2 text-lg font-black leading-6 tracking-[-0.02em]">{item.title}</h3>{match?.reasons.length ? <div className="mt-2 flex flex-wrap gap-1.5">{match.reasons.slice(0,4).map((reason) => <span key={reason} className="bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-600">{reason}</span>)}</div> : null}<p className="mt-3 text-sm leading-6 text-zinc-600"><strong className="text-zinc-900">Почему важно:</strong> {assessment.whyItMatters}</p><p className="mt-1 text-sm leading-6 text-zinc-600"><strong className="text-zinc-900">Что проверить:</strong> {assessment.recommendedAction}</p><a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.08em] text-[#285fff] hover:underline">Первоисточник <ArrowUpRight className="size-3.5" /></a></div></article>;
}

function MarketFact({ metric }: { metric: (typeof decisionMarketMetrics)[number] }) {
  return <article className={`border p-5 ${metric.status === "forecast" ? "border-violet-200 bg-violet-50" : "border-zinc-300 bg-white"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">{metric.geography} · {metric.segment}</p><h3 className="mt-1 font-black">{metric.label}</h3></div><span className={`px-2 py-1 text-[10px] font-black uppercase ${metric.status === "forecast" ? "bg-violet-200 text-violet-800" : "bg-emerald-100 text-emerald-800"}`}>{metric.status === "forecast" ? "Прогноз" : "Факт"}</span></div><p className="mt-4 text-3xl font-black tracking-[-0.04em]">{metric.displayValue}</p><p className="mt-1 text-xs font-semibold text-zinc-500">{metric.period}{metric.yoy != null ? ` · YoY ${metric.yoy >= 0 ? "+" : ""}${metric.yoy.toLocaleString("ru-RU")}%` : ""}{metric.mom != null ? ` · MoM ${metric.mom >= 0 ? "+" : ""}${metric.mom.toLocaleString("ru-RU")}%` : ""}</p><p className="mt-3 text-xs leading-5 text-zinc-500">{metric.note}</p><a href={metric.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#285fff] hover:underline">{metric.sourceLabel} · {metric.sourceDate}<ArrowUpRight className="size-3.5" /></a></article>;
}

function HeroMetric({ label, value, note, icon: Icon }: { label: string; value: number; note: string; icon: typeof Building2 }) {
  return <div className="border-b border-r border-zinc-300 p-5"><Icon className="size-4 text-[#285fff]" /><p className="mt-3 text-3xl font-black">{value}</p><p className="text-xs font-black uppercase tracking-[0.08em] text-zinc-600">{label}</p><p className="mt-1 text-xs text-zinc-400">{note}</p></div>;
}

function StatusBadge({ status }: { status: "live" | "partial" | "offline" }) {
  if (status === "live") return <span className="border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-300">LIVE</span>;
  if (status === "partial") return <span className="border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-300">PARTIAL</span>;
  return <span className="border border-red-400/30 bg-red-400/10 px-3 py-2 text-red-300">OFFLINE</span>;
}
