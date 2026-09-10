import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const currency = fs.readFileSync("components/currency-exchange.tsx", "utf8");
const news = fs.readFileSync("components/news-dashboard.tsx", "utf8");

test("travel FX section stays readable in the corporate light theme", () => {
  assert.match(currency, /Курс ЦБ РФ/u);
  assert.match(currency, /1 CNY = \{rateFormatter\.format\(data\.cbr\.rubPerCny\)\} ₽/u);
  assert.match(currency, /text-\[#10285c\]/u);
  assert.match(currency, /rate\.bank\?\.trim\(\) \|\| `Банк \$\{index \+ 1\}`/u);
  assert.match(currency, /Сумма, \{inputCurrency\}/u);
  assert.equal(currency.includes("QuickCard"), false);
  assert.equal(currency.includes('title="100 юаней"'), false);
  assert.equal(currency.includes('title="1 рубль"'), false);
});

test("news feed suppresses incomplete or garbled cards", () => {
  assert.match(news, /function isDisplayableNews/u);
  assert.match(news, /не удалось/u);
  assert.match(news, /replacementChars >= 2/u);
  assert.match(news, /if \(!isDisplayableNews\(item\) \|\| merged\.has\(item\.url\)\) continue/u);
  assert.match(news, /seedNews\.filter\(isDisplayableNews\)/u);
});
