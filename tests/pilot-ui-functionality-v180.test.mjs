import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const exists = (path) => fs.existsSync(path);

const shell = read("components/site-shell.tsx");
const searchPage = read("app/search/page.tsx");
const globalSearch = read("components/global-search.tsx");
const corporateHome = read("components/corporate-home.tsx");
const marketDashboard = read("components/market-dashboard.tsx");
const brandLogo = read("components/brand-logo.tsx");
const eventCalendar = read("components/event-calendar.tsx");
const travelGuide = read("components/travel-guide.tsx");
const globalCss = read("app/globals.css");

const visibleNavigation = [
  ["/", "Главная"],
  ["/news", "Новости"],
  ["/trucks", "Коммерческий транспорт"],
  ["/market", "Рынок"],
  ["/analysis", "Аналитика"],
  ["/calendar", "Выставки и события"],
  ["/travel-guide", "Перед поездкой"],
];

const visibleRouteFiles = {
  "/": "app/page.tsx",
  "/news": "app/news/page.tsx",
  "/trucks": "app/trucks/page.tsx",
  "/market": "app/market/page.tsx",
  "/analysis": "app/analysis/page.tsx",
  "/calendar": "app/calendar/page.tsx",
  "/travel-guide": "app/travel-guide/page.tsx",
};

test("simplified pilot navigation contains only approved user sections", () => {
  for (const [href, label] of visibleNavigation) {
    assert.match(shell, new RegExp(`href: \\\"${href.replaceAll("/", "\\/")}\\\", label: \\\"${label}\\\"`), `${label} missing`);
  }

  for (const retired of [
    'label: "Решения"',
    'label: "Руководство"',
    '<span>Сервис</span>',
    'aria-label="Язык интерфейса"',
    'aria-label="Уведомления"',
  ]) {
    assert.equal(shell.includes(retired), false, `retired control returned: ${retired}`);
  }
});

test("every visible navigation destination still has a page", () => {
  for (const [route, file] of Object.entries(visibleRouteFiles)) {
    assert.equal(exists(file), true, `${route} is visible but ${file} is missing`);
  }
});

test("decision and executive routes stay available internally but hidden from navigation", () => {
  assert.equal(exists("app/decision/page.tsx"), true);
  assert.equal(exists("app/executive/page.tsx"), true);
  assert.equal(shell.includes('href: "/decision"'), false);
  assert.equal(shell.includes('href: "/executive"'), false);
});

test("top search submits to the dedicated global search route", () => {
  assert.match(shell, /router\.push\(value \? `\/search\?q=\$\{encodeURIComponent\(value\)\}` : "\/search"\)/u);
  assert.match(shell, /placeholder="Поиск по новостям, компаниям, моделям, выставкам\.\.\."/u);
  assert.match(searchPage, /<GlobalSearch initialQuery=\{query\} \/>/u);
});

test("global search covers live news, sections and exhibitions", () => {
  assert.match(globalSearch, /fetch\("\/api\/news", \{ cache: "no-store"/u);
  assert.match(globalSearch, /autoEvents/u);
  assert.match(globalSearch, /sectionResults/u);
  assert.match(globalSearch, /eventResults/u);
  assert.match(globalSearch, /newsResults/u);
  assert.match(globalSearch, /aria-label="Поиск по сервису"/u);
  assert.match(globalSearch, /Ничего не найдено/u);
});

test("search normalization is case-insensitive and whitespace tolerant", () => {
  assert.match(globalSearch, /toLocaleLowerCase\("ru-RU"\)/u);
  assert.match(globalSearch, /replace\(\/\\s\+\/gu, " "\)\.trim\(\)/u);
});

test("pilot test-mode warning remains readable and explicit", () => {
  assert.match(shell, /В тестовом режиме\. Данные могут быть неполны\./u);
  assert.match(shell, /text-\[15px\]/u);
  assert.match(shell, /font-bold/u);
  assert.match(shell, /text-\[#18345f\]/u);
});

test("home uses the approved executive intelligence design", () => {
  assert.equal(corporateHome.includes("Исследовать рынок"), false);
  assert.equal(corporateHome.includes("Рынок и аналитика"), false);
  assert.match(corporateHome, /Окно в Китай/u);
  assert.match(corporateHome, /Требует внимания/u);
  assert.match(corporateHome, /Executive Brief/u);
  assert.match(corporateHome, /Что изменилось с вашего визита/u);
});

test("market sales use local brand visuals and keep GWM focus", () => {
  assert.match(marketDashboard, /BrandLogo/u);
  assert.match(marketDashboard, /Фокус группы/u);
  assert.match(marketDashboard, /GWM в России/u);
  assert.match(brandLogo, /HAVAL/u);
  assert.match(brandLogo, /TANK/u);
  assert.match(brandLogo, /WEY/u);
  assert.equal(brandLogo.includes("https://"), false);
});

test("event travel details remain readable in the corporate light theme", () => {
  for (const label of ["Перелёт, отели, документы и город", "Перелёт из Москвы", "Рядом с площадкой", "Документы", "Что посмотреть"]) {
    assert.ok(eventCalendar.includes(label), `${label} missing from event travel details`);
  }
  assert.ok(globalCss.includes('.corporate-page-calendar details > summary { color:#173368 !important; }'));
  assert.ok(globalCss.includes('.corporate-page-calendar details .text-violet-200,.corporate-page-calendar details .text-violet-300 { color:#3658a8 !important; }'));
  assert.ok(globalCss.includes('.corporate-page-calendar details .text-slate-400,.corporate-page-calendar details .text-slate-500,.corporate-page-calendar details .text-slate-600 { color:#405f82 !important; }'));
});

test("travel section eyebrow labels are protected from first-letter clipping", () => {
  for (const eyebrow of ["Телефон до вылета", "Оплата в Китае", "Багаж и граница", "Культурный код"]) {
    assert.ok(travelGuide.includes(`eyebrow=\"${eyebrow}\"`), `${eyebrow} heading missing`);
  }
  assert.ok(globalCss.includes('.corporate-page-travel > main > div > section > div:first-child > p[class*="uppercase"] { padding-left:8px; padding-right:8px; }'));
});
