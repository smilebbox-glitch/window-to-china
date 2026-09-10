import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("event cards no longer expose the retired add-to-calendar control", () => {
  const source = read("components/event-calendar.tsx");
  assert.equal(source.includes("В календарь"), false);
  assert.equal(source.includes("downloadIcs"), false);
  assert.equal(source.includes("text/calendar"), false);
});

test("exhibition hotels are rendered from Trip.com curated data", () => {
  const calendar = read("components/event-calendar.tsx");
  const hotels = read("lib/trip-hotels.ts");

  assert.match(calendar, /getTripHotels\(event\.id\)/);
  assert.match(calendar, /Данные Trip\.com/);
  assert.match(calendar, /Актуальная цена на Trip\.com/);
  assert.equal(calendar.includes("hotel.nightlyPrice"), false);

  for (const eventId of [
    "citexpo-2026",
    "china-nev-icv-2026",
    "bauma-china-2026",
    "auto-tech-guangzhou-2026",
    "auto-guangzhou-2026",
    "automechanika-shanghai-2026",
    "capas-chengdu-2027",
  ]) {
    assert.ok(hotels.includes(`\"${eventId}\"`), `missing Trip.com hotels for ${eventId}`);
  }

  assert.ok((hotels.match(/https:\/\/www\.trip\.com\/hotels\//g) ?? []).length >= 10);
  assert.match(hotels, /rating:/);
  assert.match(hotels, /reviews:/);
  assert.match(hotels, /proximity:/);
  assert.match(hotels, /address:/);
});
