export type DecisionMarketMetric = {
  id: string;
  geography: "Россия" | "Китай";
  segment: "Легковые" | "HCV" | "MCV" | "LCV" | "Коммерческий транспорт";
  label: string;
  value: number;
  displayValue: string;
  unit: "шт." | "%";
  period: string;
  yoy?: number;
  mom?: number;
  status: "actual" | "forecast";
  sourceLabel: string;
  sourceUrl: string;
  sourceDate: string;
  note: string;
};

export const decisionMarketMetrics: DecisionMarketMetric[] = [
  {
    id: "ru-passenger-2026-7m",
    geography: "Россия",
    segment: "Легковые",
    label: "Новые легковые",
    value: 730714,
    displayValue: "730 714",
    unit: "шт.",
    period: "январь–июль 2026",
    yoy: 12.2,
    status: "actual",
    sourceLabel: "АВТОСТАТ / АО ППК",
    sourceUrl: "https://www.autostat.ru/news/62857/",
    sourceDate: "2026-08-05",
    note: "Фактические регистрации/реализация новых легковых автомобилей за семь месяцев; сравнение с январём–июлем 2025.",
  },
  {
    id: "ru-hcv-2026-7m",
    geography: "Россия",
    segment: "HCV",
    label: "Новые тяжёлые грузовики",
    value: 21692,
    displayValue: "21 692",
    unit: "шт.",
    period: "январь–июль 2026",
    yoy: -15.4,
    status: "actual",
    sourceLabel: "АВТОСТАТ / АО ППК",
    sourceUrl: "https://eng.autostat.ru/news/28089/",
    sourceDate: "2026-08-06",
    note: "HCV с полной массой от 16 тонн. Нельзя смешивать с LCV/MCV при расчёте динамики.",
  },
  {
    id: "ru-hcv-2026-aug",
    geography: "Россия",
    segment: "HCV",
    label: "HCV за август",
    value: 2687,
    displayValue: "2 687",
    unit: "шт.",
    period: "август 2026",
    yoy: -27,
    mom: -23.2,
    status: "actual",
    sourceLabel: "АВТОСТАТ / АО ППК",
    sourceUrl: "https://www.autostat.ru/news/63041/",
    sourceDate: "2026-09-04",
    note: "Оперативный месячный индикатор: заметное снижение и год к году, и к июлю 2026.",
  },
  {
    id: "ru-lcv-2026-h1",
    geography: "Россия",
    segment: "LCV",
    label: "Новые LCV",
    value: 31668,
    displayValue: "31 668",
    unit: "шт.",
    period: "январь–июнь 2026",
    yoy: -19.4,
    status: "actual",
    sourceLabel: "АВТОСТАТ / АО ППК",
    sourceUrl: "https://www.autostat.ru/news/62662/",
    sourceDate: "2026-07-06",
    note: "Используется сегментация АВТОСТАТ; часть пикапов относится агентством к легковым, а не к LCV.",
  },
  {
    id: "cn-cv-2026-forecast",
    geography: "Китай",
    segment: "Коммерческий транспорт",
    label: "Прогноз рынка CV",
    value: 4500000,
    displayValue: "4,5 млн",
    unit: "шт.",
    period: "2026 год",
    yoy: 4.7,
    status: "forecast",
    sourceLabel: "CAAM",
    sourceUrl: "https://www.caam.org.cn/chn/3/cate_38/con_5236999.html",
    sourceDate: "2026-01-14",
    note: "Официальный прогноз CAAM, а не фактические продажи. Должен отображаться отдельно от actual data.",
  },
];

export type HcvBrandSnapshot = {
  brand: string;
  origin: "Россия" | "Китай" | "Беларусь";
  units: number;
  yoy: number;
};

export const russiaHcvJuly2026Brands: HcvBrandSnapshot[] = [
  { brand: "KAMAZ", origin: "Россия", units: 1389, yoy: 18.5 },
  { brand: "SITRAK", origin: "Китай", units: 371, yoy: -15.7 },
  { brand: "MAZ", origin: "Беларусь", units: 304, yoy: 30.5 },
  { brand: "Dongfeng", origin: "Китай", units: 255, yoy: 27.5 },
  { brand: "FAW", origin: "Китай", units: 217, yoy: -24.7 },
];

export const russiaHcvJuly2026Source = {
  label: "АВТОСТАТ / АО ППК · HCV июль 2026",
  url: "https://eng.autostat.ru/news/28089/",
  date: "2026-08-06",
};

export const marketDataMethodology = [
  "Actual и forecast никогда не суммируются и не сравниваются как одно измерение.",
  "HCV, MCV, LCV и легковые хранятся отдельными сегментами.",
  "Каждая цифра имеет период, дату публикации и ссылку на источник.",
  "Количество новостей/упоминаний бренда не используется как рыночная доля.",
] as const;
