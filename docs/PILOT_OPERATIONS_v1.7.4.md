# Окно в Китай v1.7.4 — Pilot Operations

## Цель

v1.7.4 переводит Executive View из просто удобного экрана в управляемый корпоративный контур. Перед использованием управленческого brief система показывает, свежи ли данные, соблюдён ли SLA и есть ли operational blockers.

Персональный Watchlist не используется.

## 1. Executive RBAC

`/executive` проверяет роль на сервере до отображения управленческого экрана.

Настройка:

```env
EXECUTIVE_MIN_ROLE=viewer
```

Допустимые значения:

- `viewer` — локальный pilot/demo без SSO;
- `editor` — рекомендуемый controlled corporate pilot;
- `admin` — максимально закрытый режим.

При `AUTH_MODE=proxy` роль определяется доверенными proxy headers и группами SSO через существующий RBAC.

## 2. Operational state

Executive View получает отдельный operational trust state:

- `GO` — news aggregate свежий, SLA соблюдён, критических operational blockers нет;
- `DEGRADED` — aggregate свежий, но часть источников stale/error или quality ниже целевого уровня;
- `STALE` — aggregate старше допустимого SLA, отсутствует либо runtime data layer не готов.

Отдельно формируется pilot decision:

- `GO` — pilot может продолжаться;
- `NO_GO` — управленческий brief нельзя считать актуальным для принятия решений.

`DEGRADED` может сопровождаться pilot decision `GO`, но пользователь видит причины деградации.

## 3. Freshness SLA

v1.7.4 не вводит второй независимый SLA. Executive View использует существующую governance policy:

```env
SOURCE_SLA_NEWS_SECONDS=3600
SOURCE_SLA_NEWS_MIN_QUALITY=50
```

По умолчанию:

- максимальный возраст news aggregate — 60 минут;
- минимальный quality score — 50/100.

Если возраст превышен, brief становится `STALE` и pilot decision — `NO_GO`.

## 4. Operational panel

На `/executive` отображаются:

- `GO / DEGRADED / STALE`;
- `Go/No-Go`;
- возраст агрегированных данных;
- quality score;
- число fresh sources;
- stale/error sources;
- last updated;
- SLA;
- причины текущего статуса.

Если operational endpoint недоступен, UI явно предупреждает не использовать brief как подтверждённый источник.

## 5. API

### `/api/pilot/operations`

Возвращает:

- pilot decision;
- brief status;
- Executive minimum role;
- aggregate freshness/quality;
- source breakdown counters;
- database status;
- migration status;
- SLA;
- reasons.

Endpoint требует минимум `viewer` по существующему RBAC.

### `/api/admin/reliability`

Существующий reliability API дополнен полем `pilotOperations`, поэтому IT видит тот же operational gate из административного контура.

## 6. Manual Go/No-Go

После one-click startup IT может выполнить:

```bash
npm run pilot:go-no-go
```

По умолчанию проверяется `http://127.0.0.1:3000/api/pilot/operations`.

Для другого адреса:

```bash
BASE_URL=http://10.0.0.20:3000 npm run pilot:go-no-go
```

Команда возвращает non-zero exit code при `NO_GO` или недоступном operational endpoint.

## 7. Что блокирует GO

Hard blockers:

- SQLite runtime DB недоступна;
- есть pending DB migrations;
- отсутствует news aggregate snapshot;
- aggregate expired;
- aggregate старше `SOURCE_SLA_NEWS_SECONDS`.

Warnings / degraded mode:

- aggregate status `partial`;
- quality ниже `SOURCE_SLA_NEWS_MIN_QUALITY`;
- один или несколько source jobs находятся в `stale` или `error`.

## 8. Pilot procedure

Перед демонстрацией или управленческой сессией:

1. Запустить сервис one-click способом.
2. Дождаться readiness.
3. Открыть `/executive`.
4. Убедиться, что operational panel не показывает `STALE`.
5. Для formal go/no-go выполнить `npm run pilot:go-no-go`.
6. При `DEGRADED` открыть причины и проверить конкретные stale/error sources.
7. При `NO_GO` не использовать brief как актуальную основу для решений до восстановления данных.

## 9. Verification

v1.7.4 добавляет:

- `tests/pilot-operations-v174.test.mjs`;
- `scripts/pilot-operations-v174-preflight.mjs`;
- runtime smoke для `/api/pilot/operations`;
- `pilot:ops174` в общий `pilot:preflight`;
- `pilot:go-no-go` для post-start проверки.

Новая DB migration не требуется.
