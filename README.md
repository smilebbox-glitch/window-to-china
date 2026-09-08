# Окно в Китай — Pilot v1.7.9

Внутренняя корпоративная информационно-аналитическая платформа для сотрудников, работающих с Китаем, китайским автопромом и связанными бизнес-задачами.

**Текущая версия `main`: Pilot v1.7.9.**

## Что есть в продукте

- свежая новостная лента с приоритетным мониторингом **SHACMAN, GWM, EVOLUTE, VOYAH, Моторинвест, ЭВИА** и отрасли;
- типизированный каталог китайских и российских источников;
- автоматическая дедупликация похожих материалов и fresh-first выдача;
- перевод китайских материалов на русский с контролем нагрузки и retry/cooldown;
- бейджи происхождения: **Официальный источник / Отраслевое СМИ / Telegram**;
- ссылки на первоисточник для проверки важных сигналов;
- **Truck Radar** `/trucks` для коммерческого транспорта Китая и России;
- **Intelligence Ranking** и аналитика `/analysis` с business score, «Почему важно» и «Что проверить»;
- **Corporate Decision Cockpit** `/decision` с общей корпоративной приоритизацией сигналов;
- **Executive View** `/executive` с Daily / Weekly Brief для руководства;
- календарь автомобильных выставок и отраслевых событий;
- раздел подготовки к командировке в Китай;
- CNY ↔ RUB и вспомогательные travel/business данные;
- **Pilot Operations** с `GO / DEGRADED / STALE` и формальным `GO / NO_GO`;
- **Controlled Corporate Pilot** на 5–10 сотрудников с feedback, KPI и итогом `GO / ADJUST / STOP`;
- IT/Admin Reliability console, SQLite persistence, backup, audit и source diagnostics.

## Что нового в v1.7.9

v1.7.9 — актуальный hardening-релиз перед controlled corporate pilot:

- AUTOSTAT: RSS с автоматическим fallback на новостную страницу;
- MOFCOM переведён на стабильный entrypoint;
- нестабильные People Auto, Yiche и Грузовик Пресс сохранены как reserve-only источники;
- Google Translate выполняет один translation request на материал с pacing и bounded retry/cooldown на `429`;
- HTTPS → HTTP redirect того же hostname не разрешает downgrade;
- aggregate health оценивается по общей quality, а не становится `PARTIAL` из-за единичного best-effort source failure;
- Pilot Operations использует явный порог деградации источников;
- GitHub Actions проверяет production dependency audit, production build, полный pilot preflight, live Docker pilot, runtime tests и `pilot:go-no-go`.

Подробности: `docs/SOURCE_RELIABILITY_v1.7.9.md` и `PILOT_START_v1.7.9.md`.

## Быстрый запуск

### Windows

Дважды нажмите:

```text
START.bat
```

Windows launcher автоматически подготавливает конфигурацию, запускает Docker pilot, проверяет health/readiness и показывает адрес для доступа из доверенной локальной сети. При конфликте порта используется свободный порт из разрешённого диапазона без остановки постороннего процесса.

### Linux / macOS

```bash
./start.sh
```

Для остановки и проверки состояния используются `STOP.bat` / `STATUS.bat` либо `./stop.sh` / `./status.sh`.

## Проверка Pilot Candidate

После установки зависимостей:

```bash
npm run pilot:preflight
```

Production dependency audit:

```bash
npm run pilot:audit-deps
```

После запуска сервиса:

```bash
npm run pilot:go-no-go
```

Отдельные функциональные проверки:

```bash
npm run pilot:functional
BASE_URL=http://127.0.0.1:3000 npm run pilot:functional:runtime
```

## Ключевые маршруты

- `/` — Главная;
- `/news` — Новости;
- `/trucks` — Truck Radar;
- `/market` — Рынок;
- `/analysis` — Аналитика / Intelligence Ranking;
- `/decision` — Corporate Decision Cockpit;
- `/executive` — Executive Daily / Weekly Brief;
- `/calendar` — Выставки и события;
- `/travel-guide` — Перед поездкой;
- `/pilot-feedback` — обратная связь участника пилота;
- `/pilot` — Pilot Control Room;
- `/admin` — IT/Admin Reliability.

## Ключевые API

- `GET /api/health`
- `GET /api/ready`
- `GET /api/news`
- `POST /api/analyze`
- `GET /api/pilot/operations`
- `GET /api/pilot/report`
- `POST /api/pilot/feedback`
- `GET /api/admin/reliability`
- `GET /api/metrics`

## Controlled corporate pilot

Рекомендуемая Wave 1: **5–10 сотрудников** на 10 дней. Основные KPI по умолчанию:

- repeat usage ≥ 40%;
- минимум 3 feedback responses;
- usefulness 4–5 ≥ 70%;
- отсутствие открытых S1;
- отсутствие двух и более открытых S2.

Pilot Control Room формирует итог `GO / ADJUST / STOP`.

Для корпоративного режима через reverse proxy / SSO используйте `AUTH_MODE=proxy`, сильные pilot secrets и ограничения доступа согласно `PILOT_START_v1.7.9.md`.

## Данные и безопасность

- SQLite хранится в persistent Docker volume;
- используются migrations, WAL, backup и retention policies;
- source/network access ограничен explicit outbound policy;
- downgrade HTTPS → HTTP блокируется;
- pilot telemetry предназначена для оценки продукта, а не сотрудников;
- пользовательские идентификаторы в pilot-контуре псевдонимизируются;
- нестабильные внешние источники не должны отключать общий новостной контур.

## Статус сборки

Pilot v1.7.9 прошёл GitHub Actions на актуальном head: production dependency audit, build, полный test/preflight suite, live Docker pilot, runtime smoke и Pilot Go/No-Go.

Физический запуск во внутренней сети компании остаётся отдельным Day 0 IT validation и не считается выполненным только по факту успешного CI.
