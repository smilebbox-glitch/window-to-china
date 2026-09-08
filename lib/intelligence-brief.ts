import type { NewsItem } from "@/lib/data";
import { rankNews, type IntelligenceAudience, type RankedNewsItem } from "@/lib/intelligence-ranking";

export type BriefPeriod = "daily" | "weekly";

export type ExecutiveSignal = {
  id: string;
  title: string;
  summary: string;
  score: number;
  level: string;
  market: string;
  brand: string;
  segment: string | null;
  source: string;
  url: string;
  publishedAt: string;
  whyItMatters: string;
  recommendedAction: string;
  audiences: IntelligenceAudience[];
};

export type IntelligenceBrief = {
  period: BriefPeriod;
  periodLabel: string;
  generatedAt: string;
  windowStart: string;
  materialCount: number;
  sourceCount: number;
  criticalCount: number;
  highPriorityCount: number;
  observationCount: number;
  truckSignalCount: number;
  marketCounts: Record<string, number>;
  audienceCounts: Array<{ audience: IntelligenceAudience; count: number }>;
  executiveSummary: string[];
  signals: ExecutiveSignal[];
  watchNext: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function scoreFor(item: RankedNewsItem) {
  return item.commercialVehicle?.score ?? item.intelligence.score;
}

function assessmentFor(item: RankedNewsItem) {
  return item.commercialVehicle ?? item.intelligence;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function buildIntelligenceBrief(items: NewsItem[], period: BriefPeriod, now = new Date()): IntelligenceBrief {
  const windowMs = period === "daily" ? DAY_MS : 7 * DAY_MS;
  const windowStartMs = now.getTime() - windowMs;
  const ranked = rankNews(items);
  const inWindow = ranked.filter((item) => {
    const published = Date.parse(item.publishedAt);
    return Number.isFinite(published) && published >= windowStartMs && published <= now.getTime() + 5 * 60 * 1000;
  });

  const criticalCount = inWindow.filter((item) => scoreFor(item) >= 72).length;
  const highPriorityCount = inWindow.filter((item) => scoreFor(item) >= 60 && scoreFor(item) < 72).length;
  const observationCount = inWindow.filter((item) => scoreFor(item) >= 45 && scoreFor(item) < 60).length;
  const truckSignalCount = inWindow.filter((item) => Boolean(item.commercialVehicle) && scoreFor(item) >= 45).length;

  const marketCounts: Record<string, number> = {};
  for (const item of inWindow) marketCounts[item.market] = (marketCounts[item.market] || 0) + 1;

  const audienceMap = new Map<IntelligenceAudience, number>();
  for (const item of inWindow.filter((entry) => scoreFor(entry) >= 45)) {
    const audiences = assessmentFor(item).audiences.slice(0, 3);
    for (const entry of audiences) audienceMap.set(entry.audience, (audienceMap.get(entry.audience) || 0) + 1);
  }
  const audienceCounts = [...audienceMap.entries()]
    .map(([audience, count]) => ({ audience, count }))
    .sort((a, b) => b.count - a.count || a.audience.localeCompare(b.audience, "ru"));

  const signals = inWindow
    .filter((item) => scoreFor(item) >= 45)
    .slice(0, period === "daily" ? 5 : 8)
    .map(toExecutiveSignal);

  const sources = unique(inWindow.map((item) => item.source));
  const topAudience = audienceCounts[0]?.audience;
  const topMarket = Object.entries(marketCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const executiveSummary: string[] = [];

  if (!inWindow.length) {
    executiveSummary.push("За выбранный период свежих материалов в агрегированном индексе не обнаружено.");
    executiveSummary.push("Это не означает отсутствие событий на рынке: необходимо проверить статус источников и время последнего обновления.");
  } else {
    executiveSummary.push(`За период обработано ${inWindow.length} материалов из ${sources.length} источников; критичных сигналов — ${criticalCount}, высокого приоритета — ${highPriorityCount}.`);
    if (topAudience) executiveSummary.push(`Наиболее затронутая функция по текущим сигналам: ${topAudience}.`);
    if (topMarket) executiveSummary.push(`Наибольшее число свежих материалов относится к рынку «${topMarket}».`);
    if (truckSignalCount) executiveSummary.push(`Коммерческий транспорт: ${truckSignalCount} сигналов с business score ≥ 45 требуют отдельного внимания.`);
    if (!criticalCount && !highPriorityCount) executiveSummary.push("Сигналов уровня 60+ за период не выявлено; основной режим — наблюдение и подтверждение рыночных фактов.");
  }

  const watchNext = unique(signals.map((signal) => signal.recommendedAction).filter(Boolean)).slice(0, 5);

  return {
    period,
    periodLabel: period === "daily" ? "Последние 24 часа" : "Последние 7 дней",
    generatedAt: now.toISOString(),
    windowStart: new Date(windowStartMs).toISOString(),
    materialCount: inWindow.length,
    sourceCount: sources.length,
    criticalCount,
    highPriorityCount,
    observationCount,
    truckSignalCount,
    marketCounts,
    audienceCounts,
    executiveSummary,
    signals,
    watchNext,
  };
}

function toExecutiveSignal(item: RankedNewsItem): ExecutiveSignal {
  const assessment = assessmentFor(item);
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    score: scoreFor(item),
    level: assessment.level,
    market: item.market,
    brand: item.brand,
    segment: item.commercialVehicle?.segment ?? null,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    whyItMatters: assessment.whyItMatters,
    recommendedAction: assessment.recommendedAction,
    audiences: assessment.audiences.slice(0, 3).map((entry) => entry.audience),
  };
}
