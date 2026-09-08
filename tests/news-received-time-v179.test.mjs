import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const data = fs.readFileSync(new URL("../lib/data.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/news/route.ts", import.meta.url), "utf8");
const dashboard = fs.readFileSync(new URL("../components/news-dashboard.tsx", import.meta.url), "utf8");

test("news pipeline records and preserves the service receipt timestamp", () => {
  assert.match(route, /type NewsWithReceipt = NewsItem & \{ receivedAt\?: string \}/u);
  assert.match(route, /const NEWS_SOURCE_CATALOG_VERSION = 5;/u);
  assert.match(route, /function withReceivedAt\(/u);
  assert.match(route, /previousById/u);
  assert.match(route, /previousByUrl/u);
  assert.match(route, /previous\?\.receivedAt/u);
  assert.match(route, /new Date\(\)\.toISOString\(\)/u);
  assert.match(route, /getSourceSnapshot<NewsWithReceipt\[\]>/u);
  assert.match(route, /payload: fetched/u);
});

test("news UI shows exact Moscow receipt and publication time", () => {
  assert.match(dashboard, /type NewsWithReceipt = NewsItem & \{ receivedAt\?: string \}/u);
  assert.match(dashboard, /hour: "2-digit"/u);
  assert.match(dashboard, /minute: "2-digit"/u);
  assert.match(dashboard, /timeZone: "Europe\/Moscow"/u);
  assert.match(dashboard, /Получено:/u);
  assert.match(dashboard, /item\.receivedAt \? formatDateTime\(item\.receivedAt\) : "нет данных"/u);
  assert.match(dashboard, /Опубликовано:/u);
  assert.match(dashboard, /formatDateTime\(item\.publishedAt\)/u);
  assert.match(dashboard, /\[\.\.\.live, \.\.\.seedNews\]/u, "live item must override a matching seed item so receivedAt is not lost");
});

test("static seed news is not assigned invented receipt timestamps", () => {
  assert.doesNotMatch(data, /receivedAt\s*:/u);
});
