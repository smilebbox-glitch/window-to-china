# Окно в Китай — Pilot v1.7.2

## Decision Cockpit: Market Data, Watchlists & Alerts

v1.7.2 строится поверх v1.7.1 и добавляет рабочий слой принятия решений без создания второй параллельной системы уведомлений или пользовательских настроек.

### Decision Cockpit

Новый маршрут `/decision` объединяет:

- ranked corporate intelligence feed;
- персональный Watchlist;
- Market Data с первоисточниками;
- HCV Snapshot;
- последние intelligence alerts;
- методологические guardrails.

### Watchlists

Пользователь может наблюдать:

- бренды;
- рынки;
- intelligence topics;
- ключевые слова;
- HCV / MCV / LCV и другие truck segments;
- дизель / LNG-CNG / EV / battery swap / hydrogen / hybrid;
- Руководство / R&D / Закупки / Производство / Логистика;
- минимальный business score 30 / 45 / 60 / 72.

Настройки сохраняются в существующем `user_preferences.subscriptions_json`. Новая DB migration не требуется.

### Automatic intelligence alerts

Existing scheduler notification cycle расширен:

1. берётся последний persistent news snapshot;
2. материалы проходят `rankNews()`;
3. применяется watchlist пользователя;
4. проверяется минимальный score;
5. создаётся notification kind `intelligence`.

Alert содержит score, match reasons, `Почему важно`, `Что проверить` и ссылку на источник. `INSERT OR IGNORE` защищает от повторной отправки одного и того же сигнала.

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

### UI / navigation

В основную навигацию добавлен пункт `Решения`.

Decision Cockpit показывает:

- critical signal count;
- watchlist matches;
- unread alerts;
- market fact count;
- приоритетные материалы;
- рыночные факты;
- грузовой market snapshot.

### Verification

Добавлены:

- `lib/watchlist.ts`;
- `lib/decision-market-data.ts`;
- `components/decision-cockpit.tsx`;
- `app/decision/page.tsx`;
- `tests/decision-cockpit-v172.test.mjs`;
- `scripts/decision-cockpit-preflight.mjs`;
- `docs/DECISION_COCKPIT_v1.7.2.md`.

Runtime smoke дополнен `/decision`, user preferences watchlist contract и notification endpoint.

`pilot:decision` включён в общий `pilot:preflight`.

## Data / migration

Новая схема БД не требуется. Используются существующие `user_preferences`, `user_notifications` и `source_snapshots`.

## Next

v1.7.3: Daily / Weekly Intelligence Brief + Executive View после подтверждения v1.7.2 CI/runtime smoke.
