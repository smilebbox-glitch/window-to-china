import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const exists = (path) => fs.existsSync(path);

const shell = read("components/site-shell.tsx");
const searchPage = read("app/search/page.tsx");
const globalSearch = read("components/global-search.tsx");

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
