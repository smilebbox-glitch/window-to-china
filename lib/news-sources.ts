import type { NewsItem } from "@/lib/data";

export type NewsSourceLanguage = "zh" | "en";
export type NewsSourceFocus = "auto" | "ev" | "economy" | "technology" | "policy" | "trade";

export type NewsWebsiteSource = {
  id: string;
  name: string;
  url: string;
  market: "Китай" | "Международный";
  language: NewsSourceLanguage;
  sourceType: "official" | "media";
  priority: number;
  focus: NewsSourceFocus[];
  maxCandidates?: number;
  enabledByDefault: boolean;
  note: string;
  hostAliases?: string[];
};

/**
 * Source policy for Window to China v1.7.
 *
 * Priority is intentionally editorial, not a judgement of general media quality:
 * primary/official data beats secondary reporting for duplicate stories; specialist
 * automotive originals beat broad aggregators; Telegram is kept for speed but loses
 * duplicate conflicts to an identifiable primary source.
 */
export const newsWebsiteSources: readonly NewsWebsiteSource[] = Object.freeze([
  {
    id: "shaanxi-auto",
    name: "Shaanxi Automobile",
    url: "https://www.sxqc.com/",
    market: "Китай",
    language: "zh",
    sourceType: "official",
    priority: 100,
    focus: ["auto"],
    maxCandidates: 3,
    enabledByDefault: true,
    note: "Официальные новости SHACMAN / Shaanxi Automobile.",
  },
  {
    id: "caam",
    name: "CAAM",
    url: "https://www.caam.org.cn/",
    market: "Китай",
    language: "zh",
    sourceType: "official",
    priority: 100,
    focus: ["auto", "ev", "trade", "policy"],
    maxCandidates: 3,
    enabledByDefault: true,
    note: "Ассоциация автопроизводителей Китая: продажи, производство, экспорт, коммерческий транспорт.",
  },
  {
    id: "nbs-china",
    name: "National Bureau of Statistics of China",
    url: "https://www.stats.gov.cn/english/PressRelease/",
    market: "Китай",
    language: "en",
    sourceType: "official",
    priority: 100,
    focus: ["economy", "policy"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Официальная макростатистика Китая: промышленность, производство, инвестиции и внешняя торговля.",
  },
  {
    id: "people-auto",
    name: "人民网汽车",
    url: "https://auto.people.com.cn/",
    market: "Китай",
    language: "zh",
    sourceType: "official",
    priority: 94,
    focus: ["auto", "ev", "policy"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Автомобильная лента People's Daily Online.",
  },
  {
    id: "xinhua-auto",
    name: "新华网汽车",
    url: "https://www.xinhuanet.com/auto/",
    market: "Китай",
    language: "zh",
    sourceType: "official",
    priority: 94,
    focus: ["auto", "ev", "policy"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Автомобильная лента Xinhua; при дубле сохраняется первичная публикация.",
    hostAliases: ["www.news.cn", "auto.news.cn"],
  },
  {
    id: "cctv-auto",
    name: "央视网汽车",
    url: "https://auto.cctv.com/",
    market: "Китай",
    language: "zh",
    sourceType: "official",
    priority: 92,
    focus: ["auto", "ev", "policy"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Автомобильная лента CCTV.",
  },
  {
    id: "gasgoo",
    name: "Gasgoo",
    url: "https://autonews.gasgoo.com/",
    market: "Китай",
    language: "en",
    sourceType: "media",
    priority: 91,
    focus: ["auto", "ev", "technology", "trade"],
    maxCandidates: 3,
    enabledByDefault: true,
    note: "Специализированные новости китайского автопрома, Tier-1/Tier-2, батареи и рынок.",
  },
  {
    id: "cnevpost",
    name: "CnEVPost",
    url: "https://cnevpost.com/industry/",
    market: "Китай",
    language: "en",
    sourceType: "media",
    priority: 90,
    focus: ["ev", "auto", "trade"],
    maxCandidates: 3,
    enabledByDefault: true,
    note: "Китайский NEV/EV рынок, продажи, экспорт, батареи и регулирование.",
  },
  {
    id: "yicai-auto",
    name: "Yicai Global",
    url: "https://www.yicaiglobal.com/auto",
    market: "Китай",
    language: "en",
    sourceType: "media",
    priority: 85,
    focus: ["auto", "economy", "trade", "policy"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Китайский бизнес, автопром, локализация, экспорт и инвестиции.",
  },
  {
    id: "china-briefing",
    name: "China Briefing",
    url: "https://www.china-briefing.com/news/",
    market: "Китай",
    language: "en",
    sourceType: "media",
    priority: 83,
    focus: ["economy", "policy", "trade"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Регуляторика, экономика, инвестиции и внешняя торговля Китая.",
  },
  {
    id: "autohome",
    name: "汽车之家",
    url: "https://www.autohome.com.cn/",
    market: "Китай",
    language: "zh",
    sourceType: "media",
    priority: 80,
    focus: ["auto", "ev"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Широкая автомобильная лента Китая.",
  },
  {
    id: "yiche",
    name: "易车",
    url: "https://www.yiche.com/",
    market: "Китай",
    language: "zh",
    sourceType: "media",
    priority: 79,
    focus: ["auto", "ev"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Китайский автомобильный портал.",
  },
  {
    id: "pcauto",
    name: "太平洋汽车",
    url: "https://www.pcauto.com.cn/",
    market: "Китай",
    language: "zh",
    sourceType: "media",
    priority: 78,
    focus: ["auto", "ev"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Китайский автомобильный портал PCauto.",
  },
  {
    id: "36kr-en",
    name: "36Kr Global",
    url: "https://eu.36kr.com/en/",
    market: "Китай",
    language: "en",
    sourceType: "media",
    priority: 77,
    focus: ["technology", "auto", "ev", "economy"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Технологии, AI, роботизация, стартапы и smart mobility Китая.",
  },
  {
    id: "carnewschina",
    name: "CarNewsChina",
    url: "https://carnewschina.com/",
    market: "Китай",
    language: "en",
    sourceType: "media",
    priority: 74,
    focus: ["auto", "ev"],
    maxCandidates: 2,
    enabledByDefault: true,
    note: "Быстрая лента китайских автомобилей и EV; вторичная по отношению к официальным источникам.",
  },
  {
    id: "china-daily-motoring",
    name: "China Daily Motoring",
    url: "https://global.chinadaily.com.cn/business/5c2336fea310d91214051089",
    market: "Китай",
    language: "en",
    sourceType: "media",
    priority: 68,
    focus: ["auto", "ev", "economy"],
    maxCandidates: 2,
    enabledByDefault: false,
    note: "Резервный источник: часть материалов повторяет агентские публикации, поэтому по умолчанию выключен.",
  },
  {
    id: "caixin-global",
    name: "Caixin Global",
    url: "https://www.caixinglobal.com/auto/",
    market: "Китай",
    language: "en",
    sourceType: "media",
    priority: 87,
    focus: ["auto", "economy", "policy", "trade"],
    maxCandidates: 2,
    enabledByDefault: false,
    note: "Глубокая бизнес-аналитика; по умолчанию выключено из-за возможного paywall/bot protection.",
  },
  {
    id: "gacc-statistics",
    name: "China Customs (GACC)",
    url: "https://english.customs.gov.cn/Statistics/Statistics",
    market: "Китай",
    language: "en",
    sourceType: "official",
    priority: 100,
    focus: ["trade", "economy"],
    maxCandidates: 1,
    enabledByDefault: false,
    note: "Официальная внешнеторговая статистика; оставлена как data-source candidate, а не новостная лента.",
  },
]);

export const activeNewsWebsiteSources = newsWebsiteSources.filter((source) => source.enabledByDefault);

const sourcePriorities = new Map(newsWebsiteSources.map((source) => [source.name, source.priority]));

export function priorityForNewsItem(item: Pick<NewsItem, "source" | "sourceType">) {
  const configured = sourcePriorities.get(item.source);
  if (configured != null) return configured;
  if (item.source === "АВТОСТАТ") return 84;
  if (item.sourceType === "official") return 95;
  if (item.sourceType === "media") return 72;
  return 55;
}

export function validateNewsSourceCatalog() {
  const ids = new Set<string>();
  const urls = new Set<string>();
  const duplicates: string[] = [];
  for (const source of newsWebsiteSources) {
    if (ids.has(source.id)) duplicates.push(`id:${source.id}`);
    ids.add(source.id);
    const normalized = new URL(source.url).toString();
    if (urls.has(normalized)) duplicates.push(`url:${normalized}`);
    urls.add(normalized);
  }
  return { valid: duplicates.length === 0, duplicates, total: newsWebsiteSources.length, active: activeNewsWebsiteSources.length };
}
