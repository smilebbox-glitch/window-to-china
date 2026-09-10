import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const shell = read("components/site-shell.tsx");
const home = read("components/corporate-home.tsx");
const trucks = read("components/truck-radar.tsx");
const news = read("components/news-dashboard.tsx");
const notes = read("components/managed-content-panel.tsx");
const logos = read("components/brand-logo.tsx");
const calendar = read("components/event-calendar.tsx");
const travel = read("lib/travel.ts");

test("pilot navigation stays clean and RAG/analysis is hidden", () => {
  assert.equal(shell.includes('href: "/analysis"'), false);
  assert.equal(shell.includes('displayLabel: "Аналитика"'), false);
  assert.equal(shell.includes("⌘ K"), false);
  assert.equal(shell.includes("> Live<"), false);
});

test("home hero has no executive action buttons or strategic-focus chip row", () => {
  assert.equal(home.includes("Ключевые сигналы"), false);
  assert.equal(home.includes("Стратегический фокус"), false);
});

test("truck page has no explanatory or brand-radar side panels", () => {
  assert.equal(trucks.includes("Что отслеживаем"), false);
  assert.equal(trucks.includes("Бренд-радар"), false);
});

test("news page no longer renders the long brand focus tabs and refreshes frequently", () => {
  assert.equal(news.includes("const filters:"), false);
  assert.equal(news.includes("TabsTrigger key={filter}"), false);
  assert.match(news, /5 \* 60 \* 1000/u);
});

test("corporate notes use readable dark text on a light surface", () => {
  assert.match(notes, /bg-white/u);
  assert.match(notes, /text-\[#17345f\]/u);
  assert.match(notes, /text-\[#405f82\]/u);
});

test("market brand marks use official brand domains instead of letter-only placeholders", () => {
  assert.match(logos, /officialDomains/u);
  assert.match(logos, /haval\.ru/u);
  assert.match(logos, /chery\.ru/u);
  assert.match(logos, /gwm-global\.com/u);
  assert.match(logos, /google\.com\/s2\/favicons/u);
});

test("event travel cards provide active hotel links and proximity metadata", () => {
  assert.match(calendar, /href=\{hotel\.bookingUrl\}/u);
  assert.match(travel, /proximity:/u);
  assert.match(travel, /Kerry Hotel Pudong Shanghai/u);
  assert.match(travel, /InterContinental Shanghai Hongqiao NECC/u);
  assert.match(travel, /The Westin Pazhou/u);
  assert.match(travel, /Pullman Beijing South/u);
});
