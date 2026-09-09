import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const shell = read("components/site-shell.tsx");
const home = read("components/corporate-home.tsx");
const hero = read("components/corporate-page-hero.tsx");
const css = read("app/globals.css");
const executive = read("app/executive/page.tsx");
const search = read("components/global-search.tsx");

const pageFiles = [
  "app/news/page.tsx",
  "app/trucks/page.tsx",
  "app/market/page.tsx",
  "app/analysis/page.tsx",
  "app/decision/page.tsx",
  "app/executive/page.tsx",
  "app/calendar/page.tsx",
  "app/travel-guide/page.tsx",
  "app/search/page.tsx",
];

const premiumIntelligencePages = [
  "app/news/page.tsx",
  "app/trucks/page.tsx",
  "app/analysis/page.tsx",
  "app/calendar/page.tsx",
];

test("approved corporate shell uses simplified left navigation and no retired right rail", () => {
  for (const route of ["/news", "/trucks", "/market", "/analysis", "/calendar", "/travel-guide"]) {
    assert.ok(shell.includes(`href: "${route}"`), route);
  }
  for (const retired of ["Ключевые темы", "Популярные разделы", "Быстрые действия", "Состояние источников"]) {
    assert.equal(shell.includes(retired), false, retired);
  }
  assert.doesNotMatch(shell, /label:\s*["']Решения["']/u);
  assert.doesNotMatch(shell, /label:\s*["']Руководство["']/u);
  assert.doesNotMatch(shell, /<span>Сервис<\/span>/u);
  assert.doesNotMatch(shell, /aria-label=["']Язык интерфейса["']/u);
  assert.doesNotMatch(shell, /aria-label=["']Уведомления["']/u);
  assert.ok(shell.includes("corporate-sidebar"));
  assert.ok(shell.includes("corporate-topbar"));
});

test("corporate home is live-data driven and keeps strategic focus", () => {
  assert.ok(home.includes('fetch("/api/news"'));
  for (const entity of ["VOYAH", "EVOLUTE", "Моторинвест", "ЭВИА", "GWM", "SHACMAN"]) assert.ok(home.includes(entity), entity);
  assert.ok(home.includes("Требует внимания"));
  assert.ok(home.includes("Executive Brief"));
  assert.ok(home.includes("Продажи автомобилей в России"));
  assert.ok(home.includes("Truck Radar"));
  assert.ok(home.includes("SourceTrustBadge"));
  assert.ok(home.includes("sourceType"));
});

test("retired design blocks stay removed from corporate home", () => {
  for (const retired of [
    "Смотреть новости",
    "Решения на сегодня",
    "Рекомендация",
    "Что взять с собой",
    "Открыть календарь",
    "Быстрые действия",
    "Состояние источников",
    "Ключевые темы",
    "Популярные разделы",
  ]) assert.equal(home.includes(retired), false, retired);
});

test("all visible pilot tabs use shared approved hero/frame", () => {
  for (const file of pageFiles) {
    const source = read(file);
    assert.ok(source.includes("CorporatePageFrame"), file);
    assert.ok(source.includes("CorporatePageHero"), file);
  }
  assert.ok(hero.includes("corp-hero"));
});

test("premium intelligence modules share the executive page framework", () => {
  for (const file of premiumIntelligencePages) {
    const source = read(file);
    assert.ok(source.includes("ExecutivePageLens"), `${file} must render ExecutivePageLens`);
    assert.ok(source.includes("executive-pages.module.css"), `${file} must use executive page polish`);
  }
  assert.ok(hero.includes("MGC China Automotive Intelligence"));
  assert.ok(read("components/intelligence-brief.tsx").includes("SourceTrustBadge"));
});

test("corporate design system includes four local offline hero assets", () => {
  for (const file of [
    "public/corporate/hero-shanghai.svg",
    "public/corporate/hero-trucks.svg",
    "public/corporate/hero-expo.svg",
    "public/corporate/hero-travel.svg",
  ]) {
    assert.ok(fs.existsSync(file), file);
    assert.match(read(file), /<svg\b/);
  }
  for (const token of [".corp-hero", ".corp-card", ".corporate-nav-item", ".corp-hero-home", ".corp-hero-trucks", ".corp-hero-expo", ".corp-hero-travel"]) assert.ok(css.includes(token), token);
});

test("top search routes to functional global search", () => {
  assert.match(shell, /\/search\?q=/u);
  assert.match(search, /fetch\(["']\/api\/news["']/u);
  assert.match(search, /autoEvents/u);
  assert.match(search, /Поиск по сервису/u);
});

test("test-mode notice stays readable", () => {
  assert.match(shell, /В тестовом режиме\. Данные могут быть неполны\./u);
  assert.match(shell, /text-\[15px\]/u);
  assert.match(shell, /text-\[#18345f\]/u);
});

test("Executive user view no longer renders operational GO panel", () => {
  assert.equal(executive.includes("ExecutiveOperationsPanel"), false);
  assert.ok(executive.includes("ExecutiveBrief"));
});
