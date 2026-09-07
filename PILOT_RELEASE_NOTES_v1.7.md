# Окно в Китай — Pilot v1.7

## China Intelligence Sources & Dedup Pipeline

v1.7 усиливает уже существующий корпоративный pilot stack. One-click LAN startup, Docker, persistent SQLite, scheduler, backup, security controls и reliability history не переписываются — они используются как основа.

### Новые источники

Добавлен централизованный typed source catalog. Активный набор расширен официальными и специализированными источниками, включая:

- CAAM;
- MIIT China / Automotive Industry;
- MOFCOM China;
- National Bureau of Statistics of China;
- China Automobile Dealers Association;
- Gasgoo;
- CnEVPost;
- Yicai Global;
- China Briefing;
- 36Kr Global;
- CarNewsChina;
- существующие официальные китайские auto portals;
- существующие российские/Telegram источники.

China Daily, Caixin Global и GACC внесены в каталог как резервные/data candidates, но не включены по умолчанию.

### Дедупликация

Старая exact-title дедупликация заменена многоступенчатой:

- canonical URL;
- normalized title fingerprint;
- fuzzy token similarity в 72-часовом окне;
- source authority/priority selection.

При нескольких пересказах одной истории остаётся наиболее первичный/авторитетный источник.

### Надёжность ingestion

- каждый источник получает собственный persistent snapshot;
- ошибка одного сайта не ломает общую ленту;
- per-source stale fallback;
- ограниченная параллельность (`NEWS_SOURCE_CONCURRENCY`);
- отдельные fetch / translation / source / request deadlines;
- фильтр максимального возраста новостей;
- aggregate diagnostics: raw count, deduplicated count, source breakdown.

### Monitoring

`/api/admin/reliability` дополнен состоянием source catalog. Existing `source_history` продолжает фиксировать status, quality, item count, latency и error для каждого source job.

### Security

Новые внешние hostname добавлены только в явный outbound allow-list; существующая SSRF policy и redirect validation сохранены.

### Deployment

LAN режим и запуск через `START.bat` сохранены. Новые ingestion limits передаются в контейнер через `compose.yaml` и документированы в `.env.example`.

### Verification

Добавлены:

- `scripts/news-intelligence-preflight.mjs`;
- `tests/news-intelligence-v17.test.mjs`;
- `docs/NEWS_SOURCE_CATALOG_v1.7.md`.

`pilot:intelligence` включён в общий `pilot:preflight`.

## Migration / data

Нет новой DB migration. Существующие SQLite tables `source_snapshots` и `source_history` переиспользуются.
