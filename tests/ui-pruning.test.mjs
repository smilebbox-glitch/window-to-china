import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read = (path) => fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('retired UI elements stay removed', async () => {
  const [shell, tripNav, myPage] = await Promise.all([
    read('components/site-shell.tsx'),
    read('components/trip-workspace-nav.tsx'),
    read('app/my/page.tsx'),
  ]);

  assert.doesNotMatch(shell, /15\s*мин/iu);
  assert.doesNotMatch(shell, /href:\s*["']\/my["']/u);
  assert.doesNotMatch(shell, /label:\s*["']Моё["']/u);
  assert.doesNotMatch(shell, /label:\s*["']Решения["']/u);
  assert.doesNotMatch(shell, /label:\s*["']Руководство["']/u);
  assert.doesNotMatch(shell, /<span>Сервис<\/span>/u);
  assert.doesNotMatch(shell, /aria-label=["']Язык интерфейса["']/u);
  assert.doesNotMatch(shell, /aria-label=["']Уведомления["']/u);

  assert.doesNotMatch(tripNav, /Моя поездка/u);
  assert.doesNotMatch(tripNav, /href:\s*["']\/my["']/u);
  assert.match(tripNav, /label:\s*["']Расчёт["']/u);
  assert.match(tripNav, /label:\s*["']Правила["']/u);

  assert.match(myPage, /redirect\(["']\/["']\)/u);
  assert.doesNotMatch(myPage, /UserHub/u);
});
