import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("lib/intelligence-brief.ts", "utf8");
const component = fs.readFileSync("components/executive-brief.tsx", "utf8");
const route = fs.readFileSync("app/executive/page.tsx", "utf8");
const shell = fs.readFileSync("components/site-shell.tsx", "utf8");

test("v1.7.3 exposes Executive View route and navigation", () => {
  assert.match(route, /ExecutiveBrief/);
  assert.match(component, /v1\.7\.3 · Executive Intelligence Brief/);
  assert.match(shell, /href: "\/executive"/);
  assert.match(shell, /label: "Руководство"/);
});

test("brief engine supports daily and weekly windows", () => {
  assert.match(engine, /export type BriefPeriod = "daily" \| "weekly"/);
  assert.match(engine, /period === "daily" \? DAY_MS : 7 \* DAY_MS/);
  assert.match(engine, /Последние 24 часа/);
  assert.match(engine, /Последние 7 дней/);
});

test("brief uses corporate score thresholds", () => {
  assert.match(engine, /scoreFor\(item\) >= 72/);
  assert.match(engine, /scoreFor\(item\) >= 60/);
  assert.match(engine, /scoreFor\(item\) >= 45/);
  assert.match(component, /score ≥ 72/);
  assert.match(component, /score 60–71/);
});

test("Executive Brief contains management outputs", () => {
  for (const token of ["Executive Summary", "Decision Signals", "Market Pulse", "Затронутые функции", "Что контролировать дальше"]) {
    assert.ok(component.includes(token), token);
  }
  assert.match(engine, /whyItMatters/);
  assert.match(engine, /recommendedAction/);
  assert.match(engine, /audienceCounts/);
  assert.match(engine, /watchNext/);
});

test("Executive Brief explicitly excludes personal Watchlist", () => {
  assert.match(component, /Персонального Watchlist нет/);
  assert.match(component, /Brief не использует персональные Watchlists/);
  assert.doesNotMatch(component, /\/api\/user\/preferences/);
  assert.doesNotMatch(engine, /matchWatchlist/);
});

test("Executive View can be printed or saved to PDF through browser print", () => {
  assert.match(component, /window\.print\(\)/);
  assert.match(component, /Печать \/ PDF/);
});
