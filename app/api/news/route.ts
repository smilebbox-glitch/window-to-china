import type { Brand, NewsItem } from "@/lib/data";
import { sourceChannels } from "@/lib/data";
import {
  activeNewsWebsiteSources,
  newsWebsiteSources,
  priorityForNewsItem,
  type NewsSourceLanguage,
  type NewsWebsiteSource,
} from "@/lib/news-sources";
import { safeFetch } from "@/lib/outbound";
import { loadRuntimeConfig } from "@/lib/runtime-config";
import { logEvent } from "@/lib/logger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { isSchedulerRequest } from "@/lib/internal-auth";
import { getSourceSnapshot, recordSourceRun, saveSourceSnapshot } from "@/lib/source-cache";

export const dynamic = "force-dynamic";

const NEWS_SOURCE_CATALOG_VERSION = 1;
const sourceNames = new Map(sourceChannels.map((source) => [source.handle, source.name]));

const brandPatterns: Array<[Brand, RegExp]> = [
  ["SHACMAN", /\bshacman\b|\bshaanxi\b|шакман|шаанси|陕汽/iu],
  [
    "GWM",
    /\bgwm\b|great\s*wall|г(р|рэ)ейт\s*волл|\bhaval\b|\btank\b|\bwey\b|\bora\b|хавейл|хавал|танк|长城|哈弗|坦克|魏牌|欧拉/iu,
  ],
];

const autoIndustryPattern =
  /汽车|车企|整车|新能源车|商用车|重卡|卡车|零部件|供应链|销量|产量|出口|工厂|自动驾驶|电池|充电|智能驾驶|车联网|芯片|比亚迪|蔚来|小鹏|理想|吉利|奇瑞|上汽|一汽|东风|长安|小米汽车|极氪|零跑|宁德时代|SHACMAN|Shaanxi|陕汽|Great\s*Wall|GWM|长城汽车|哈弗|坦克|魏牌|欧拉|炮|\bautomotive\b|\bautomaker\b|\bvehicle\b|\bvehicles\b|\bcar\b|\bcars\b|\bev\b|\bnev\b|electric vehicle|commercial vehicle|\btruck\b|\btrucks\b|battery|charging|supplier|supply chain|vehicle sales|auto sales|robotaxi|autonomous driving|smart driving|\badas\b|mobility|\boem\b|auto export|\bbyd\b|\bnio\b|\bxpeng\b|li auto|\bgeely\b|\bchery\b|\bsaic\b|\bfaw\b|\bdongfeng\b|\bchangan\b|xiaomi auto|\bzeekr\b|\bleapmotor\b|\bcatl\b|\bavatr\b|\bvoyah\b/iu;
const economyPattern =
  /工业|制造业|经济|外贸|进出口|出口|进口|投资|消费|生产|采购经理|供应链|关税|政策|监管|industrial|manufacturing|economy|economic|foreign trade|imports?|exports?|investment|production|factory|factories|\bpmi\b|retail sales|tariff|regulation|policy|foreign investment|supply chain/iu;
const technologyPattern =
  /人工智能|机器人|半导体|芯片|软件|智能驾驶|自动驾驶|电池|科技|\bai\b|artificial intelligence|robotics?|semiconductor|chips?|software|smart driving|autonomous|battery|technology|mobility|lidar|sensor/iu;
const tradePattern =
  /外贸|出口|进口|海外|关税|贸易|海关|export|import|overseas|tariff|trade|customs|locali[sz]ation|global market/iu;
const policyPattern =
  /政策|监管|标准|法规|补贴|policy|regulation|standard|rules?|guideline|subsidy|compliance/iu;

const specialistSourceIds = new Set([
  "shaanxi-auto",
  "caam",
  "people-auto",
  "xinhua-auto",
  "cctv-auto",
  "gasgoo",
  "cnevpost",
  "yicai-auto",
  "autohome",
  "yiche",
  "pcauto",
  "carnewschina",
]);

const stopWords = new Set([
  "и", "в", "во", "на", "с", "со", "по", "для", "из", "к", "ко", "о", "об", "от", "до", "за", "у", "как", "что", "это", "уже", "новый", "новая", "новые", "китай", "китая", "китайский", "китайская", "китайские",
  "the", "a", "an", "and", "or", "for", "of", "to", "in", "on", "at", "with", "from", "by", "as", "is", "are", "new", "china", "chinese",
]);

function decodeHtml(value: string) {
  const entities: Record<string, string> = {
    amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", laquo: "«", raquo: "»", mdash: "—", ndash: "–",
  };
  return value
    .replace(/<br\s*\/?\s*>/giu, "\n")
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/giu, (match, name: string) => entities[name.toLowerCase()] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

function detectBrand(text: string): Brand {
  for (const [brand, pattern] of brandPatterns) if (pattern.test(text)) return brand;
  return "Отрасль";
}

function shorten(value: string, length: number) {
  if (value.length <= length) return value;
  const shortened = value.slice(0, length - 1).replace(/\s+\S*$/, "");
  return `${shortened}…`;
}

function compactSummary(value: string, title = "", length = 260) {
  let cleaned = decodeHtml(value)
    .replace(/https?:\/\/\S+/giu, "")
    .replace(title, "")
    .replace(/^[\s—–:;,.]+/u, "")
    .trim();
  if (!cleaned) cleaned = decodeHtml(value).trim();
  const sentences = cleaned.match(/[^.!?。！？]+[.!?。！？]+/gu) ?? [];
  const complete = sentences.find((sentence) => sentence.trim().length >= 24)?.trim();
  let result = complete || cleaned;
  if (result.length > length) result = result.slice(0, length).replace(/\s+\S*$/u, "").replace(/[,:;—–\s]+$/u, "");
  result = result.replace(/[…\s]+$/u, "");
  if (result && !/[.!?。！？]$/u.test(result)) result += ".";
  return result;
}

function makeTitle(text: string) {
  const firstSentence = text.match(/^.{20,180}?[.!?](?:\s|$)/u)?.[0] ?? text;
  return shorten(firstSentence.trim(), 150);
}

function absoluteUrl(href: string, base: string) {
  try {
    const url = new URL(decodeHtml(href), base);
    if (!/^https?:$/u.test(url.protocol)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|spm|from|source|ref|trk|fbclid|gclid)/iu.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function canonicalUrl(value: string) {
  const normalized = absoluteUrl(value, value) ?? value;
  try {
    const url = new URL(normalized);
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
    return url.toString();
  } catch {
    return normalized;
  }
}

async function fetchText(url: string, requestSignal?: AbortSignal) {
  const response = await safeFetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; WindowToChina/1.7; internal-corporate-news-reader)",
      accept: "text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en,zh-CN;q=0.9,ru;q=0.8",
    },
    signal: requestSignal
      ? AbortSignal.any([requestSignal, AbortSignal.timeout(Number(process.env.NEWS_FETCH_TIMEOUT_MS || 5000))])
      : AbortSignal.timeout(Number(process.env.NEWS_FETCH_TIMEOUT_MS || 5000)),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchTelegramChannel(handle: string, requestSignal?: AbortSignal): Promise<NewsItem[]> {
  const html = await fetchText(`https://t.me/s/${handle}`, requestSignal);
  const chunks = html.split("tgme_widget_message_wrap").slice(1);
  const items: NewsItem[] = [];
  for (const chunk of chunks) {
    const post = chunk.match(/data-post="([^"]+)"/u)?.[1];
    const datetime = chunk.match(/<time[^>]+datetime="([^"]+)"/u)?.[1];
    const body = chunk.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/u)?.[1];
    if (!post || !datetime || !body) continue;
    const text = decodeHtml(body);
    if (text.length < 28) continue;
    const postId = post.split("/").at(-1) ?? post;
    items.push({
      id: `telegram-${handle}-${postId}`,
      title: makeTitle(text),
      summary: compactSummary(text, makeTitle(text)),
      source: sourceNames.get(handle) ?? `@${handle}`,
      sourceType: "telegram",
      url: `https://t.me/${post}`,
      publishedAt: datetime,
      market: "Россия",
      brand: detectBrand(text),
      live: true,
    });
  }
  return items.slice(-24);
}

function unwrapXml(value: string) {
  return decodeHtml(value.replace(/^<!\[CDATA\[/u, "").replace(/\]\]>$/u, ""));
}

async function fetchAutostatRss(requestSignal?: AbortSignal): Promise<NewsItem[]> {
  const xml = await fetchText("https://www.autostat.ru/news/rss/3/", requestSignal);
  const items: NewsItem[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/giu)) {
    const item = match[1];
    const titleRaw = item.match(/<title>([\s\S]*?)<\/title>/iu)?.[1];
    const linkRaw = item.match(/<link>([\s\S]*?)<\/link>/iu)?.[1];
    const dateRaw = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/iu)?.[1];
    const descriptionRaw = item.match(/<description>([\s\S]*?)<\/description>/iu)?.[1];
    if (!titleRaw || !linkRaw || !dateRaw) continue;
    const title = unwrapXml(titleRaw);
    const link = unwrapXml(linkRaw);
    const description = descriptionRaw ? unwrapXml(descriptionRaw) : title;
    const published = new Date(dateRaw);
    if (Number.isNaN(published.getTime())) continue;
    items.push({
      id: `autostat-${link.match(/\/(\d+)\/?$/u)?.[1] ?? encodeURIComponent(link)}`,
      title: shorten(title, 160),
      summary: compactSummary(description, title),
      source: "АВТОСТАТ",
      sourceType: "media",
      url: link,
      publishedAt: published.toISOString(),
      market: "Россия",
      brand: detectBrand(`${title} ${description}`),
      live: true,
    });
  }
  return items.slice(0, 50);
}

async function translateToRussian(value: string, language: NewsSourceLanguage, requestSignal?: AbortSignal) {
  const sourceLanguage = language === "zh" ? "zh-CN" : "en";
  if (!value.trim()) return value;
  if (language === "zh" && !/[\u3400-\u9fff]/u.test(value)) return value;
  try {
    const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
    endpoint.search = new URLSearchParams({ client: "gtx", sl: sourceLanguage, tl: "ru", dt: "t", q: value }).toString();
    const signal = requestSignal
      ? AbortSignal.any([requestSignal, AbortSignal.timeout(Number(process.env.NEWS_TRANSLATE_TIMEOUT_MS || 3200))])
      : AbortSignal.timeout(Number(process.env.NEWS_TRANSLATE_TIMEOUT_MS || 3200));
    const response = await safeFetch(endpoint, { signal });
    if (!response.ok) return value;
    const payload = (await response.json()) as Array<Array<Array<string>>>;
    return payload[0]?.map((part) => part[0]).join("") || value;
  } catch {
    return value;
  }
}

function metaValue(html: string, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  for (const tag of html.matchAll(/<meta\b[^>]*>/giu)) {
    const value = tag[0];
    const key = value.match(/(?:name|property)=["']([^"']+)["']/iu)?.[1]?.toLowerCase();
    if (!key || !normalizedNames.includes(key)) continue;
    const content = value.match(/content=["']([^"']+)["']/iu)?.[1];
    if (content) return decodeHtml(content);
  }
  return "";
}

function articleBodyPreview(html: string) {
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/giu)]
    .map((match) => decodeHtml(match[1]))
    .filter((value) => value.length >= 60 && value.length <= 1200);
  return paragraphs.slice(0, 2).join(" ");
}

function articleDate(html: string) {
  const raw =
    metaValue(html, ["article:published_time", "pubdate", "publishdate", "date", "datepublished"]) ||
    html.match(/["']datePublished["']\s*:\s*["']([^"']+)["']/iu)?.[1] ||
    html.match(/(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?)/u)?.[1];
  if (!raw) return null;
  const normalized = raw.replace("年", "-").replace("月", "-").replace("日", "").replaceAll("/", "-");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function sourceRelevant(source: NewsWebsiteSource, title: string) {
  const trimmed = title.trim();
  if (trimmed.length < 8 || trimmed.length > 180) return false;
  if (/^(home|news|more|read more|首页|新闻|更多|登录|注册|视频|工作动态|文件发布|机构职责|办事指南|协会工作|统计数据|行业培训)$/iu.test(trimmed)) return false;
  if (specialistSourceIds.has(source.id)) return true;
  return source.focus.some((focus) => {
    if (focus === "auto" || focus === "ev") return autoIndustryPattern.test(trimmed);
    if (focus === "economy") return economyPattern.test(trimmed);
    if (focus === "technology") return technologyPattern.test(trimmed);
    if (focus === "trade") return tradePattern.test(trimmed);
    return policyPattern.test(trimmed);
  });
}

function allowedHostsForSource(source: NewsWebsiteSource) {
  const base = new URL(source.url).hostname.toLowerCase();
  return new Set([base, ...(source.hostAliases ?? []).map((host) => host.toLowerCase())]);
}

async function fetchWebsiteArticle(
  source: NewsWebsiteSource,
  candidate: { title: string; url: string },
  requestSignal?: AbortSignal,
) {
  try {
    const html = await fetchText(candidate.url, requestSignal);
    const description = metaValue(html, ["description", "og:description", "twitter:description"]) || articleBodyPreview(html);
    const publishedAt = articleDate(html);
    if (!publishedAt || description.length < 24) return null;

    const [translatedTitle, translatedDescription] = await Promise.all([
      translateToRussian(candidate.title, source.language, requestSignal),
      translateToRussian(description, source.language, requestSignal),
    ]);

    if (source.language === "zh") {
      if (translatedTitle === candidate.title || /[\u3400-\u9fff]/u.test(translatedTitle)) return null;
      if (/[\u3400-\u9fff]/u.test(translatedDescription)) return null;
    }

    return {
      title: translatedTitle,
      summary: compactSummary(translatedDescription, translatedTitle),
      publishedAt,
      translated: translatedTitle !== candidate.title || translatedDescription !== description,
    };
  } catch {
    return null;
  }
}

async function fetchWebsitePortal(source: NewsWebsiteSource, requestSignal?: AbortSignal): Promise<NewsItem[]> {
  const html = await fetchText(source.url, requestSignal);
  const candidates = new Map<string, { title: string; url: string }>();
  const allowedHosts = allowedHostsForSource(source);

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu)) {
    const originalTitle = decodeHtml(match[2]);
    if (!sourceRelevant(source, originalTitle)) continue;
    const candidateUrl = absoluteUrl(match[1], source.url);
    if (!candidateUrl) continue;
    let host = "";
    try { host = new URL(candidateUrl).hostname.toLowerCase(); } catch { continue; }
    if (!allowedHosts.has(host) || candidates.has(candidateUrl)) continue;
    candidates.set(candidateUrl, { title: originalTitle, url: candidateUrl });
  }

  const ranked = [...candidates.values()]
    .sort((left, right) => {
      const rightBrand = detectBrand(right.title) === "Отрасль" ? 0 : 1;
      const leftBrand = detectBrand(left.title) === "Отрасль" ? 0 : 1;
      return rightBrand - leftBrand || right.title.length - left.title.length;
    })
    .slice(0, source.maxCandidates ?? 2);

  const enriched = await Promise.all(
    ranked.map(async (candidate) => {
      const article = await fetchWebsiteArticle(source, candidate, requestSignal);
      if (!article) return null;
      return {
        id: `web-${source.id}-${encodeURIComponent(canonicalUrl(candidate.url))}`,
        title: shorten(article.title, 160),
        originalTitle: candidate.title,
        summary: article.summary,
        source: source.name,
        sourceType: source.sourceType,
        url: candidate.url,
        publishedAt: article.publishedAt,
        market: source.market,
        brand: detectBrand(`${candidate.title} ${article.title}`),
        translated: article.translated,
        live: true,
      } satisfies NewsItem;
    }),
  );
  return enriched.filter((item): item is NewsItem => item !== null);
}

function normalizeTokens(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/[ё]/gu, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function titleFingerprint(value: string) {
  return normalizeTokens(value).join(" ").slice(0, 180);
}

function tokenSimilarity(left: string, right: string) {
  const a = new Set(normalizeTokens(left));
  const b = new Set(normalizeTokens(right));
  if (!a.size || !b.size) return { jaccard: 0, containment: 0, common: 0 };
  let common = 0;
  for (const token of a) if (b.has(token)) common += 1;
  const union = a.size + b.size - common;
  return {
    jaccard: union ? common / union : 0,
    containment: common / Math.min(a.size, b.size),
    common,
  };
}

function likelySameStory(left: NewsItem, right: NewsItem) {
  const leftTime = Date.parse(left.publishedAt);
  const rightTime = Date.parse(right.publishedAt);
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return false;
  const windowMs = Number(process.env.NEWS_DEDUPE_WINDOW_HOURS || 72) * 3600 * 1000;
  if (Math.abs(leftTime - rightTime) > windowMs) return false;
  if (left.brand !== "Отрасль" && right.brand !== "Отрасль" && left.brand !== right.brand) return false;

  const leftTitle = left.originalTitle ?? left.title;
  const rightTitle = right.originalTitle ?? right.title;
  if (titleFingerprint(leftTitle) === titleFingerprint(rightTitle)) return true;

  const translatedScore = tokenSimilarity(left.title, right.title);
  const originalScore = tokenSimilarity(leftTitle, rightTitle);
  const score = translatedScore.jaccard >= originalScore.jaccard ? translatedScore : originalScore;
  return score.common >= 3 && (score.jaccard >= 0.68 || score.containment >= 0.82);
}

function deduplicateNews(items: NewsItem[]) {
  const candidates = [...items].sort((left, right) => {
    const priority = priorityForNewsItem(right) - priorityForNewsItem(left);
    if (priority) return priority;
    const live = Number(Boolean(right.live)) - Number(Boolean(left.live));
    if (live) return live;
    return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  });

  const accepted: NewsItem[] = [];
  const urls = new Set<string>();
  for (const item of candidates) {
    const canonical = canonicalUrl(item.url);
    if (urls.has(canonical)) continue;
    if (accepted.some((existing) => likelySameStory(existing, item))) continue;
    urls.add(canonical);
    accepted.push(item);
  }

  return accepted.sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

function withinFreshnessWindow(item: NewsItem) {
  const published = Date.parse(item.publishedAt);
  if (!Number.isFinite(published)) return false;
  const now = Date.now();
  const maxAgeMs = Number(process.env.NEWS_MAX_AGE_DAYS || 45) * 86400 * 1000;
  return published <= now + 86400 * 1000 && published >= now - maxAgeMs;
}

function withDeadline<T>(promise: Promise<T>, timeoutMs = Number(process.env.NEWS_SOURCE_DEADLINE_MS || 7500)): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("source deadline exceeded")), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

type NewsJob = { key: string; run: () => Promise<NewsItem[]> };
type JobResult = {
  key: string;
  state: "live" | "stale" | "empty" | "error";
  items: NewsItem[];
  latencyMs: number;
  error?: string;
};

async function executeJob(job: NewsJob): Promise<JobResult> {
  const started = Date.now();
  const cacheKey = `news:source:v${NEWS_SOURCE_CATALOG_VERSION}:${job.key}`;
  const previous = getSourceSnapshot<NewsItem[]>(cacheKey);
  try {
    const fetched = (await withDeadline(job.run())).filter(withinFreshnessWindow);
    if (!fetched.length && previous && previous.state !== "expired" && previous.payload.length) {
      recordSourceRun({ sourceKey: job.key, status: "empty-stale-fallback", qualityScore: 45, itemCount: 0, latencyMs: Date.now() - started });
      return { key: job.key, state: "stale", items: previous.payload.map((item) => ({ ...item, live: false })), latencyMs: Date.now() - started };
    }
    saveSourceSnapshot({
      cacheKey,
      sourceKey: job.key,
      payload: fetched,
      ttlMs: Number(process.env.NEWS_CACHE_TTL_SECONDS || 900) * 1000,
      staleMs: Number(process.env.NEWS_CACHE_STALE_SECONDS || 86400) * 1000,
      status: fetched.length ? "live" : "empty",
      qualityScore: fetched.length ? 100 : 65,
      itemCount: fetched.length,
      latencyMs: Date.now() - started,
    });
    return { key: job.key, state: fetched.length ? "live" : "empty", items: fetched, latencyMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : "source failed";
    recordSourceRun({ sourceKey: job.key, status: "failure", qualityScore: 0, latencyMs: Date.now() - started, error: message });
    if (previous && previous.state !== "expired" && previous.payload.length) {
      return { key: job.key, state: "stale", items: previous.payload.map((item) => ({ ...item, live: false })), latencyMs: Date.now() - started, error: message };
    }
    return { key: job.key, state: "error", items: [], latencyMs: Date.now() - started, error: message };
  }
}

async function runWithConcurrency(jobs: NewsJob[], concurrency: number) {
  const results: JobResult[] = new Array(jobs.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= jobs.length) return;
      results[index] = await executeJob(jobs[index]);
    }
  }
  const count = Math.max(1, Math.min(jobs.length || 1, concurrency));
  await Promise.all(Array.from({ length: count }, () => worker()));
  return results;
}

type NewsPayload = {
  news: NewsItem[];
  updatedAt: string;
  sourceCount: number;
  totalSources: number;
  disabledSources: string[];
  errors: string[];
  rawCount?: number;
  deduplicatedCount?: number;
  sourceCatalogVersion?: number;
  sourceBreakdown?: Array<{ source: string; state: string; items: number; latencyMs: number }>;
  cache?: { state: string; ageSeconds?: number; qualityScore?: number };
};

export async function GET(request: Request) {
  const context = createRequestContext(request);
  const limit = checkRateLimit({ context, scope: "news-read", limit: Number(process.env.RATE_LIMIT_READ_PER_MINUTE || 120) });
  if (!limit.allowed) return jsonWithContext(context, { error: "Слишком много запросов." }, { status: 429, headers: rateLimitHeaders(limit) });

  const runtime = await loadRuntimeConfig();
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1" && isSchedulerRequest(request);
  const revision = `${NEWS_SOURCE_CATALOG_VERSION}:${runtime.updatedAt}:${runtime.sources["news.telegram"]}:${runtime.sources["news.autostat"]}:${runtime.sources["news.chinaPortals"]}:${runtime.sources["translate.google"]}`;
  const cacheKey = `news:aggregate:${revision}`;
  const cached = getSourceSnapshot<NewsPayload>(cacheKey);
  if (!forceRefresh && cached?.state === "fresh") {
    return jsonWithContext(context, { ...cached.payload, cache: { state: "fresh", ageSeconds: cached.ageSeconds, qualityScore: cached.qualityScore } }, {
      headers: { "cache-control": "public, max-age=120, s-maxage=300", "x-data-cache": "fresh", ...rateLimitHeaders(limit) },
    });
  }

  const requestController = new AbortController();
  const requestDeadline = setTimeout(() => requestController.abort(), Number(process.env.NEWS_REQUEST_DEADLINE_MS || 14000));
  const websiteSources = runtime.sources["news.chinaPortals"] && runtime.sources["translate.google"] ? activeNewsWebsiteSources : [];
  const jobs: NewsJob[] = [
    ...(runtime.sources["news.telegram"] ? sourceChannels.map((source) => ({
      key: `news.telegram:${source.handle}`,
      run: () => fetchTelegramChannel(source.handle, requestController.signal),
    })) : []),
    ...(runtime.sources["news.autostat"] ? [{
      key: "news.autostat:rss",
      run: () => fetchAutostatRss(requestController.signal),
    }] : []),
    ...websiteSources.map((source) => ({
      key: `news.web:${source.id}`,
      run: () => fetchWebsitePortal(source, requestController.signal),
    })),
  ];

  const disabledSources = [
    ...(!runtime.sources["news.telegram"] ? ["news.telegram"] : []),
    ...(!runtime.sources["news.autostat"] ? ["news.autostat"] : []),
    ...(!runtime.sources["news.chinaPortals"] ? ["news.chinaPortals"] : []),
    ...(!runtime.sources["translate.google"] ? ["translate.google"] : []),
    ...newsWebsiteSources.filter((source) => !source.enabledByDefault).map((source) => `catalog:${source.id}`),
  ];

  const results = await runWithConcurrency(jobs, Number(process.env.NEWS_SOURCE_CONCURRENCY || 5));
  clearTimeout(requestDeadline);

  const errors = results.filter((result) => result.state === "error").map((result) => result.key);
  const degraded = results.filter((result) => result.state === "stale").map((result) => result.key);
  const clientErrors = [...errors, ...degraded.map((key) => `${key}:stale`)];
  if (clientErrors.length) logEvent("warn", "news_sources_degraded", { errors, stale: degraded });

  const rawNews = results.flatMap((result) => result.items).filter(withinFreshnessWindow);
  const unique = deduplicateNews(rawNews).slice(0, 120);

  if (!unique.length && cached?.state === "stale") {
    return jsonWithContext(context, {
      ...cached.payload,
      errors: [...new Set([...(cached.payload.errors || []), ...clientErrors])],
      cache: { state: "stale", ageSeconds: cached.ageSeconds, qualityScore: cached.qualityScore },
    }, { headers: { "cache-control": "public, max-age=60", "x-data-cache": "stale", ...rateLimitHeaders(limit) } });
  }

  const liveSources = results.filter((result) => result.state === "live").length;
  const staleSources = results.filter((result) => result.state === "stale").length;
  const qualityScore = jobs.length ? Math.round(((liveSources + staleSources * 0.5) / jobs.length) * 100) : 0;
  const payload: NewsPayload = {
    news: unique,
    updatedAt: new Date().toISOString(),
    sourceCount: liveSources,
    totalSources: jobs.length,
    disabledSources,
    errors: clientErrors,
    rawCount: rawNews.length,
    deduplicatedCount: Math.max(0, rawNews.length - unique.length),
    sourceCatalogVersion: NEWS_SOURCE_CATALOG_VERSION,
    sourceBreakdown: results.map((result) => ({ source: result.key, state: result.state, items: result.items.length, latencyMs: result.latencyMs })),
    cache: { state: unique.length ? (clientErrors.length ? "partial" : "live") : "miss", ageSeconds: 0, qualityScore },
  };

  if (unique.length) {
    saveSourceSnapshot({
      cacheKey,
      sourceKey: "news.aggregate",
      payload,
      ttlMs: Number(process.env.NEWS_CACHE_TTL_SECONDS || 900) * 1000,
      staleMs: Number(process.env.NEWS_CACHE_STALE_SECONDS || 21600) * 1000,
      status: clientErrors.length ? "partial" : "live",
      qualityScore,
      itemCount: unique.length,
      error: clientErrors.join(", "),
    });
  } else {
    recordSourceRun({ sourceKey: "news.aggregate", status: jobs.length ? "failure" : "disabled", qualityScore, itemCount: 0, error: clientErrors.join(", ") });
  }

  return jsonWithContext(context, payload, {
    headers: {
      "cache-control": "public, max-age=120, s-maxage=300, stale-while-revalidate=3600",
      "x-data-cache": payload.cache?.state || "live",
      ...rateLimitHeaders(limit),
    },
  });
}
