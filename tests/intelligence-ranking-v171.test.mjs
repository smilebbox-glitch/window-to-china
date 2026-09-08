import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ranking = fs.readFileSync("lib/intelligence-ranking.ts", "utf8");
const truckRadar = fs.readFileSync("components/truck-radar.tsx", "utf8");
const brief = fs.readFileSync("components/intelligence-brief.tsx", "utf8");
const shell = fs.readFileSync("components/site-shell.tsx", "utf8");
const truckPage = fs.readFileSync("app/trucks/page.tsx", "utf8");
const analysisPage = fs.readFileSync("app/analysis/page.tsx", "utf8");

test("department intelligence ranking covers five business audiences", () => {
  for (const audience of ["Руководство", "R&D", "Закупки", "Производство", "Логистика"]) {
    assert.ok(ranking.includes(`"${audience}"`), audience);
  }
  for (const signal of ["Регулирование", "Локализация", "Поставки", "Технологии", "Рынок", "Инвестиции", "Качество и риски", "Экспорт и торговля"]) {
    assert.ok(ranking.includes(`"${signal}"`), signal);
  }
  assert.ok(ranking.includes("assessNewsItem"));
  assert.ok(ranking.includes("recommendedAction"));
  assert.ok(ranking.includes("whyItMatters"));
});

test("Truck Radar covers China and Russia commercial vehicle segments", () => {
  for (const token of [
    "HCV · тяжёлые", "MCV · среднетоннажные", "LCV · лёгкие", "Тягачи", "Самосвалы / стройка", "Шасси / спецтехника",
    "SHACMAN", "SITRAK / SINOTRUK / HOWO", "FAW Jiefang", "Dongfeng", "Foton / Auman", "JAC", "SANY", "XCMG", "KAMAZ", "УРАЛ", "GAZ", "Sollers",
    "Дизель", "LNG / CNG", "Электро", "Battery swap", "Водород", "Гибрид",
  ]) assert.ok(ranking.includes(token), token);
  assert.ok(ranking.includes("assessCommercialVehicle"));
  assert.ok(ranking.includes("rankCommercialVehicleNews"));
});

test("Truck Radar UI communicates impact without pretending article counts are market share", () => {
  assert.ok(truckRadar.includes("Грузовой радар"));
  assert.ok(truckRadar.includes("Китай ↔ Россия"));
  assert.ok(truckRadar.includes("Почему важно"));
  assert.ok(truckRadar.includes("Что проверить"));
  assert.ok(truckRadar.includes("Это не доля рынка"));
  assert.ok(truckRadar.includes("TCO"));
});

test("Truck Radar and department ranking are reachable in product UI", () => {
  assert.ok(shell.includes('href: "/trucks"'));
  assert.ok(truckPage.includes("TruckRadar"));
  assert.ok(analysisPage.includes("IntelligenceBrief"));
  assert.ok(brief.includes("Что действительно важно для компании"));
});
