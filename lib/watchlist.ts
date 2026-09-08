import type { RankedNewsItem, IntelligenceAudience, TruckPowertrain, TruckSegment } from "@/lib/intelligence-ranking";

export type WatchlistSettings = {
  brands: string[];
  markets: string[];
  topics: string[];
  cities: string[];
  events: string[];
  eventLeadDays: number;
  keywords: string[];
  truckSegments: TruckSegment[];
  powertrains: TruckPowertrain[];
  audiences: IntelligenceAudience[];
  minScore: number;
  alertsEnabled: boolean;
};

export const defaultWatchlistSettings: WatchlistSettings = {
  brands: [],
  markets: [],
  topics: [],
  cities: [],
  events: [],
  eventLeadDays: 30,
  keywords: [],
  truckSegments: [],
  powertrains: [],
  audiences: [],
  minScore: 45,
  alertsEnabled: true,
};

export const watchlistBrandPresets = [
  "SHACMAN", "SITRAK / SINOTRUK / HOWO", "FAW Jiefang", "Dongfeng", "Foton / Auman",
  "JAC", "SANY", "XCMG", "Farizon", "KAMAZ", "УРАЛ", "GAZ", "Sollers", "GWM",
] as const;

export const watchlistTopicPresets = [
  "Регулирование", "Локализация", "Поставки", "Технологии", "Рынок", "Инвестиции", "Качество и риски", "Экспорт и торговля",
] as const;

export const watchlistAudiencePresets: IntelligenceAudience[] = ["Руководство", "R&D", "Закупки", "Производство", "Логистика"];

export const watchlistTruckSegmentPresets: TruckSegment[] = [
  "HCV · тяжёлые", "MCV · среднетоннажные", "LCV · лёгкие", "Тягачи", "Самосвалы / стройка", "Шасси / спецтехника", "Грузовики · общий",
];

export const watchlistPowertrainPresets: TruckPowertrain[] = ["Дизель", "LNG / CNG", "Электро", "Battery swap", "Водород", "Гибрид"];

function strings(value: unknown, max = 50) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, max);
}

export function normalizeWatchlistSettings(input: Partial<WatchlistSettings> | null | undefined): WatchlistSettings {
  const raw = input ?? {};
  return {
    brands: strings(raw.brands, 30),
    markets: strings(raw.markets, 20),
    topics: strings(raw.topics, 20),
    cities: strings(raw.cities, 30),
    events: strings(raw.events, 50),
    eventLeadDays: Math.max(1, Math.min(180, Math.round(Number(raw.eventLeadDays || 30)))),
    keywords: strings(raw.keywords, 30).map((item) => item.slice(0, 80)),
    truckSegments: strings(raw.truckSegments, 20) as TruckSegment[],
    powertrains: strings(raw.powertrains, 20) as TruckPowertrain[],
    audiences: strings(raw.audiences, 10) as IntelligenceAudience[],
    minScore: Math.max(0, Math.min(100, Math.round(Number(raw.minScore ?? 45)))),
    alertsEnabled: raw.alertsEnabled !== false,
  };
}

export function hasWatchlistCriteria(settings: WatchlistSettings) {
  return Boolean(
    settings.brands.length || settings.markets.length || settings.topics.length || settings.keywords.length ||
    settings.truckSegments.length || settings.powertrains.length || settings.audiences.length,
  );
}

export type WatchlistMatch = {
  matched: boolean;
  scorePassed: boolean;
  reasons: string[];
};

export function matchWatchlist(item: RankedNewsItem, input: WatchlistSettings): WatchlistMatch {
  const settings = normalizeWatchlistSettings(input);
  const score = item.commercialVehicle?.score ?? item.intelligence.score;
  const scorePassed = score >= settings.minScore;
  if (!scorePassed || !hasWatchlistCriteria(settings)) return { matched: false, scorePassed, reasons: [] };

  const reasons: string[] = [];
  const text = `${item.title} ${item.summary} ${item.originalTitle ?? ""}`.toLocaleLowerCase("ru-RU");
  const truckBrands = item.commercialVehicle?.brands.map((entry) => entry.brand) ?? [];
  const allBrands = new Set([item.brand, ...truckBrands]);

  for (const brand of settings.brands) {
    if ([...allBrands].some((candidate) => candidate.toLocaleLowerCase("ru-RU").includes(brand.toLocaleLowerCase("ru-RU")) || brand.toLocaleLowerCase("ru-RU").includes(candidate.toLocaleLowerCase("ru-RU")))) {
      reasons.push(`бренд: ${brand}`);
    }
  }
  for (const market of settings.markets) {
    if (item.market === market || item.commercialVehicle?.focusMarkets.includes(market as "Китай" | "Россия")) reasons.push(`рынок: ${market}`);
  }
  for (const topic of settings.topics) {
    if (item.intelligence.signals.includes(topic as never) || item.commercialVehicle?.signals.includes(topic as never)) reasons.push(`тема: ${topic}`);
  }
  for (const keyword of settings.keywords) {
    if (text.includes(keyword.toLocaleLowerCase("ru-RU"))) reasons.push(`ключ: ${keyword}`);
  }
  for (const segment of settings.truckSegments) {
    if (item.commercialVehicle?.segment === segment) reasons.push(`сегмент: ${segment}`);
  }
  for (const powertrain of settings.powertrains) {
    if (item.commercialVehicle?.powertrains.includes(powertrain)) reasons.push(`силовая установка: ${powertrain}`);
  }
  for (const audience of settings.audiences) {
    if (item.intelligence.audiences.some((entry) => entry.audience === audience) || item.commercialVehicle?.audiences.some((entry) => entry.audience === audience)) reasons.push(`подразделение: ${audience}`);
  }

  return { matched: reasons.length > 0, scorePassed, reasons: [...new Set(reasons)].slice(0, 8) };
}
