# Окно в Китай — Pilot Functional Tests v1.7.7

Этот набор проверяет работоспособность реального Pilot Candidate, а не только наличие файлов в репозитории.

## Уровень 1 — Build / Contract

Команда:

```bash
npm run pilot:functional
```

Проверяется:

- наличие всех основных пользовательских маршрутов;
- корпоративная навигация;
- отсутствие удалённых по утверждённому дизайну блоков;
- серверное обновление новостей каждые 5 минут по умолчанию;
- повторный запрос открытой страницы новостей каждые 15 минут;
- отображение названия источника, даты и ссылки «Первоисточник»;
- ZH → RU маркировка переведённых китайских материалов;
- dedup/freshness/source diagnostics новостного API;
- стратегический фокус SHACMAN / GWM / EVOLUTE / VOYAH / Моторинвест / ЭВИА;
- официальные источники EVOLUTE и VOYAH;
- IT operational gate GO/NO_GO и GO/DEGRADED/STALE;
- one-click Docker launcher;
- persistent `/data` volume;
- наличие runtime regression tests.

## Уровень 2 — Live Docker Runtime

Сначала запустить пилот:

```bash
NO_BROWSER=1 ./start.sh
```

Затем:

```bash
BASE_URL=http://127.0.0.1:3000 npm run pilot:functional:runtime
```

Проверяется уже работающий экземпляр:

- `/`;
- `/news`;
- `/trucks`;
- `/market`;
- `/analysis`;
- `/decision`;
- `/executive`;
- `/calendar`;
- `/travel-guide`;
- `/api/health`;
- `/api/ready`;
- SQLite availability;
- актуальность DB migrations;
- `/api/news` и source catalog v3;
- наличие source metadata и primary URL у новостей;
- отсутствие точных duplicate URLs в выдаче;
- EVOLUTE / VOYAH в source diagnostics;
- `/api/pilot/operations`;
- `/api/admin/reliability`;
- `/api/pilot/report`;
- псевдонимизация участников pilot cohort;
- `/api/user/notifications`;
- отсутствие удалённых UI-блоков на главной.

## GitHub Actions

Workflow:

`.github/workflows/pilot-functional-tests.yml`

Он запускает два независимых job:

1. **Build + pilot contracts** — production build, общие automated tests, полный `pilot:preflight` и новые functional contracts.
2. **Live Docker pilot** — one-click запуск Docker stack, dedicated runtime functional tests, regression runtime smoke, status, diagnostics и controlled stop.

Workflow можно запустить вручную через **Actions → Pilot functionality tests → Run workflow**. Он также запускается на pull request в `main` или в `design/v1.7.6-corporate-ui`, если изменяется код пилота.

## Критерий результата

- **PASS** — оба job завершились `success`.
- **FAIL** — хотя бы один contract/runtime test не прошёл.

При FAIL нужно смотреть первый упавший test и блок `Diagnostics` в runtime job. Автоматический merge этой проверкой не выполняется.

## Что эти тесты не утверждают

- Они не подтверждают доступность каждого внешнего сайта 24/7.
- Они не заменяют проверку корпоративного SSO/DNS/TLS в реальной сети компании.
- Они не считают количество упоминаний бренда рыночной долей.
- Они не оценивают сотрудников и не используют персональный Watchlist.
