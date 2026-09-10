import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const focus = fs.readFileSync("lib/news-focus.ts", "utf8");
const dashboard = fs.readFileSync("components/news-dashboard.tsx", "utf8");

const entities = ["SHACMAN", "GWM", "EVOLUTE", "VOYAH", "Моторинвест", "ЭВИА"];

test("strategic news focus contains six required brands and companies", () => {
  for (const entity of entities) assert.ok(focus.includes(`\"${entity}\"`), `missing focus entity ${entity}`);
});

test("focus detector covers Russian, English and Chinese aliases", () => {
  for (const token of ["evolute", "эволют", "voyah", "岚图", "motorinvest", "моторинвест", "evia", "эвиа"]) {
    assert.ok(focus.toLocaleLowerCase("ru-RU").includes(token.toLocaleLowerCase("ru-RU")), `missing alias ${token}`);
  }
});

test("news dashboard still uses strategic focus for ranking and badges without a top tab strip", () => {
  assert.ok(dashboard.includes("detectFocusEntities"));
  assert.ok(dashboard.includes("focusScore(item)"));
  assert.ok(dashboard.includes("focusEntities: entities"));
  assert.ok(dashboard.includes("item.focusEntities.length > 0"));
  assert.ok(dashboard.includes("item.focusEntities.map"));
  assert.equal(dashboard.includes("TabsList"), false);
  assert.equal(dashboard.includes("...focusEntities"), false);
});

test("retired industry and focus tabs stay removed from pilot UI", () => {
  assert.equal(dashboard.includes('activeFilter === "Отрасль"'), false);
  assert.equal(dashboard.includes('activeFilter === "В фокусе"'), false);
  assert.equal(dashboard.includes("item.focusEntities.includes(activeFilter)"), false);
});
