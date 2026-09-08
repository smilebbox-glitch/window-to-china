import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sources = fs.readFileSync("lib/news-sources.ts", "utf8");

function sourceBlock(id) {
  return sources.match(new RegExp(`id: "${id}"[\\s\\S]*?\\n  },`))?.[0] ?? "";
}

test("EVOLUTE official Russian news source is active", () => {
  const block = sourceBlock("evolute-official");
  assert.ok(block.includes("https://www.evolute.ru/about/news/announcements"));
  assert.ok(block.includes('sourceType: "official"'));
  assert.ok(block.includes("enabledByDefault: true"));
});

test("VOYAH official Russian news source is active", () => {
  const block = sourceBlock("voyah-official");
  assert.ok(block.includes("https://voyah.ru/news/anons"));
  assert.ok(block.includes('sourceType: "official"'));
  assert.ok(block.includes("enabledByDefault: true"));
});

test("focus source catalog retains official priority", () => {
  for (const id of ["evolute-official", "voyah-official"]) {
    const block = sourceBlock(id);
    assert.ok(block.includes("priority: 100"));
    assert.ok(block.includes('market: "Россия"'));
    assert.ok(block.includes('language: "ru"'));
  }
});
