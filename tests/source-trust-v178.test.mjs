import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const data = read("lib/data.ts");
const badge = read("components/source-trust-badge.tsx");
const news = read("components/news-dashboard.tsx");
const home = read("components/corporate-home.tsx");
const trucks = read("components/truck-radar.tsx");
const decision = read("components/decision-cockpit.tsx");
const intelligence = read("components/intelligence-brief.tsx");
const executive = read("components/executive-brief.tsx");
const executiveEngine = read("lib/intelligence-brief.ts");

test("news model has exactly three source trust classes", () => {
  assert.match(data, /sourceType: "official" \| "media" \| "telegram"/);
});

test("source trust badge exposes clear Russian labels", () => {
  for (const label of ["Официальный источник", "Отраслевое СМИ", "Telegram"]) {
    assert.ok(badge.includes(label), label);
  }
  assert.match(badge, /BadgeCheck/);
  assert.match(badge, /Newspaper/);
  assert.match(badge, /Send/);
});

test("source trust badge explains what each class means", () => {
  assert.match(badge, /Первичный источник/);
  assert.match(badge, /Профессиональное отраслевое или деловое издание/);
  assert.match(badge, /Оперативный Telegram-канал/);
  assert.match(badge, /рекомендуется открыть первоисточник/);
});

test("source trust is visible on all key news and intelligence surfaces", () => {
  for (const [name, content] of [
    ["news", news],
    ["home", home],
    ["trucks", trucks],
    ["decision", decision],
    ["intelligence", intelligence],
    ["executive", executive],
  ]) {
    assert.match(content, /SourceTrustBadge/, `${name} must render SourceTrustBadge`);
    assert.match(content, /sourceType/, `${name} must pass sourceType`);
  }
});

test("Executive Brief preserves sourceType instead of losing provenance", () => {
  assert.match(executiveEngine, /sourceType: NewsItem\["sourceType"\]/);
  assert.match(executiveEngine, /sourceType: item\.sourceType/);
  assert.match(executive, /sourceType=\{signal\.sourceType\}/);
});

test("news card still exposes source name and primary-source URL next to trust badge", () => {
  assert.match(news, /\{item\.source\}/);
  assert.match(news, /SourceTrustBadge sourceType=\{item\.sourceType\}/);
  assert.match(news, /href=\{item\.url\}/);
  assert.match(news, /Первоисточник/);
});
