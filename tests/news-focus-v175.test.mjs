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

test("news dashboard exposes focus entities as filters and priority inputs", () => {
  assert.ok(dashboard.includes("...focusEntities"));
  assert.ok(dashboard.includes("detectFocusEntities"));
  assert.ok(dashboard.includes("focusScore(item)"));
  assert.ok(dashboard.includes("item.focusEntities.includes(activeFilter)"));
  assert.ok(dashboard.includes("SHACMAN, GWM, EVOLUTE, VOYAH, Моторинвест, ЭВИА"));
});

test("industry tab excludes all strategic focus entities", () => {
  assert.ok(dashboard.includes('if (activeFilter === "Отрасль") return item.focusEntities.length === 0'));
  assert.ok(dashboard.includes('if (activeFilter === "В фокусе") return item.focusEntities.length > 0'));
});
