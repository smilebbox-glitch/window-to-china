import type { NewsItem } from "@/lib/data";
import { priorityForNewsItem } from "@/lib/news-sources";

export type IntelligenceAudience = "Руководство" | "R&D" | "Закупки" | "Производство" | "Логистика";
export type IntelligenceSignal = "Регулирование" | "Локализация" | "Поставки" | "Технологии" | "Рынок" | "Инвестиции" | "Качество и риски" | "Экспорт и торговля";
export type IntelligenceLevel = "Критично" | "Высокий приоритет" | "Наблюдение" | "Фон";
export type TruckSegment = "HCV · тяжёлые" | "MCV · среднетоннажные" | "LCV · лёгкие" | "Тягачи" | "Самосвалы / стройка" | "Шасси / спецтехника" | "Грузовики · общий";
export type TruckPowertrain = "Дизель" | "LNG / CNG" | "Электро" | "Battery swap" | "Водород" | "Гибрид";
export type TruckBrandOrigin = "Китай" | "Россия" | "Другой";

export type AudienceImpact = {
  audience: IntelligenceAudience;
  score: number;
  reasons: string[];
};

export type IntelligenceAssessment = {
  score: number;
  level: IntelligenceLevel;
  confidence: "высокая" | "средняя" | "базовая";
  signals: IntelligenceSignal[];
  audiences: AudienceImpact[];
  primaryAudience: IntelligenceAudience;
  whyItMatters: string;
  recommendedAction: string;
};

export type TruckBrandHit = {
  brand: string;
  origin: TruckBrandOrigin;
};

export type CommercialVehicleAssessment = {
  score: number;
  level: IntelligenceLevel;
  segment: TruckSegment;
  brands: TruckBrandHit[];
  powertrains: TruckPowertrain[];
  focusMarkets: Array<"Китай" | "Россия">;
  signals: IntelligenceSignal[];
  audiences: AudienceImpact[];
  whyItMatters: string;
  recommendedAction: string;
};

export type RankedNewsItem = NewsItem & {
  intelligence: IntelligenceAssessment;
  commercialVehicle?: CommercialVehicleAssessment;
};

const signalRules: Array<{ signal: IntelligenceSignal; pattern: RegExp; weight: number; reason: string }> = [
  {
    signal: "Регулирование",
    pattern: /санкц|пошлин|тариф|правил|регулир|закон|стандарт|сертифик|допуск|комплаенс|утилизац|policy|tariff|regulat|standard|compliance|guideline|recall|召回|政策|监管|标准|法规|补贴/iu,
    weight: 24,
    reason: "может изменить требования к продукту, срокам или условиям работы на рынке",
  },
  {
    signal: "Локализация",
    pattern: /локализ|завод|производств|сборк|мощност|линия|конвейер|locali[sz]|factory|plant|assembly|capacity|工厂|产能|本地化|生产线/iu,
    weight: 22,
    reason: "затрагивает локализацию, производственную модель или распределение мощностей",
  },
  {
    signal: "Поставки",
    pattern: /постав|поставщик|компонент|комплектующ|дефицит|логист|склад|цепочк|supplier|component|supply chain|delivery|shipment|供应链|零部件|交付/iu,
    weight: 20,
    reason: "может повлиять на компоненты, сроки поставки или устойчивость цепочки снабжения",
  },
  {
    signal: "Технологии",
    pattern: /технолог|батаре|электро|гибрид|водород|автоном|автопилот|робот|software|battery|electric|hybrid|hydrogen|autonomous|robot|智能驾驶|自动驾驶|电池|新能源|氢/iu,
    weight: 18,
    reason: "содержит технологический сигнал, который стоит проверить для продуктовых и инженерных решений",
  },
  {
    signal: "Рынок",
    pattern: /продаж|рынок|доля|регистрац|спрос|цена|парк|sales|market share|registrat|demand|price|销量|市场|价格|保有量/iu,
    weight: 16,
    reason: "показывает изменение спроса, конкурентной позиции или структуры рынка",
  },
  {
    signal: "Инвестиции",
    pattern: /инвестиц|сделк|альянс|партнер|совместн|капитал|investment|deal|alliance|joint venture|partnership|投资|合作|合资/iu,
    weight: 15,
    reason: "указывает на изменение партнёрств, капитальных планов или конкурентной структуры",
  },
  {
    signal: "Качество и риски",
    pattern: /качест|дефект|отзыв|неисправ|безопасност|риск|quality|defect|recall|failure|safety|risk|质量|缺陷|安全|风险/iu,
    weight: 19,
    reason: "содержит сигнал качества, безопасности или операционного риска",
  },
  {
    signal: "Экспорт и торговля",
    pattern: /экспорт|импорт|внешн.*торгов|тамож|границ|зарубеж|export|import|customs|border|overseas|出口|进口|海关|海外/iu,
    weight: 21,
    reason: "может влиять на импорт, экспорт, таможенные процедуры или доступность техники и компонентов",
  },
];

const audienceRules: Array<{ audience: IntelligenceAudience; pattern: RegExp; signalBoosts: IntelligenceSignal[] }> = [
  {
    audience: "Руководство",
    pattern: /стратег|инвестиц|альянс|сделк|рынок|доля|санкц|пошлин|экспорт|локализ|strategy|investment|market share|tariff|export|战略|投资|市场|出口/iu,
    signalBoosts: ["Регулирование", "Рынок", "Инвестиции", "Экспорт и торговля", "Локализация"],
  },
  {
    audience: "R&D",
    pattern: /технолог|двигател|батаре|электро|водород|платформ|шасси|автоном|software|battery|engine|platform|chassis|autonomous|电池|底盘|智能驾驶|新能源/iu,
    signalBoosts: ["Технологии", "Качество и риски", "Регулирование"],
  },
  {
    audience: "Закупки",
    pattern: /поставщик|компонент|комплектующ|закуп|цена|дефицит|импорт|supplier|component|procurement|price|shortage|import|供应商|零部件|采购|进口/iu,
    signalBoosts: ["Поставки", "Экспорт и торговля", "Рынок"],
  },
  {
    audience: "Производство",
    pattern: /производств|завод|сборк|линия|мощност|локализ|качест|factory|plant|assembly|line|capacity|quality|工厂|生产|装配|产能|质量/iu,
    signalBoosts: ["Локализация", "Качество и риски", "Поставки", "Технологии"],
  },
  {
    audience: "Логистика",
    pattern: /логист|поставк|перевоз|тягач|грузов|границ|тамож|доставк|маршрут|freight|logistics|truck|tractor|border|customs|delivery|物流|重卡|卡车|牵引车|海关/iu,
    signalBoosts: ["Поставки", "Экспорт и торговля", "Рынок", "Регулирование"],
  },
];

const truckBrandRules: Array<{ brand: string; origin: TruckBrandOrigin; pattern: RegExp }> = [
  { brand: "SHACMAN", origin: "Китай", pattern: /shacman|shaanxi|陕汽|шакман|шаанси/iu },
  { brand: "SITRAK / SINOTRUK / HOWO", origin: "Китай", pattern: /sitrak|sinotruk|howo|中国重汽|汕德卡|ситрак|синатрак|хово/iu },
  { brand: "FAW Jiefang", origin: "Китай", pattern: /\bfaw\b|jiefang|一汽解放|фав/iu },
  { brand: "Dongfeng", origin: "Китай", pattern: /dongfeng|东风|донгфенг|дунфэн/iu },
  { brand: "Foton / Auman", origin: "Китай", pattern: /foton|auman|福田|欧曼|фотон|ауман/iu },
  { brand: "JAC", origin: "Китай", pattern: /\bjac\b|江淮|джак/iu },
  { brand: "SANY", origin: "Китай", pattern: /\bsany\b|三一|сани/iu },
  { brand: "XCMG", origin: "Китай", pattern: /\bxcmg\b|徐工|сюйгун/iu },
  { brand: "Farizon", origin: "Китай", pattern: /farizon|远程|фаризон/iu },
  { brand: "Chery Commercial", origin: "Китай", pattern: /chery commercial|奇瑞商用车|чери.*коммерч/iu },
  { brand: "KAMAZ", origin: "Россия", pattern: /kamaz|камаз|КАМАЗ/iu },
  { brand: "УРАЛ", origin: "Россия", pattern: /\bural\b|урал(?:-|\s|\b)|УРАЛ/iu },
  { brand: "GAZ", origin: "Россия", pattern: /\bgaz\b|газель|газон|валдай|\bгаз\b/iu },
  { brand: "Sollers", origin: "Россия", pattern: /sollers|соллерс/iu },
];

const truckCorePattern = /грузов|грузовик|тягач|седельн|самосвал|шасси|коммерческ.*транспорт|тяжел.*автомоб|среднетоннаж|малотоннаж|\bhcv\b|\bmcv\b|\blcv\b|heavy[- ]duty|medium[- ]duty|light commercial|commercial vehicle|truck|tractor|tipper|dump truck|chassis|重卡|中卡|轻卡|卡车|牵引车|商用车|货车|自卸车|底盘/iu;

const segmentRules: Array<{ segment: TruckSegment; pattern: RegExp }> = [
  { segment: "Тягачи", pattern: /тягач|седельн|tractor|prime mover|牵引车/iu },
  { segment: "Самосвалы / стройка", pattern: /самосвал|карьер|строй|dump truck|tipper|mining|construction|自卸车|工程车|矿区/iu },
  { segment: "Шасси / спецтехника", pattern: /шасси|спецтех|специальн.*автомоб|chassis|special purpose|底盘|专用车/iu },
  { segment: "HCV · тяжёлые", pattern: /крупнотоннаж|тяжел.*груз|тяжёл.*груз|\bhcv\b|heavy[- ]duty|heavy truck|重卡|重型卡车/iu },
  { segment: "MCV · среднетоннажные", pattern: /среднетоннаж|\bmcv\b|medium[- ]duty|中卡/iu },
  { segment: "LCV · лёгкие", pattern: /малотоннаж|легк.*коммерческ|\blcv\b|light commercial|light truck|轻卡|微卡/iu },
];

const powertrainRules: Array<{ powertrain: TruckPowertrain; pattern: RegExp }> = [
  { powertrain: "Battery swap", pattern: /battery swap|swap station|сменн.*батар|замен.*батар|换电|换电站/iu },
  { powertrain: "Водород", pattern: /водород|топливн.*элемент|hydrogen|fuel cell|氢|燃料电池/iu },
  { powertrain: "Гибрид", pattern: /гибрид|hybrid|插混|混动/iu },
  { powertrain: "Электро", pattern: /электрич|электро|bev|battery electric|electric truck|纯电|电动|新能源重卡/iu },
  { powertrain: "LNG / CNG", pattern: /\blng\b|\bcng\b|газомотор|метан|природн.*газ|天然气|燃气/iu },
  { powertrain: "Дизель", pattern: /дизел|diesel|柴油/iu },
];

function articleText(item: NewsItem) {
  return `${item.title} ${item.summary} ${item.originalTitle ?? ""}`;
}

function ageScore(publishedAt: string) {
  const ageHours = Math.max(0, (Date.now() - Date.parse(publishedAt)) / 3_600_000);
  if (!Number.isFinite(ageHours)) return 0;
  if (ageHours <= 24) return 18;
  if (ageHours <= 72) return 15;
  if (ageHours <= 168) return 12;
  if (ageHours <= 720) return 7;
  return 2;
}

function levelFor(score: number): IntelligenceLevel {
  if (score >= 76) return "Критично";
  if (score >= 56) return "Высокий приоритет";
  if (score >= 32) return "Наблюдение";
  return "Фон";
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function audienceImpacts(text: string, signals: IntelligenceSignal[], commercialVehicle = false): AudienceImpact[] {
  return audienceRules
    .map((rule) => {
      const reasons: string[] = [];
      let score = 0;
      if (rule.pattern.test(text)) {
        score += 28;
        reasons.push("прямое совпадение с функцией подразделения");
      }
      const matchedSignals = rule.signalBoosts.filter((signal) => signals.includes(signal));
      score += matchedSignals.length * 12;
      if (matchedSignals.length) reasons.push(`сигналы: ${matchedSignals.join(", ")}`);
      if (commercialVehicle && rule.audience === "Логистика") {
        score += 18;
        reasons.push("грузовой транспорт напрямую влияет на транспортную модель");
      }
      if (commercialVehicle && rule.audience === "Закупки") {
        score += 8;
        reasons.push("важно для мониторинга доступности техники и компонентов");
      }
      return { audience: rule.audience, score: Math.min(100, score), reasons };
    })
    .sort((left, right) => right.score - left.score);
}

function baseWhy(signals: IntelligenceSignal[], reasons: string[]) {
  if (!signals.length) return "Материал сохраняется как фоновый отраслевой сигнал; явного бизнес-триггера пока не обнаружено.";
  const first = reasons[0] ?? "может потребовать дополнительной оценки";
  const second = reasons[1];
  return `Важно: ${first}${second ? `; также ${second}` : ""}.`;
}

function actionFor(signals: IntelligenceSignal[], primaryAudience: IntelligenceAudience) {
  if (signals.includes("Регулирование")) return `Проверить первоисточник и оценить влияние требований вместе с ${primaryAudience}.`;
  if (signals.includes("Поставки")) return `Проверить затрагиваемые компоненты, поставщиков и сроки вместе с ${primaryAudience}.`;
  if (signals.includes("Локализация")) return `Сопоставить новость с текущими планами локализации и производственными предпосылками.`;
  if (signals.includes("Технологии")) return `Передать сигнал в R&D для короткой технической оценки применимости.`;
  if (signals.includes("Рынок")) return `Добавить в рыночный мониторинг и проверить динамику по следующим публикациям.`;
  if (signals.includes("Экспорт и торговля")) return `Проверить влияние на импорт/экспорт, логистический маршрут и таможенные условия.`;
  return `Сохранить в наблюдение ${primaryAudience} и проверить развитие сигнала.`;
}

export function assessNewsItem(item: NewsItem): IntelligenceAssessment {
  const text = articleText(item);
  const matched = signalRules.filter((rule) => rule.pattern.test(text));
  const signals = matched.map((rule) => rule.signal);
  const reasons = matched.map((rule) => rule.reason);
  const sourceScore = Math.max(4, Math.round((priorityForNewsItem(item) - 50) * 0.28));
  const brandFocus = item.brand === "SHACMAN" || item.brand === "GWM" ? 12 : 0;
  const signalScore = Math.min(48, matched.reduce((sum, rule) => sum + rule.weight, 0));
  const score = Math.min(100, sourceScore + ageScore(item.publishedAt) + brandFocus + signalScore);
  const audiences = audienceImpacts(text, signals, truckCorePattern.test(text));
  const primaryAudience = audiences[0]?.audience ?? "Руководство";
  const confidence = item.sourceType === "official" && matched.length >= 2 ? "высокая" : matched.length >= 2 ? "средняя" : "базовая";
  return {
    score,
    level: levelFor(score),
    confidence,
    signals,
    audiences,
    primaryAudience,
    whyItMatters: baseWhy(signals, reasons),
    recommendedAction: actionFor(signals, primaryAudience),
  };
}

export function assessCommercialVehicle(item: NewsItem): CommercialVehicleAssessment | null {
  const text = articleText(item);
  const brands = truckBrandRules.filter((rule) => rule.pattern.test(text)).map((rule) => ({ brand: rule.brand, origin: rule.origin }));
  const isTruck = truckCorePattern.test(text) || brands.length > 0;
  if (!isTruck) return null;

  const general = assessNewsItem(item);
  const segment = segmentRules.find((rule) => rule.pattern.test(text))?.segment ?? "Грузовики · общий";
  const powertrains = unique(powertrainRules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.powertrain));
  const focusMarkets = unique([
    ...(item.market === "Россия" ? (["Россия"] as const) : []),
    ...(item.market === "Китай" ? (["Китай"] as const) : []),
    ...(/росси|russia|российск/iu.test(text) ? (["Россия"] as const) : []),
    ...(/китай|china|chinese|中国|国内/iu.test(text) ? (["Китай"] as const) : []),
  ]);

  const directTruckScore = 14;
  const brandScore = Math.min(14, brands.length * 7);
  const powertrainScore = powertrains.length ? 8 : 0;
  const crossMarketScore = focusMarkets.length > 1 ? 8 : 0;
  const score = Math.min(100, general.score + directTruckScore + brandScore + powertrainScore + crossMarketScore);
  const audiences = audienceImpacts(text, general.signals, true);

  const brandText = brands.length ? `бренды ${brands.map((item) => item.brand).join(", ")}` : "грузовой сегмент";
  const marketText = focusMarkets.length ? focusMarkets.join(" ↔ ") : item.market;
  const technologyText = powertrains.length ? `; силовая линия: ${powertrains.join(", ")}` : "";
  const whyItMatters = `${segment}: ${brandText}; фокус ${marketText}${technologyText}. ${general.whyItMatters}`;

  let recommendedAction = general.recommendedAction;
  if (focusMarkets.includes("Китай") && focusMarkets.includes("Россия")) {
    recommendedAction = "Сопоставить китайскую модель/технологию с российским рынком: сертификация, локализация, цена владения, сервис и доступность компонентов.";
  } else if (powertrains.includes("Электро") || powertrains.includes("Battery swap") || powertrains.includes("Водород")) {
    recommendedAction = "Передать в R&D и логистику: сравнить TCO, инфраструктуру, запас хода/сменность и применимость к российским маршрутам.";
  } else if (general.signals.includes("Рынок")) {
    recommendedAction = "Добавить в Truck Radar и отслеживать динамику бренда/сегмента HCV-MCV-LCV в России и Китае.";
  }

  return {
    score,
    level: levelFor(score),
    segment,
    brands,
    powertrains,
    focusMarkets,
    signals: general.signals,
    audiences,
    whyItMatters,
    recommendedAction,
  };
}

export function rankNews(items: NewsItem[]): RankedNewsItem[] {
  return items
    .map((item) => {
      const intelligence = assessNewsItem(item);
      const commercialVehicle = assessCommercialVehicle(item) ?? undefined;
      return { ...item, intelligence, commercialVehicle };
    })
    .sort((left, right) => right.intelligence.score - left.intelligence.score || Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export function rankCommercialVehicleNews(items: NewsItem[]) {
  return rankNews(items)
    .filter((item): item is RankedNewsItem & { commercialVehicle: CommercialVehicleAssessment } => Boolean(item.commercialVehicle))
    .sort((left, right) => right.commercialVehicle.score - left.commercialVehicle.score || Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}
