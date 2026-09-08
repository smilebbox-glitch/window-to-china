import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const watchlist = fs.readFileSync("lib/watchlist.ts", "utf8");
const userStore = fs.readFileSync("lib/user-store.ts", "utf8");
const marketData = fs.readFileSync("lib/decision-market-data.ts", "utf8");
const cockpit = fs.readFileSync("components/decision-cockpit.tsx", "utf8");
const route = fs.readFileSync("app/decision/page.tsx", "utf8");
const shell = fs.readFileSync("components/site-shell.tsx", "utf8");

test("v1.7.2 exposes the Decision Cockpit route and navigation", () => {
  assert.match(route, /DecisionCockpit/);
  assert.match(cockpit, /v1\.7\.2 · Decision Cockpit/);
  assert.match(shell, /href: "\/decision"/);
  assert.match(shell, /label: "Решения"/);
});

test("watchlist schema supports business and truck criteria", () => {
  for (const field of [
    "keywords", "truckSegments", "powertrains", "audiences", "minScore", "alertsEnabled",
  ]) assert.ok(watchlist.includes(`${field}:`), field);
  assert.match(watchlist, /minScore: 45/);
  assert.match(watchlist, /alertsEnabled: true/);
  assert.match(watchlist, /export function matchWatchlist/);
  assert.match(watchlist, /score >= settings\.minScore/);
});

test("watchlist preferences reuse existing JSON profile storage without a DB migration", () => {
  assert.match(userStore, /UserSubscriptions = WatchlistSettings/);
  assert.match(userStore, /user_preferences\(user_key, subscriptions_json/);
  assert.match(userStore, /normalizeWatchlistSettings/);
});

test("scheduler notification engine creates ranked intelligence alerts", () => {
  assert.match(userStore, /rankNews\(news\.slice\(0, 120\)\)/);
  assert.match(userStore, /matchWatchlist\(item, subscriptions\)/);
  assert.match(userStore, /subscriptions\.alertsEnabled/);
  assert.match(userStore, /`intel:\$\{item\.id\}`/);
  assert.match(userStore, /"intelligence"/);
  assert.match(userStore, /Почему важно:/);
  assert.match(userStore, /Что проверить:/);
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

test("Decision Cockpit contains current Russia HCV factual snapshot with source metadata", () => {
  for (const brand of ["KAMAZ", "SITRAK", "Dongfeng", "FAW"]) assert.ok(marketData.includes(`brand: "${brand}"`), brand);
  assert.match(marketData, /segment: "HCV"/);
  assert.match(marketData, /sourceLabel: "АВТОСТАТ \/ АО ППК"/);
  assert.match(cockpit, /HCV Snapshot/);
});

test("Decision Cockpit saves watchlist through existing user preferences API", () => {
  assert.match(cockpit, /fetch\("\/api\/user\/preferences"/);
  assert.match(cockpit, /method: "PUT"/);
  assert.match(cockpit, /Сохранить watchlist/);
  assert.match(cockpit, /Alerts ON/);
});
