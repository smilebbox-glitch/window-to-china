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
const pilotEventCalendar = read("components/pilot-event-calendar.tsx");
const tripHotels = read("lib/trip-hotels.ts");
const calendarPage = read("app/calendar/page.tsx");
const travelGuide = read("components/travel-guide.tsx");
const managedContent = read("components/managed-content-panel.tsx");
const newsDashboard = read("components/news-dashboard.tsx");
const truckRadar = read("components/truck-radar.tsx");
const analysisPage = read("app/analysis/page.tsx");
const globalCss = read("app/globals.css");

const visibleNavigation = [
  ["/", "Главная"],
  ["/news", "Новости"],
  ["/trucks", "Коммерческий транспорт"],
  ["/market", "Рынок"],
  ["/calendar", "Выставки и события"],
  ["/travel-guide", "Перед поездкой"],
];

const visibleRouteFiles = {
  "/": "app/page.tsx",
  "/news": "app/news/page.tsx",
  "/trucks": "app/trucks/page.tsx",
  "/market": "app/market/page.tsx",
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
    'label: "Аналитика"',
    '<span>Сервис</span>',
    'aria-label="Язык интерфейса"',
    'aria-label="Уведомления"',
    '⌘ K',
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

test("pilot RAG analysis is not exposed", () => {
  assert.equal(shell.includes('href: "/analysis"'), false);
  assert.match(analysisPage, /redirect\("\/news"\)/u);
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

test("home uses the approved simplified pilot design", () => {
  assert.equal(corporateHome.includes("Исследовать рынок"), false);
  assert.equal(corporateHome.includes("Рынок и аналитика"), false);
  assert.equal(corporateHome.includes("Стратегический фокус"), false);
  assert.equal(corporateHome.includes("ExecutiveKpi"), false);
  assert.equal(corporateHome.includes("Часть источников временно недоступна"), false);
  assert.match(corporateHome, /Окно в Китай/u);
  assert.match(corporateHome, /Требует внимания/u);
  assert.match(corporateHome, /Что изменилось с вашего визита/u);
});

test("news and truck pages remove screenshot-only secondary panels", () => {
  assert.equal(newsDashboard.includes("TabsList"), false);
  assert.equal(newsDashboard.includes("В фокусе"), false);
  assert.equal(truckRadar.includes("Бренд-радар"), false);
  assert.equal(truckRadar.includes("Что отслеживаем"), false);
});

test("news dashboard refreshes live feed frequently and rejects broken materials", () => {
  assert.match(newsDashboard, /5 \* 60 \* 1000/u);
  assert.match(newsDashboard, /isDisplayableNews/u);
  assert.match(newsDashboard, /не удалось/u);
  assert.match(newsDashboard, /sort\(\(a, b\) => \+new Date\(b\.publishedAt\) - \+new Date\(a\.publishedAt\)\)/u);
});

test("market sales use real brand image sources and keep GWM focus", () => {
  assert.match(marketDashboard, /BrandLogo/u);
  assert.match(marketDashboard, /Фокус группы/u);
  assert.match(marketDashboard, /GWM в России/u);
  assert.match(brandLogo, /officialDomains/u);
  assert.match(brandLogo, /google\.com\/s2\/favicons/u);
  assert.match(brandLogo, /HAVAL/u);
  assert.match(brandLogo, /TANK/u);
  assert.match(brandLogo, /WEY/u);
});

test("pilot calendar uses Trip.com hotels with direct hotel-detail links", () => {
  assert.match(calendarPage, /PilotEventCalendar/u);
  for (const label of ["Перелёт, отели Trip.com и подготовка", "Перелёт из Москвы", "Отели рядом с площадкой — Trip.com", "Документы"]) {
    assert.ok(pilotEventCalendar.includes(label), `${label} missing from pilot event travel details`);
  }
  assert.equal(pilotEventCalendar.includes("В календарь"), false);
  assert.equal(pilotEventCalendar.includes("downloadIcs"), false);
  assert.match(pilotEventCalendar, /getTripHotels\(event\.id\)/u);
  assert.match(pilotEventCalendar, /hotel\.tripUrl/u);
  assert.match(pilotEventCalendar, /hotel\.proximity/u);
  assert.match(pilotEventCalendar, /hotel\.rating/u);
  assert.match(pilotEventCalendar, /hotel\.reviews/u);
  assert.match(pilotEventCalendar, /hotel\.address/u);
  assert.match(pilotEventCalendar, /data-calendar-ui="trip-direct-v1"/u);
  assert.match(tripHotels, /trip\.com\/hotels/u);
  assert.match(tripHotels, /hotel-detail-/u);
});

test("corporate notes use dark readable typography", () => {
  assert.match(managedContent, /text-\[#17345f\]/u);
  assert.match(managedContent, /text-\[#405f82\]/u);
  assert.equal(managedContent.includes("text-white"), false);
});

test("travel section eyebrow labels are protected from first-letter clipping", () => {
  for (const eyebrow of ["Телефон до вылета", "Оплата в Китае", "Багаж и граница", "Культурный код"]) {
    assert.ok(travelGuide.includes(`eyebrow=\"${eyebrow}\"`), `${eyebrow} heading missing`);
  }
  assert.ok(globalCss.includes('.corporate-page-travel > main > div > section > div:first-child > p[class*="uppercase"] { padding-left:8px; padding-right:8px; }'));
});
