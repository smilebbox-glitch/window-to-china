import type { NewsItem } from "@/lib/data";

export type FocusEntity = "SHACMAN" | "GWM" | "EVOLUTE" | "VOYAH" | "Моторинвест" | "ЭВИА";

export const focusEntities: readonly FocusEntity[] = [
  "SHACMAN",
  "GWM",
  "EVOLUTE",
  "VOYAH",
  "Моторинвест",
  "ЭВИА",
] as const;

const focusPatterns: ReadonlyArray<{ entity: FocusEntity; pattern: RegExp }> = [
  { entity: "SHACMAN", pattern: /\bshacman\b|\bshaanxi\b|шакман|шаанси|陕汽/iu },
  { entity: "GWM", pattern: /\bgwm\b|great\s*wall|г(?:р|рэ)ейт\s*волл|\bhaval\b|\btank\b|\bwey\b|\bora\b|хавейл|хавал|танк|长城|哈弗|坦克|魏牌|欧拉/iu },
  { entity: "EVOLUTE", pattern: /\bevolute\b|эволют/iu },
  { entity: "VOYAH", pattern: /\bvoyah\b|воях|войя|воя\b|岚图/iu },
  { entity: "Моторинвест", pattern: /\bmotorinvest\b|моторинвест/iu },
  { entity: "ЭВИА", pattern: /\bevia\b|(?:ао\s*[«"“]?\s*)?эвиа\b/iu },
];

export function detectFocusEntities(item: Pick<NewsItem, "title" | "summary" | "source" | "originalTitle">): FocusEntity[] {
  const text = `${item.title} ${item.summary} ${item.originalTitle ?? ""} ${item.source}`;
  return focusPatterns.filter(({ pattern }) => pattern.test(text)).map(({ entity }) => entity);
}

export function isFocusNews(item: Pick<NewsItem, "title" | "summary" | "source" | "originalTitle">) {
  return detectFocusEntities(item).length > 0;
}

export function focusScore(item: Pick<NewsItem, "title" | "summary" | "source" | "originalTitle">) {
  return isFocusNews(item) ? 38 : 0;
}
