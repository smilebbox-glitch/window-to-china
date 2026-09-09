import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const layout = read("app/layout.tsx");
const component = read("components/web-notifications.tsx");
const store = read("lib/user-store.ts");
const sw = read("public/sw.js");
const preferencesRoute = read("app/api/user/preferences/route.ts");
const notificationsRoute = read("app/api/user/notifications/route.ts");

test("web notification center is mounted globally", () => {
  assert.match(layout, /WebNotifications/);
  assert.match(layout, /<WebNotifications\s*\/>/);
});

test("notification preferences support master switch, companies and automotive segments", () => {
  for (const token of [
    "notificationsEnabled",
    "brands",
    "segments",
    "Весь автопром",
    "Коммерческий транспорт",
    "Электромобили и NEV",
    "Компоненты и поставщики",
    "Производство и локализация",
    "Регулирование и геополитика",
    "SHACMAN",
    "GWM",
    "EVOLUTE",
    "VOYAH",
    "Моторинвест",
    "ЭВИА",
  ]) assert.ok(component.includes(token), token);
  assert.match(component, /\/api\/user\/preferences/);
  assert.match(component, /method:\s*"PUT"/);
});

test("notification bell stays visually separated from the corporate pilot profile", () => {
  assert.ok(component.includes("fixed right-4 top-[14px]"), "desktop/mobile anchor changed");
  assert.ok(component.includes("lg:right-[248px]"), "desktop offset protecting the corporate pilot profile is missing");
  assert.ok(component.includes("size-10 place-items-center rounded-full"), "bell must remain a compact circular control");
  assert.ok(component.includes("ring-4 ring-white/90"), "bell separation ring is missing");
  assert.ok(component.includes("-right-1.5 -top-1.5"), "unread badge must remain outside the bell center");
  assert.ok(component.includes("bg-[#13b58b]"), "enabled-state indicator is missing");
  assert.match(component, /title=\{preferences\.notificationsEnabled \? "Уведомления включены" : "Уведомления"\}/u);
});

test("backend generates only enabled and matching notifications", () => {
  assert.match(store, /notificationsEnabled:\s*boolean/);
  assert.match(store, /segments:\s*string\[\]/);
  assert.match(store, /notificationsEnabled:\s*false/);
  assert.match(store, /function detectCompanies/);
  assert.match(store, /function detectSegments/);
  assert.match(store, /if \(!subscriptions\.notificationsEnabled\) continue/);
  assert.match(store, /subscriptions\.brands\.some/);
  assert.match(store, /subscriptions\.segments\.some/);
  assert.match(store, /companyMatch/);
  assert.match(store, /segmentMatch/);
});

test("browser notification delivery is permission-aware and deduplicated", () => {
  assert.match(component, /Notification\.requestPermission/);
  assert.match(component, /Notification\.permission/);
  assert.match(component, /window\.isSecureContext/);
  assert.match(component, /registration\.showNotification/);
  assert.match(component, /SEEN_KEY/);
  assert.match(component, /POLL_MS = 60_000/);
  assert.match(component, /slice\(-5\)/);
});

test("service worker opens the notification target without caching intelligence APIs", () => {
  assert.match(sw, /notificationclick/);
  assert.match(sw, /event\.notification\.data\?\.url/);
  assert.match(sw, /clients\.openWindow/);
  assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.doesNotMatch(sw, /cache\.put\([^\n]*\/api\//);
});

test("notification and preference APIs remain no-store user endpoints", () => {
  assert.match(preferencesRoute, /cache-control":"no-store/);
  assert.match(notificationsRoute, /cache-control":"no-store/);
  assert.match(notificationsRoute, /generateUserNotifications/);
  assert.match(notificationsRoute, /markNotificationsRead/);
});
