# Окно в Китай — Pilot Test Report v1.7.7

## Итог

**PASS — Pilot Candidate подтвердил работоспособность в автоматизированном GitHub Actions окружении.**

- Workflow: `Pilot functionality tests`
- GitHub Actions run: `34207410088`
- Tested head before report commit: `e72533adb316acb9fa393b104048d77b1410636e`
- PR: `#14 — v1.7.7 Pilot Functional Test Suite`
- Result: `SUCCESS`

## Job 1 — Build + pilot contracts

**SUCCESS**

Успешно выполнены:

- checkout;
- Node.js 22.13.0 setup;
- `npm ci`;
- production build;
- полный automated test suite;
- полный `npm run pilot:preflight`;
- новый `pilot:functional` contract suite.

Проверены контракты:

- основные вкладки пилота;
- корпоративная навигация;
- утверждённый UI без удалённых блоков;
- серверный news refresh — 5 минут по умолчанию;
- client news refresh — 15 минут;
- отображение источника, даты и ссылки «Первоисточник»;
- ZH → RU;
- source diagnostics / dedup / freshness;
- SHACMAN / GWM / EVOLUTE / VOYAH / Моторинвест / ЭВИА;
- официальные EVOLUTE / VOYAH источники;
- Pilot Operations / IT Reliability;
- one-click Docker launcher;
- persistent data volume.

## Job 2 — Live Docker pilot

**SUCCESS**

Успешно выполнены:

- полный one-click запуск Docker stack;
- dedicated live functionality tests;
- существующий regression runtime smoke;
- `status.sh`;
- diagnostics;
- controlled `stop.sh`.

Runtime подтвердил:

- `/` — работает;
- `/news` — работает;
- `/trucks` — работает;
- `/market` — работает;
- `/analysis` — работает;
- `/decision` — работает;
- `/executive` — работает;
- `/calendar` — работает;
- `/travel-guide` — работает;
- `/api/health` — OK;
- `/api/ready` — READY;
- SQLite — доступна;
- DB migrations — актуальны;
- `/api/news` — отвечает и использует source catalog v3;
- news items сохраняют source metadata и primary URL;
- exact duplicate URLs не возвращаются;
- EVOLUTE и VOYAH присутствуют в source diagnostics;
- `/api/pilot/operations` — работает;
- `/api/admin/reliability` — работает;
- `/api/pilot/report` — работает;
- cohort остаётся псевдонимизированным;
- notifications API — работает;
- удалённые элементы старого UI не вернулись.

## Ограничения результата

Этот PASS подтверждает работоспособность Pilot Candidate в CI/Docker окружении. Он не заменяет Day 0 проверку внутри корпоративной сети: SSO, DNS, TLS, firewall и доступность внешних источников из конкретного офиса/сервера должны быть проверены IT на месте.

Тесты не оценивают сотрудников и не используют персональный Watchlist.
