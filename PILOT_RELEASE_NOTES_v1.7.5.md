# Окно в Китай — Pilot v1.7.5

## Controlled Corporate Pilot

v1.7.5 переводит технически готовый Pilot Candidate v1.7.4 в измеримый controlled pilot для 5–10 сотрудников.

Персонального Watchlist нет.

## Добавлено

### Pilot Control Room

Новый маршрут `/pilot` с role gate `PILOT_CONTROL_MIN_ROLE`.

Показывает:

- cohort size;
- repeat usage;
- feedback respondents;
- usefulness KPI;
- self-reported saved minutes;
- использование Decision / Executive / Truck контуров;
- issue severity S1–S4;
- итог `GO / ADJUST / STOP` и причины.

### Privacy-first cohort

- имена и email не записываются в pilot feedback;
- существующий HMAC `user_key` отображается только псевдонимом `P-XXXXXX`;
- control-plane routes не увеличивают cohort;
- telemetry явно не предназначена для оценки производительности сотрудников.

### Feedback

Новый маршрут `/pilot-feedback` и endpoint `/api/pilot/feedback`.

В `AUTH_MODE=proxy` feedback требует trusted corporate identity.

### Pilot report

Новый `/api/pilot/report`, защищённый тем же `PILOT_CONTROL_MIN_ROLE`, что и Control Room.

### Issue register

Admin API `/api/admin/pilot/issues` поддерживает S1/S2/S3/S4 и статусы open / mitigated / closed.

Outcome rules:

- open S1 → STOP;
- 2+ open S2 → STOP;
- 1 open S2 → ADJUST;
- недостаточный cohort / feedback / repeat / usefulness → ADJUST;
- выполненные KPI без S1/S2 → GO.

Operational `NO_GO` v1.7.4 всегда переводит итог pilot в STOP до устранения технического blocker.

### Strategic news focus

Новостной фокус расширен до шести стратегических брендов и компаний:

- SHACMAN;
- GWM;
- EVOLUTE;
- VOYAH;
- Моторинвест;
- ЭВИА.

Добавлен единый focus detector с русскими, английскими и китайскими вариантами названий. Материалы этих сущностей получают повышенный приоритет в пользовательской ленте, входят в быстрый фильтр «В фокусе», доступны через отдельные вкладки и получают отдельные badges.

В source catalog включены официальные российские ленты:

- EVOLUTE — `https://www.evolute.ru/about/news/announcements`;
- VOYAH Россия — `https://voyah.ru/news/anons`.

Моторинвест и ЭВИА отслеживаются как компании/юридические лица через общий поток АВТОСТАТ, Telegram и отраслевые источники; они не маскируются под автомобильные бренды.

### CLI / preflight

Добавлены:

```bash
npm run pilot:controlled
npm run pilot:outcome
```

`pilot:controlled` включён в общий `pilot:preflight`.

### Verification

Добавлены:

- `tests/controlled-pilot-v175.test.mjs`;
- `tests/news-focus-v175.test.mjs`;
- `tests/news-focus-sources-v175.test.mjs`;
- runtime smoke для `/pilot`, `/pilot-feedback`, POST feedback и `/api/pilot/report`;
- `scripts/controlled-pilot-preflight.mjs`;
- `scripts/pilot-outcome.mjs`;
- `docs/CONTROLLED_CORPORATE_PILOT_v1.7.5.md`.

Перед merge обязателен combined One-click verification с реальным Docker startup/runtime smoke.

## DB

Отдельной schema migration не требуется: v1.7.5 создаёт две additive runtime tables через `CREATE TABLE IF NOT EXISTS`:

- `pilot_feedback`;
- `pilot_issues`.

Они находятся в том же persistent SQLite volume и входят в существующий backup файла БД.
