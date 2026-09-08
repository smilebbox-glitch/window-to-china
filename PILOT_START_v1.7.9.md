# Окно в Китай — Pilot Start v1.7.9

## Назначение

Этот runbook описывает Day 0 и первые 10 дней controlled corporate pilot. Он не означает, что сервис уже физически развёрнут в корпоративной сети: финальный on-prem запуск выполняется на пилотном сервере/ПК компании.

## Day 0 — IT validation

1. Получить проверенную ветку/сборку Pilot Candidate.
2. Создать `.env` из `.env.example`.
3. Заменить обязательные pilot secrets:
   - `ADMIN_API_TOKEN`;
   - `AUDIT_HMAC_KEY`;
   - `SCHEDULER_TOKEN`;
   - `USER_DATA_HMAC_KEY`.
4. Для controlled corporate mode через reverse proxy/SSO установить:
   - `AUTH_MODE=proxy`;
   - `AUTH_PROXY_SECRET`;
   - корректные `AUTH_ADMIN_GROUP` / `AUTH_EDITOR_GROUP`;
   - `EXECUTIVE_MIN_ROLE=editor` или `admin` по политике компании;
   - `PILOT_CONTROL_MIN_ROLE=admin`.
5. Разрешить входящий TCP на `APP_PORT` только в доверенной LAN/VLAN.
6. Проверить outbound HTTPS к нужным источникам. Reserve-only источники включать только после отдельной проверки доступности.
7. Запустить:

   Windows:
   `START.bat`

   Linux:
   `./start.sh`

8. Проверить:
   - `/api/health` → `ok`;
   - `/api/ready` → `ready`;
   - `/api/pilot/operations` → `decision=GO`;
   - `/news` содержит новости и ссылки «Первоисточник»;
   - EVOLUTE и VOYAH присутствуют в source diagnostics;
   - бейджи `Официальный источник / Отраслевое СМИ / Telegram` отображаются на новостных поверхностях.
9. Выполнить формальный gate:

   `npm run pilot:go-no-go`

10. Зафиксировать состояние Reliability и время последнего news aggregate.

## Интерпретация operational state

- `decision=GO`, `briefStatus=GO` — нормальный старт пилота.
- `decision=GO`, `briefStatus=DEGRADED` — продукт доступен, но IT должен посмотреть список degraded sources. Запуск допустим только если причины относятся к некритичным внешним best-effort источникам и корпоративная политика это допускает.
- `decision=NO_GO` или `briefStatus=STALE` — пилот не начинать до устранения причины.

## Day 1 — cohort

Целевая группа: 5–10 сотрудников. Рекомендуемый состав:

- R&D;
- закупки;
- логистика;
- качество;
- коммерческая функция;
- руководство/аналитика.

Не нужно создавать персональные Watchlists. Все участники работают с единым корпоративным intelligence-контуром.

## Рабочий сценарий участника

1. Открыть Главную и Новости.
2. Проверить стратегический фокус: SHACMAN, GWM, EVOLUTE, VOYAH, Моторинвест, ЭВИА.
3. Для коммерческого транспорта использовать Truck Radar.
4. Для оценки значимости открыть Аналитику / Решения.
5. Руководители используют Executive Brief.
6. Важную новость проверять через «Первоисточник» и учитывать тип источника.
7. После полезного/неполезного сценария оставить feedback через `/pilot-feedback`.

## KPI пилота

Default Wave 1:

- 5–10 участников;
- окно 10 дней;
- repeat usage ≥ 40%;
- минимум 3 feedback responses;
- usefulness 4–5 ≥ 70%;
- отсутствие открытых S1;
- отсутствие двух и более открытых S2.

Pilot Control Room `/pilot` формирует итог `GO / ADJUST / STOP`.

## Ежедневная проверка IT

- web container healthy;
- scheduler running;
- news aggregate не старше SLA;
- source quality выше policy threshold;
- нет DB migration blockers;
- нет S1;
- source errors не превышают допустимую долю;
- backup/retention/audit продолжают работать.

## Day 10 — решение

Использовать `/pilot` и фактический feedback для итогового решения:

- `GO` — переход к следующему корпоративному этапу;
- `ADJUST` — исправить конкретные проблемы и повторить короткую волну;
- `STOP` — не расширять использование до устранения блокирующих причин.

## Что не делать

- не трактовать количество новостных упоминаний как market share;
- не использовать pilot telemetry для оценки сотрудников;
- не отключать SSRF/security policy ради одного проблемного источника;
- не включать нестабильный резервный источник без проверки из корпоративной сети;
- не использовать неподтверждённые цифры Market Data без источника, периода и единицы измерения.
