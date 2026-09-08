# Окно в Китай — Pilot v1.7.4

## Pilot Operations: Executive RBAC, Freshness SLA & Go/No-Go

v1.7.4 не добавляет новый пользовательский раздел. Версия усиливает эксплуатационную готовность Executive View и делает состояние данных видимым до принятия решений.

### Executive RBAC

`/executive` теперь проверяет минимальную роль на сервере.

Новый параметр:

- `EXECUTIVE_MIN_ROLE=viewer|editor|admin`;
- default `viewer` для локального pilot/demo;
- для controlled corporate pilot рекомендуется `editor` или `admin` вместе с `AUTH_MODE=proxy`.

### Operational trust state

Добавлена единая шкала состояния управленческого brief:

- `GO`;
- `DEGRADED`;
- `STALE`.

Отдельно рассчитывается pilot decision `GO / NO_GO`.

### Freshness / quality

Executive gate использует существующую governance policy `news.aggregate`:

- `SOURCE_SLA_NEWS_SECONDS`;
- `SOURCE_SLA_NEWS_MIN_QUALITY`.

Если агрегат старше SLA или отсутствует, brief получает `STALE`, а formal decision — `NO_GO`.

### Operational panel

На Executive View добавлена отдельная панель доверия к данным:

- возраст данных;
- quality score;
- fresh / stale / error sources;
- последнее обновление;
- SLA;
- причины статуса;
- Go/No-Go.

### Operations API

Новый endpoint:

- `/api/pilot/operations`.

Существующий `/api/admin/reliability` дополнен тем же `pilotOperations` snapshot.

### Manual gate

Новая команда:

```bash
npm run pilot:go-no-go
```

Она предназначена для IT после запуска pilot instance и завершается non-zero при `NO_GO`.

### Verification

Добавлены:

- `lib/pilot-operations.ts`;
- `components/executive-operations-panel.tsx`;
- `app/api/pilot/operations/route.ts`;
- `tests/pilot-operations-v174.test.mjs`;
- `scripts/pilot-operations-v174-preflight.mjs`;
- `scripts/pilot-go-no-go.mjs`;
- `docs/PILOT_OPERATIONS_v1.7.4.md`.

Runtime smoke проверяет operational endpoint. `pilot:ops174` включён в общий `pilot:preflight`.

### Data / migration

Новая DB migration не требуется. Используются существующие `source_snapshots`, `source_history` и governance SLA.

### Product rule

Персонального Watchlist нет. Executive View и Decision Cockpit продолжают использовать одну корпоративную базовую картину и общие thresholds.
