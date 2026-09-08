# Окно в Китай — Pilot v1.7.3

## Daily / Weekly Intelligence Brief + Executive View

v1.7.3 строится поверх корпоративного Decision Cockpit v1.7.2 и добавляет отдельный управленческий слой без персонального Watchlist.

### Executive View

Новый маршрут `/executive` и пункт `Руководство` в основной навигации.

Экран показывает:

- Daily Brief за последние 24 часа;
- Weekly Brief за последние 7 дней;
- количество critical/high-priority сигналов;
- количество значимых truck signals;
- число свежих источников;
- Executive Summary;
- Decision Signals;
- затронутые функции;
- географию периода;
- Market Pulse;
- блок `Что контролировать дальше`;
- печать / сохранение в PDF через browser print.

### Brief engine

Новый `lib/intelligence-brief.ts` использует существующий `rankNews()` и общую корпоративную шкалу:

- 72–100 — Критично;
- 60–71 — Высокий приоритет;
- 45–59 — Наблюдение;
- 0–44 — Фон.

Brief не подмешивает старые материалы в Daily/Weekly окно. Если свежих данных нет, пользователь получает явный empty-state.

### No personal Watchlist

v1.7.3 не использует:

- персональный Watchlist;
- `/api/user/preferences` для Executive View;
- пользовательские keywords;
- персональные thresholds;
- персональные intelligence subscriptions.

Все пользователи видят одну корпоративную базовую картину.

### Management outputs

Для верхних сигналов выводятся:

- business score;
- рынок / бренд / truck segment;
- краткое содержание;
- `Почему важно`;
- `Что проверить`;
- затронутые функции;
- источник и время публикации.

### Market Pulse

Executive View переиспользует factual Market Data v1.7.2. Прогнозы не смешиваются с фактическими метриками.

### Verification

Добавлены:

- `lib/intelligence-brief.ts`;
- `components/executive-brief.tsx`;
- `app/executive/page.tsx`;
- `tests/executive-brief-v173.test.mjs`;
- `scripts/executive-brief-preflight.mjs`;
- `docs/EXECUTIVE_BRIEF_v1.7.3.md`;
- runtime smoke для `/executive`;
- `pilot:executive` в общем `pilot:preflight`.

## Data / migration

Новая схема БД не требуется.

## Next

После прохождения CI v1.7.3 можно считать сильным кандидатом для управленческого пилота. Следующий этап имеет смысл посвятить не новым экранам, а качеству pilot operations: роли доступа к Executive View, freshness SLA, источник/ошибка на уровне brief и demo/runbook для руководства.
