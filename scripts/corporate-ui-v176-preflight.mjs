import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const requiredFiles = [
  "components/site-shell.tsx",
  "components/corporate-home.tsx",
  "components/corporate-page-hero.tsx",
  "app/news/page.tsx",
  "public/corporate/hero-shanghai.svg",
  "public/corporate/hero-trucks.svg",
  "public/corporate/hero-expo.svg",
  "public/corporate/hero-travel.svg",
];
for (const file of requiredFiles) check(exists(file), `missing corporate UI file: ${file}`);

const shell = read("components/site-shell.tsx");
const home = read("components/corporate-home.tsx");
const css = read("app/globals.css");
const executive = read("app/executive/page.tsx");
const pages = {
  news: read("app/news/page.tsx"),
  trucks: read("app/trucks/page.tsx"),
  market: read("app/market/page.tsx"),
  analysis: read("app/analysis/page.tsx"),
  decision: read("app/decision/page.tsx"),
  executive,
  calendar: read("app/calendar/page.tsx"),
  travel: read("app/travel-guide/page.tsx"),
};

for (const route of ["/news", "/trucks", "/market", "/analysis", "/decision", "/executive", "/calendar", "/travel-guide"]) {
  check(shell.includes(`href: "${route}"`), `corporate sidebar missing ${route}`);
}

for (const token of ["corporate-topbar", "corporate-sidebar", "corporate-nav-item", "corporate-mark"]) {
  check(shell.includes(token) || css.includes(`.${token}`), `corporate shell token missing: ${token}`);
}

for (const token of [".corp-hero", ".corp-card", ".corp-section-title", ".corp-pill", ".corp-hero-home", ".corp-hero-trucks", ".corp-hero-expo", ".corp-hero-travel"]) {
  check(css.includes(token), `corporate CSS token missing: ${token}`);
}

for (const [name, source] of Object.entries(pages)) {
  check(source.includes("CorporatePageFrame"), `${name} is not wrapped by CorporatePageFrame`);
  check(source.includes("CorporatePageHero"), `${name} is not using CorporatePageHero`);
}

const forbiddenHome = [
  "Смотреть новости",
  "Решения на сегодня",
  "Рекомендация",
  "Что взять с собой",
  "Открыть календарь",
  "Быстрые действия",
  "Состояние источников",
  "Ключевые темы",
  "Популярные разделы",
];
for (const token of forbiddenHome) check(!home.includes(token), `retired home block returned: ${token}`);

const forbiddenShell = ["Ключевые темы", "Популярные разделы", "Быстрые действия", "Состояние источников"];
for (const token of forbiddenShell) check(!shell.includes(token), `retired right sidebar returned: ${token}`);

check(!executive.includes("ExecutiveOperationsPanel"), "Executive View must not render Pilot Operations/GO panel");
check(!home.includes("bg-red") && !home.includes("#ef") || !home.includes("Смотреть новости"), "red news CTA must stay retired");
check(home.includes("/api/news"), "corporate home must use live news API");
check(home.includes("VOYAH") && home.includes("EVOLUTE") && home.includes("Моторинвест") && home.includes("ЭВИА"), "corporate home must keep strategic focus entities");
check(shell.includes("Корпоративный пилот"), "pilot identity missing from shell");

if (failures.length) {
  console.error("NO-GO: v1.7.6 corporate UI preflight failed");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("GO: v1.7.6 corporate UI; approved shell=on; rightSidebar=off; retiredWidgets=off; executiveOpsPanel=off; liveHome=on");
