import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("mounted pilot event cards no longer expose the retired add-to-calendar control", () => {
  const page = read("app/calendar/page.tsx");
  const source = read("components/pilot-event-calendar.tsx");

  assert.match(page, /PilotEventCalendar/);
  assert.equal(source.includes("В календарь"), false);
  assert.equal(source.includes("downloadIcs"), false);
  assert.equal(source.includes("text/calendar"), false);
  assert.match(source, /data-calendar-ui="trip-direct-v1"/);
});

test("mounted exhibition hotels are rendered from Trip.com curated data", () => {
  const calendar = read("components/pilot-event-calendar.tsx");
  const hotels = read("lib/trip-hotels.ts");

  assert.match(calendar, /getTripHotels\(event\.id\)/);
  assert.match(calendar, /hotel\.tripUrl/);
  assert.match(calendar, /data-trip-hotel-link="true"/);
  assert.match(calendar, /Trip\.com/);
  assert.match(calendar, /Актуальная цена на Trip\.com/);
  assert.equal(calendar.includes("hotel.bookingUrl"), false);
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

test("runtime verifier targets the mounted calendar instead of the retired dark calendar", () => {
  const verifier = read("scripts/verify-calendar-ui.ps1");
  assert.match(verifier, /components\\pilot-event-calendar\.tsx/);
  assert.match(verifier, /trip-direct-v1/);
  assert.match(verifier, /visible calendar markup does not contain direct Trip\.com hotel-detail links/);
  assert.equal(verifier.includes("components\\event-calendar.tsx"), false);
});
