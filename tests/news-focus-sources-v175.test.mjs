import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sources = fs.readFileSync("lib/news-sources.ts", "utf8");

test("EVOLUTE official Russian news source is active", () => {
  const block = sources.match(/id: "evolute-official"[\s\S]*?\n  },/)?.[0] ?? "";
  assert.ok(block.includes("https://www.evolute.ru/about/news/announcements"));
  assert.ok(block.includes('sourceType: "official"'));
  assert.ok(block.includes("enabledByDefault: true"));
});

test("VOYAH official Russian news source is active", () => {
  const block = sources.match(/id: "voyah-official"[\s\S]*?\n  },/)?.[0] ?? "";
  assert.ok(block.includes("https://voyah.ru/news/anons"));
  assert.ok(block.includes('sourceType: "official"'));
  assert.ok(block.includes("enabledByDefault: true"));
});
