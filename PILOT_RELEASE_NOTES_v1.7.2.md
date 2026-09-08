# Окно в Китай — Pilot v1.7.2

## Corporate Decision Cockpit: Market Data & Company Signals

v1.7.2 строится поверх v1.7.1 и добавляет общий корпоративный слой принятия решений без персонального Watchlist.

### Corporate Decision Cockpit

Новый маршрут `/decision` объединяет:

- ranked corporate intelligence feed;
- единый business score;
- `Почему важно` / `Что проверить`;
- Market Data с первоисточниками;
- HCV Snapshot;
- методологические guardrails;
- сводку затронутых функций.

### Единая шкала приоритета

- `72–100` — Критично;
- `60–71` — Высокий приоритет;
- `45–59` — Наблюдение;
- `0–44` — Фон.

Decision Cockpit использует общий корпоративный порог `45/100` и не зависит от персональных пользовательских критериев.

### Персональный Watchlist не используется

Из v1.7.2 удалены:

- персональный Watchlist;
- пользовательские keywords для intelligence;
- персональные truck segments / powertrains / audiences;
- персональный minimum score;
- watchlist-driven intelligence alerts;
- интеграция Decision Cockpit с `/api/user/preferences`.

Существующие старые функции пользовательских preferences и notifications сервиса остаются совместимыми и не расширяются Decision Cockpit-ом.

### Market Data

Market facts физически и логически отделены от новостей. Каждая метрика содержит период, тип actual/forecast, источник и дату источника.

В pilot baseline включены:

- российский рынок новых легковых за январь–июль 2026;
- российский HCV за январь–июль 2026;
- российский HCV за август 2026;
- российский LCV за первое полугодие 2026;
- официальный прогноз CAAM по коммерческому транспорту Китая на 2026 год, явно маркированный как forecast;
- HCV brand snapshot России за июль 2026.

### Data guardrails

- actual ≠ forecast;
- HCV ≠ MCV ≠ LCV ≠ passenger cars;
- news mentions ≠ market share;
- рыночная цифра без периода и источника не считается допустимой Market Data metric.

### Verification

Добавлены/обновлены:

- `lib/decision-market-data.ts`;
- `components/decision-cockpit.tsx`;
- `app/decision/page.tsx`;
- `tests/decision-cockpit-v172.test.mjs`;
- `scripts/decision-cockpit-preflight.mjs`;
- `docs/DECISION_COCKPIT_v1.7.2.md`;
- `tests/runtime-smoke.mjs`.

`lib/watchlist.ts` удалён.

`pilot:decision` включён в общий `pilot:preflight`.

## Data / migration

Новая схема БД не требуется.

## Next

v1.7.3: Daily / Weekly Intelligence Brief + Executive View для руководства на основе общих корпоративных сигналов, без персонального Watchlist.
