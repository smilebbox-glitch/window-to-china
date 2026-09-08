import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const manifestPath = path.join(root, "public/manifest.webmanifest");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.name, "Окно в Китай — Corporate Intelligence");
assert.equal(manifest.short_name, "Окно в Китай");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.theme_color, "#0a1d54");

const icons = new Map(manifest.icons.map((icon) => [icon.sizes, icon]));
assert.equal(icons.get("192x192")?.src, "/pwa-icon-192.png");
assert.equal(icons.get("512x512")?.src, "/pwa-icon-512.png");
assert.match(icons.get("512x512")?.purpose || "", /maskable/);

for (const file of [
  "public/pwa-icon-192.png",
  "public/pwa-icon-512.png",
  "public/apple-touch-icon.png",
]) {
  const stat = fs.statSync(path.join(root, file));
  assert.ok(stat.size > 1_000, `${file} is unexpectedly small`);
}

const layout = read("app/layout.tsx");
assert.match(layout, /manifest:\s*"\/manifest\.webmanifest"/);
assert.match(layout, /PwaInstallButton/);
assert.match(layout, /apple-touch-icon\.png/);
assert.match(layout, /themeColor:\s*"#0a1d54"/);

const component = read("components/pwa-install-button.tsx");
assert.match(component, /serviceWorker/);
assert.match(component, /register\("\/sw\.js"/);
assert.match(component, /beforeinstallprompt/);
assert.match(component, /display-mode: standalone/);
assert.match(component, /window\.isSecureContext/);

const sw = read("public/sw.js");
assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/);
assert.match(sw, /request\.mode === "navigate"/);
assert.match(sw, /offline\.html/);
assert.match(sw, /_next\/static/);
assert.doesNotMatch(sw, /cache\.put\([^\n]*\/api\//);

const offline = read("public/offline.html");
assert.match(offline, /не показывает сохранённые новости или аналитику офлайн/);

const nextConfig = read("next.config.ts");
assert.match(nextConfig, /Service-Worker-Allowed/);
assert.match(nextConfig, /no-cache, no-store, must-revalidate/);

console.log("PASS: Web App + PWA contract is installable on secure origins and never caches intelligence APIs");
