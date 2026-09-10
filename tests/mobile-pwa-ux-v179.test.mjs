import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const siteShell = read("components/site-shell.tsx");
const mobileCss = read("app/mobile-pwa.css");
const pwaInstall = read("components/pwa-install-button.tsx");
const notifications = read("components/web-notifications.tsx");
const layout = read("app/layout.tsx");
const manifest = JSON.parse(read("public/manifest.json"));

test("mobile shell exposes a five-action app navigation with compact overflow", () => {
  assert.match(siteShell, /primaryMobileNavigation\s*=\s*\[navigation\[0\], navigation\[1\], navigation\[3\], navigation\[4\]\]/);
  assert.match(siteShell, /mobileMoreNavigation\s*=\s*\[navigation\[2\], navigation\[5\]\]/);
  assert.match(siteShell, /className="corporate-mobile-nav mobile-app-nav lg:hidden"/);
  assert.match(siteShell, /aria-label="Основная мобильная навигация"/);
  assert.match(siteShell, />Ещё<\/span>/u);
  assert.match(siteShell, /mobile-more-sheet/);
  assert.match(siteShell, /mobile-top-search/);
});

test("mobile layout is touch friendly and safe-area aware", () => {
  assert.match(mobileCss, /safe-area-inset-top/);
  assert.match(mobileCss, /safe-area-inset-bottom/);
  assert.match(mobileCss, /\.mobile-app-nav-item\s*\{[\s\S]*?min-height:\s*54px/);
  assert.match(mobileCss, /\.pilot-content input,[\s\S]*?min-height:\s*44px/);
  assert.match(mobileCss, /font-size:\s*16px/);
  assert.match(mobileCss, /touch-action:\s*manipulation/);
  assert.match(layout, /viewportFit:\s*"cover"/);
});

test("market dashboard becomes mobile brand cards instead of a horizontal desktop table", () => {
  assert.match(mobileCss, /\.corporate-page-market table\s*\{[\s\S]*?display:\s*block\s*!important/);
  assert.match(mobileCss, /\.corporate-page-market thead\s*\{[\s\S]*?display:\s*none\s*!important/);
  assert.match(mobileCss, /\.corporate-page-market tbody\s*>\s*tr\s*\{[\s\S]*?border-radius:\s*16px/);
  assert.match(mobileCss, /content:\s*"2026 YTD"/);
  assert.match(mobileCss, /content:\s*"Динамика"/u);
  assert.match(mobileCss, /content:\s*"Сигнал"/u);
});

test("Android-compatible PWA installation and standalone mode remain wired", () => {
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.src === "/pwa-icon-192.png"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.src === "/pwa-icon-512.png" && /maskable/.test(icon.purpose || "")));
  assert.match(pwaInstall, /beforeinstallprompt/);
  assert.match(pwaInstall, /appinstalled/);
  assert.match(pwaInstall, /installPrompt\.prompt\(\)/);
  assert.match(pwaInstall, /installPrompt\.userChoice/);
  assert.match(pwaInstall, /display-mode: standalone/);
  assert.match(pwaInstall, /navigator\.serviceWorker[\s\S]*?register\("\/sw\.js"/);
});

test("iOS guidance, PWA install UI, and notification surfaces avoid the bottom app bar", () => {
  assert.match(pwaInstall, /isIosLikeDevice/);
  assert.match(pwaInstall, /На экран Домой/u);
  assert.match(pwaInstall, /pwa-install-banner/);
  assert.match(pwaInstall, /pwa-install-button/);
  assert.match(mobileCss, /\.pwa-install-banner,[\s\S]*?bottom:\s*calc\(84px \+ env\(safe-area-inset-bottom\)\)\s*!important/);
  assert.match(notifications, /aria-label="Уведомления и интересы"/u);
  assert.match(notifications, /window\.isSecureContext/);
  assert.match(notifications, /registration\.showNotification/);
});
