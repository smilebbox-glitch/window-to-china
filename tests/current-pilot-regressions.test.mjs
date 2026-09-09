import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const home = read("components/corporate-home.tsx");
const notifications = read("components/web-notifications.tsx");
const trucks = read("components/truck-radar.tsx");
const calendar = read("components/event-calendar.tsx");
const travel = read("components/travel-guide.tsx");
const styles = read("app/globals.css");

test("current home keeps redundant market hero actions removed", () => {
  assert.equal(home.includes("Исследовать рынок"), false);
  assert.equal(home.includes("Рынок и аналитика"), false);
  assert.match(home, /Китай\. Автопром\./u);
  assert.match(home, /Главные новости/u);
});

test("notification bell stays visually separated from the corporate pilot badge", () => {
  assert.match(notifications, /rounded-full/u);
  assert.match(notifications, /lg:right-\[248px\]/u);
  assert.match(notifications, /aria-pressed=\{open\}/u);
  assert.match(notifications, /Уведомления включены/u);
  assert.match(notifications, /bg-\[#13b58b\]/u);
  assert.match(notifications, /ring-2 ring-white/u);
});

test("commercial transport shows receipt and publication timestamps in Moscow time", () => {
  assert.match(trucks, /type NewsWithReceipt = NewsItem & \{ receivedAt\?: string \}/u);
  assert.match(trucks, /timeZone: "Europe\/Moscow"/u);
  assert.match(trucks, /Получено: \{receivedAt \? formatDateTime\(receivedAt\) : "нет данных"\}/u);
  assert.match(trucks, /Опубликовано: \{formatDateTime\(item\.publishedAt\)\}/u);
});

test("event travel details remain readable in the corporate light theme", () => {
  assert.match(calendar, /Перелёт, отели, документы и город/u);
  assert.match(styles, /\.corporate-page-calendar details > summary \{ color:#173368 !important; \}/u);
  assert.match(styles, /\.corporate-page-calendar details \.text-slate-400,\.corporate-page-calendar details \.text-slate-500,\.corporate-page-calendar details \.text-slate-600 \{ color:#405f82 !important; \}/u);
});

test("travel section eyebrow labels keep safe horizontal padding", () => {
  for (const label of ["Телефон до вылета", "Оплата в Китае", "Багаж и граница", "Культурный код"]) {
    assert.ok(travel.includes(`eyebrow="${label}"`), `${label} missing from travel guide`);
  }
  assert.match(styles, /\.corporate-page-travel > main > div > section > div:first-child > p\[class\*="uppercase"\] \{ padding-left:8px; padding-right:8px; \}/u);
});
