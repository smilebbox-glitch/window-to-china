# Окно в Китай — Pilot v1.7.9

Внутренняя корпоративная информационно-аналитическая платформа для сотрудников, работающих с Китаем, китайским автопромом и связанными бизнес-задачами.

**Текущая версия `main`: Pilot v1.7.9.**

## Что есть в продукте

- свежая новостная лента с приоритетным мониторингом **SHACMAN, GWM, EVOLUTE, VOYAH, Моторинвест, ЭВИА** и отрасли;
- у live-новостей отдельно отображаются **точные дата и время первого получения сервисом** и дата/время публикации источником (МСК);
- **персональные web-уведомления о новых новостях**: общий выключатель, фильтры по компаниям/брендам и сегментам автопрома, внутренний колокольчик и системные уведомления браузера/ОС на secure origin;
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
- IT/Admin Reliability console, SQLite persistence, backup, audit и source diagnostics;
- отдельный **Corporate HTTPS + SSO** профиль: Nginx TLS → oauth2-proxy/OIDC → приложение в `AUTH_MODE=proxy`.

## Время новости: публикация и получение

В новостной карточке разделены два времени:

- **Получено** — момент, когда live-материал впервые был принят текущим контуром «Окна в Китай»; значение сохраняется при последующих обновлениях того же материала в source snapshot;
- **Опубликовано** — timestamp, который пришёл из первоисточника.

Оба значения отображаются в формате `дата, ЧЧ:ММ МСК`. Для встроенной резервной seed-ленты историческое время получения намеренно не выдумывается: если live timestamp недоступен, интерфейс показывает `Получено: нет данных`.

Чтобы после внедрения timestamp-схемы не использовать старый кэш без поля получения, версия каталога news-cache повышена до `5`. Повторные live-refresh того же материала сохраняют уже зафиксированное `receivedAt` по идентификатору или canonical URL.

Regression-контракт: `tests/news-received-time-v179.test.mjs`.

## Персональные web-уведомления

Пользователь может включить или полностью выключить уведомления и выбрать, какие материалы ему интересны.

Доступные фильтры включают:

- компании и бренды — **SHACMAN, GWM, EVOLUTE, VOYAH, Моторинвест, ЭВИА** и другие обнаруживаемые компании;
- сегменты — коммерческий транспорт, легковые автомобили, EV/NEV, компоненты и поставщики, производство и локализация, логистика, регулирование/геополитика, рынок/продажи, технологии/ADAS;
- режим **«Весь автопром»** для всех новых отраслевых материалов.

В web-интерфейсе работает внутренний колокольчик с непрочитанными материалами. При наличии Notification API, разрешения пользователя и secure context (`HTTPS` или `localhost`) сервис также показывает системные уведомления браузера/ОС. Клиент проверяет новые персональные уведомления раз в 60 секунд; клик по системному уведомлению открывает связанный материал.

Если `notificationsEnabled=false`, новые персональные уведомления для пользователя не генерируются. Уже созданная история сохраняется до стандартного срока retention.

Текущий пилот использует **web-notification**, а не серверный Web Push: если браузер/PWA полностью закрыты и остановлены ОС, гарантированная фоновая доставка не выполняется. Для такого режима потребуется отдельная корпоративная Web Push/VAPID-конфигурация.

Regression-контракт: `tests/web-notifications.test.mjs`. Подробности: `docs/WEB_NOTIFICATIONS_v1.7.9.md`.

## Что нового в v1.7.9

v1.7.9 — актуальный hardening-релиз перед controlled corporate pilot:

- AUTOSTAT: RSS с автоматическим fallback на новостную страницу;
- MOFCOM переведён на стабильный entrypoint;
- нестабильные People Auto, Yiche и Грузовик Пресс сохранены как reserve-only источники;
- Google Translate выполняет один translation request на материал с pacing и bounded retry/cooldown на `429`;
- HTTPS → HTTP redirect того же hostname не разрешает downgrade;
- aggregate health оценивается по общей quality, а не становится `PARTIAL` из-за единичного best-effort source failure;
- Pilot Operations использует явный порог деградации источников;
- новостная лента различает timestamp публикации и точное время получения live-материала сервисом;
- добавлены настраиваемые персональные web-уведомления по компаниям и сегментам автопрома с полным выключателем;
- GitHub Actions проверяет production build, test/preflight suite, live Docker pilot, runtime smoke, Web App/PWA и корпоративный HTTPS/SSO deployment contract.

Подробности: `docs/SOURCE_RELIABILITY_v1.7.9.md`, `PILOT_START_v1.7.9.md`, `docs/PWA_WEB_APP_v1.7.9.md`, `docs/WEB_NOTIFICATIONS_v1.7.9.md` и `docs/CORPORATE_HTTPS_SSO_v1.7.9.md`.

## Быстрый запуск

### Windows — локальный/LAN пилот

Дважды нажмите:

```text
START.bat
```

Windows launcher автоматически подготавливает конфигурацию, запускает Docker pilot, проверяет health/readiness и показывает адрес для доступа из доверенной локальной сети. При конфликте порта используется свободный порт из разрешённого диапазона без остановки постороннего процесса.

### Windows — корпоративный HTTPS + SSO

После получения от IT внутреннего DNS-имени, OIDC-реквизитов и доверенного TLS-сертификата:

```text
START_CORPORATE_HTTPS.bat
```

Корпоративный launcher создаёт локальные runtime-секреты, выполняет preflight и запускает отдельный Compose-профиль. Если OIDC или TLS не настроены, запуск завершается `NO-GO` без небезопасного fallback.

Шаблон конфигурации: `.env.corporate.example`.

Проверка/остановка корпоративного профиля:

```text
STATUS_CORPORATE.bat
STOP_CORPORATE.bat
```

### Linux / macOS

```bash
./start.sh
```

Для остановки и проверки состояния локального/LAN-пилота используются `STOP.bat` / `STATUS.bat` либо `./stop.sh` / `./status.sh`.

## Корпоративный периметр

Рекомендуемая схема:

```text
Сотрудник
  ↓ HTTPS
Nginx / TLS
  ↓ auth_request
oauth2-proxy / корпоративный OIDC
  ↓ trusted identity headers
Окно в Китай (AUTH_MODE=proxy)
```

Приложение в корпоративном Compose-профиле не публикует свой Node-порт напрямую наружу. Identity headers формируются только доверенным reverse proxy и защищены `AUTH_PROXY_SECRET`.

Группы RBAC по умолчанию:

- `okno-china-admin` → `admin`;
- `okno-china-editor` → `editor`;
- остальные успешно аутентифицированные сотрудники → `viewer`.

Фактические имена групп должны быть согласованы с корпоративным IT/IdP.

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

Полный `npm test` включает regression-контракты времени получения новостей и web-уведомлений. GitHub Actions дополнительно поднимает реальный Docker pilot, проверяет health/readiness, runtime API/UI, Web App/PWA и корпоративный HTTPS/SSO contract.

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
- `/my` — персональное пространство, история уведомлений и пользовательские настройки;
- `/pilot-feedback` — обратная связь участника пилота;
- `/pilot` — Pilot Control Room;
- `/admin` — IT/Admin Reliability.

## Ключевые API

- `GET /api/health`
- `GET /api/ready`
- `GET /api/news`
- `POST /api/analyze`
- `GET /api/user/preferences`
- `PUT /api/user/preferences`
- `GET /api/user/notifications`
- `PATCH /api/user/notifications`
- `GET /api/pilot/operations`
- `GET /api/pilot/report`
- `POST /api/pilot/feedback`
- `GET /api/admin/reliability`
- `GET /api/metrics`

`GET /api/news` для live-материалов возвращает `receivedAt` наряду с `publishedAt`.

В корпоративном пользовательском ingress `/api/metrics` не публикуется наружу.

## Controlled corporate pilot

Рекомендуемая Wave 1: **5–10 сотрудников** на 10 дней. Основные KPI по умолчанию:

- repeat usage ≥ 40%;
- минимум 3 feedback responses;
- usefulness 4–5 ≥ 70%;
- отсутствие открытых S1;
- отсутствие двух и более открытых S2.

Pilot Control Room формирует итог `GO / ADJUST / STOP`.

Для корпоративного режима используется `AUTH_MODE=proxy`, сильные локальные runtime-secrets, OIDC и TLS-периметр из `compose.corporate.yaml`.

## Данные и безопасность

- SQLite хранится в persistent Docker volume;
- используются migrations, WAL, backup и retention policies;
- source/network access ограничен explicit outbound policy;
- downgrade HTTPS → HTTP блокируется;
- pilot telemetry предназначена для оценки продукта, а не сотрудников;
- пользовательские идентификаторы в pilot-контуре псевдонимизируются;
- настройки подписок и история уведомлений сохраняются в пользовательском профиле;
- нестабильные внешние источники не должны отключать общий новостной контур;
- `.env.corporate`, TLS private keys и локальные runtime-secrets не должны попадать в Git.

## Статус сборки

Актуальный `main` содержит Pilot v1.7.9, точное время получения live-новостей, настраиваемые web-уведомления, Web App/PWA и корпоративный HTTPS/SSO deployment profile. One-click verification проверяет build/tests, корпоративный ingress/Compose contract, запуск Docker pilot, health/readiness, runtime smoke и PWA runtime.

Физическое подключение к корпоративному IdP, внутреннему DNS и корпоративному CA остаётся отдельным Day 0 IT validation и не считается выполненным только по факту успешного CI.