# Окно в Китай — Controlled Corporate Pilot v1.7.5

## Цель

v1.7.5 переводит продукт из технического Pilot Candidate в управляемую корпоративную волну на 5–10 сотрудников. Проверяется не количество просмотров, а фактическая полезность сервиса для принятия решений и экономия времени.

Персонального Watchlist в пилоте нет. Все участники работают с одной корпоративной intelligence-картиной.

## Рекомендуемая Wave 1

Целевой размер: 5–10 пользователей.

Рекомендуемые функции:

- R&D;
- Качество;
- Производство;
- Логистика;
- Закупки;
- Коммерческий блок;
- 1 представитель руководства / sponsor;
- IT/Admin не считается обычным участником, если используется только для сопровождения.

В `pilot_members` сохраняются только:

- HMAC `user_key`;
- внутренний код участника (`P01`, `P02`...);
- подразделение;
- pilot role;
- pilot status;
- даты.

SSO login/e-mail в открытом виде в cohort table не сохраняется.

## Pilot role и application RBAC

`pilot_role` (`participant`, `manager`, `sponsor`, `admin`) — метаданные пилотной программы. Они **не предоставляют права в приложении**.

Application RBAC остаётся авторитетным:

- viewer;
- editor;
- admin;

и определяется `AUTH_MODE`, доверенным reverse proxy и SSO groups.

## Controlled cohort gate

Для стенда/CI:

```env
PILOT_ENFORCE_COHORT=NO
```

Для настоящего корпоративного пилота после заполнения Wave 1:

```env
AUTH_MODE=proxy
PILOT_ENFORCE_COHORT=YES
PILOT_COHORT_NAME=wave-1
```

Viewer вне активного cohort получает экран ограничения доступа. Editor/Admin имеют staff bypass для сопровождения пилота.

## KPI по умолчанию

| KPI | Default |
|---|---:|
| Минимальная cohort | 5 |
| Целевая cohort | 10 |
| Active rate | ≥ 60% |
| Return rate | ≥ 40% |
| Средняя оценка | ≥ 3.8 / 5 |
| Feedback entries | ≥ 3 |
| Подтверждённые полезные сигналы | ≥ 2 |
| Blocker feedback | 0 |

Active user — участник с любым usage event за окно KPI.

Returning user — участник с activity минимум в два разных календарных дня.

`useful_signal` — участник явно подтвердил, что сервис помог заметить полезный бизнес-сигнал.

`saved_minutes` — субъективная оценка участником; это вспомогательная метрика, а не финансово подтверждённая экономия.

## Outcome model

### GO

Operational gate v1.7.4 не имеет blocker, все KPI выполнены, blocker feedback отсутствует.

### ADJUST

Сервис технически доступен, но один или несколько KPI не достигнуты либо есть major feedback. Пилот продолжается в той же группе после corrective actions; расширять cohort рано.

### STOP

Operational gate возвращает `NO_GO` **или** зарегистрирован хотя бы один `blocker`. Расширение пилота останавливается до устранения причины.

## Day 0 — IT validation

1. Развернуть текущий Pilot Candidate.
2. Настроить корпоративный reverse proxy / SSO.
3. Задать сильные секреты:
   - `AUTH_PROXY_SECRET`;
   - `USER_DATA_HMAC_KEY`;
   - `AUDIT_HMAC_KEY`;
   - `SCHEDULER_TOKEN`.
4. Выполнить:

```bash
npm run pilot:preflight
npm run pilot:go-no-go
```

5. Добавить 5–10 участников через `/pilot` под Admin или `POST /api/pilot/cohort`.
6. После подтверждения roster включить:

```env
PILOT_ENFORCE_COHORT=YES
```

7. Проверить вход участника и отказ viewer, которого нет в cohort.
8. Сделать backup до Day 1.

## Day 1 — ограниченный старт

Сначала активировать 3 участников из разных функций.

Каждый должен:

1. войти через корпоративную учётную запись;
2. открыть новости;
3. проверить Truck Radar;
4. открыть Decision Cockpit;
5. найти минимум один релевантный материал;
6. отправить feedback через `/pilot`.

Если появляется blocker — расширение Wave 1 останавливается.

## Day 2–3 — полная Wave 1

Если blocker нет и v1.7.4 operational status не `STALE`, активировать 5–10 участников.

Не менять KPI и thresholds в середине волны без отдельной записи в pilot log.

## Day 5 — Weekly Review

Editor/Admin открывает `/pilot` и сохраняет **Weekly review**.

Проверяются:

- active rate;
- return rate;
- feedback coverage;
- useful business signals;
- saved minutes;
- major/blocker issues;
- activity по подразделениям;
- текущий v1.7.4 operational status.

Decision на Day 5:

- `GO` — продолжить;
- `ADJUST` — исправить и оставить ту же cohort;
- `STOP` — остановить расширение.

## Day 10 — Final Review

1. Сохранить Final Review на `/pilot`.
2. Сформировать evidence package:

```bash
PILOT_BASE_URL=http://127.0.0.1:3000 \
ADMIN_API_TOKEN=<admin-token> \
PILOT_REPORT_DAYS=30 \
npm run pilot:outcome
```

Генератор создаёт в `acceptance/`:

- `PILOT_OUTCOME_<timestamp>.json`;
- `PILOT_OUTCOME_<timestamp>.md`.

Отчёт содержит decision, KPI, operational state, причины и activity по функциям.

## Feedback severity

- `note` — идея/наблюдение;
- `minor` — незначительная проблема;
- `major` — серьёзно мешает работе, outcome минимум `ADJUST`;
- `blocker` — использование невозможно/опасно, outcome `STOP`.

## Что считать полезным сигналом

Примеры:

- изменение регулирования или экспортных условий;
- новый продукт/силовая установка/технология грузовика;
- локализация китайского OEM в РФ;
- изменение HCV/LCV рынка;
- риск supply chain;
- первичный официальный документ, найденный быстрее ручного мониторинга;
- событие, которое привело к проверке, запросу поставщику или внутреннему решению.

Не считать полезным сигналом просто интересную новость без рабочего применения.

## Privacy

- raw SSO subject используется при enrollment только для вычисления HMAC;
- cohort API возвращает лишь короткий `keyFingerprint`;
- участники в UI представлены кодами P01/P02 и подразделением;
- usage связывается с тем же псевдонимным user key;
- feedback не требует имени/e-mail;
- HMAC key должен храниться как secret и не попадать в Git.

## Exit criteria

Пилот можно считать доказавшим ценность только если одновременно:

1. Operational gate стабилен.
2. Нет blocker feedback.
3. Wave 1 содержит минимум 5 реальных пользователей.
4. Есть повторное использование.
5. Есть подтверждённые полезные бизнес-сигналы.
6. У feedback достаточно покрытия для вывода.
7. Итоговый outcome зафиксирован как evidence, а не сформулирован устно.
