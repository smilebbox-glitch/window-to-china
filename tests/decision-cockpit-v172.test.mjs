import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const userStore = fs.readFileSync("lib/user-store.ts", "utf8");
const marketData = fs.readFileSync("lib/decision-market-data.ts", "utf8");
const cockpit = fs.readFileSync("components/decision-cockpit.tsx", "utf8");
const route = fs.readFileSync("app/decision/page.tsx", "utf8");
const shell = fs.readFileSync("components/site-shell.tsx", "utf8");

test("v1.7.2 exposes a corporate Decision Cockpit route and navigation", () => {
  assert.match(route, /DecisionCockpit/);
  assert.match(cockpit, /v1\.7\.2 · Corporate Decision Cockpit/);
  assert.match(cockpit, /без персонального Watchlist/);
  assert.match(shell, /href: "\/decision"/);
  assert.match(shell, /label: "Решения"/);
});

test("Decision Cockpit uses one company-wide business score policy", () => {
  assert.match(cockpit, /корпоративный порог 45\/100/);
  assert.match(cockpit, /score ≥ 72/);
  assert.match(cockpit, /score 60–71/);
  assert.match(cockpit, /Corporate Priority Feed/);
  assert.doesNotMatch(cockpit, /\/api\/user\/preferences/);
  assert.doesNotMatch(cockpit, /Сохранить watchlist/i);
});

test("v1.7.2 does not extend user preferences with personal intelligence criteria", () => {
  assert.doesNotMatch(userStore, /WatchlistSettings/);
  assert.doesNotMatch(userStore, /matchWatchlist/);
  assert.doesNotMatch(userStore, /alertsEnabled/);
  assert.doesNotMatch(userStore, /intelligenceAlerts/);
  assert.match(userStore, /brands: string\[\]/);
  assert.match(userStore, /eventLeadDays: number/);
});

test("Decision Cockpit separates sourced market facts from news ranking", () => {
  assert.match(cockpit, /Market Data/);
  assert.match(cockpit, /Цифры отдельно от новостей/);
  assert.match(cockpit, /metric\.sourceUrl/);
  assert.match(cockpit, /metric\.status === "forecast"/);
  assert.match(marketData, /status: "actual"/);
  assert.match(marketData, /status: "forecast"/);
  assert.match(marketData, /Actual и forecast никогда не суммируются/);
});

test("Decision Cockpit contains Russia HCV factual snapshot with source metadata", () => {
  for (const brand of ["KAMAZ", "SITRAK", "Dongfeng", "FAW"]) assert.ok(marketData.includes(`brand: "${brand}"`), brand);
  assert.match(marketData, /segment: "HCV"/);
  assert.match(marketData, /sourceLabel: "АВТОСТАТ \/ АО ППК"/);
  assert.match(cockpit, /HCV Snapshot/);
});

test("corporate cockpit exposes business rationale and recommended checks", () => {
  assert.match(cockpit, /Почему важно/);
  assert.match(cockpit, /Что проверить/);
  assert.match(cockpit, /Затронутые функции/);
  assert.match(cockpit, /Единая шкала/);
});
