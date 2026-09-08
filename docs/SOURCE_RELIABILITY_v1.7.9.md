# Source Reliability v1.7.9

## Цель

Сделать новостной контур пригодным для controlled corporate pilot: единичная недоступность внешнего сайта не должна останавливать сервис, но диагностика не должна скрывать проблему.

## Что изменено

### AUTOSTAT

Основной путь остаётся RSS. Если RSS ограничивает автоматизированный доступ, ingestion автоматически переходит на русскоязычную HTML-ленту `m.autostat.ru/news/`. Пользователь по-прежнему получает ссылку на исходную публикацию.

### Google Translate

Один материал переводится одним запросом вместо двух отдельных запросов для заголовка и описания. Запросы проходят через общий pacing-контур и при HTTP 429 выполняют ограниченный retry с cooldown. Параметры задаются через `TRANSLATE_MIN_INTERVAL_MS` и `TRANSLATE_MAX_ATTEMPTS`.

### Redirect security

Общая SSRF-политика не ослаблена: обычный HTTP по-прежнему запрещён, кроме явно разрешённых внутренних hosts. Если HTTPS-сайт пытается сделать redirect на HTTP того же hostname, клиент не принимает downgrade, а повторяет целевой URL через HTTPS. Это устраняет ложную деградацию Autohome/PCauto без разрешения небезопасного HTTP.

### Reserve sources

Источники, которые во внешних дата-центрах систематически дают bot-protection/404/5xx, не удалены из каталога, но переведены в reserve-only:

- People Auto;
- Yiche;
- Грузовик Пресс.

Их можно включать после проверки доступности из сети компании. Основное покрытие сохраняется другими официальными и отраслевыми источниками.

### Aggregate quality

Состояние news aggregate определяется общей полнотой, а не фактом единичной ошибки:

- live source: 100% веса;
- stale fallback: 50%;
- успешно проверенный источник без релевантной новой статьи: 75%;
- hard error: 0%.

При `NEWS_AGGREGATE_LIVE_QUALITY_MIN=75` aggregate остаётся `LIVE`, если общая полнота достаточна. Ошибки при этом сохраняются в `errors`, `sourceBreakdown` и Reliability — они не скрываются.

### Pilot Operations

`GO / DEGRADED / STALE` отделён от состояния одного best-effort источника. По умолчанию brief становится `DEGRADED`, когда доля `error + stale` достигает `PILOT_SOURCE_DEGRADED_PCT=25` либо aggregate не выполняет SLA/quality policy.

`NO_GO` по-прежнему применяется при реальных блокерах:

- недоступна SQLite;
- есть неприменённые migrations;
- отсутствует news aggregate;
- aggregate истёк или старше freshness SLA.

## Что это означает для пилота

Внешний источник может временно быть недоступен без остановки продукта. IT видит конкретный источник и состояние в Reliability. Для руководителя и обычного сотрудника сохраняется свежая агрегированная лента с явными ссылками на первоисточники и бейджами типа источника.

## Проверка

Контракты закреплены в:

- `tests/source-reliability-v179.test.mjs`;
- `tests/news-intelligence-v17.test.mjs`;
- `tests/pilot-runtime-v177.mjs`;
- `tests/runtime-smoke.mjs`.

GitHub Actions также выполняет production dependency audit, production build, полный preflight и live Docker pilot.
