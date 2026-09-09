# IT VM acceptance checklist — Окно в Китай v1.7.9

Заполняется IT после развёртывания **`window-to-china`** на VM и перед допуском пользователей.

## A. Идентификация deployment

- [ ] Репозиторий: `smilebbox-glitch/window-to-china`
- [ ] Ветка: `main`
- [ ] `package.json` показывает `1.7.9-pilot`
- [ ] Зафиксирован точный `git rev-parse HEAD`: `______________________________`
- [ ] VM hostname: `______________________________`
- [ ] Дата/время проверки: `______________________________`
- [ ] Ответственный IT: `______________________________`

## B. Ресурсы и runtime

- [ ] Docker daemon работает
- [ ] Docker Compose v2 доступен
- [ ] Не менее 4 vCPU / 8 GB RAM для пилота
- [ ] Достаточно свободного диска для image/build/logs/backups
- [ ] Persistent Docker volume для runtime data присутствует
- [ ] Не используется `docker compose down -v` как обычный stop

## C. Выбранный профиль

Отметить один:

- [ ] **Corporate HTTPS + SSO** — рекомендуемый
- [ ] **Temporary isolated VM pilot** — только для ограниченного тестового сегмента

### Если Corporate HTTPS + SSO

- [ ] FQDN/DNS утверждён
- [ ] TLS certificate валиден для hostname
- [ ] TLS private key не хранится в Git
- [ ] OIDC issuer настроен
- [ ] OIDC client ID/client secret настроены вне Git
- [ ] Callback `https://<host>/oauth2/callback` зарегистрирован в IdP
- [ ] `SSO_ALLOWED_GROUP` соответствует утверждённой группе
- [ ] Viewer login проверен
- [ ] Editor role проверена, если используется
- [ ] Admin role проверена
- [ ] Неавторизованный пользователь не получает доступ
- [ ] Node.js app port не опубликован пользователям в обход Nginx/SSO

### Если Temporary isolated VM pilot

- [ ] Запуск выполнен через `START_VM.bat` или `scripts/start-vm.sh`
- [ ] `.env.vm` создан локально и не закоммичен
- [ ] `AUTH_MODE=disabled` осознанно принят только для временного пилота
- [ ] TCP 3000 ограничен host firewall/VLAN/ACL утверждённой корпоративной подсетью
- [ ] TCP 3000 не доступен из публичного Интернета

## D. Health / readiness

- [ ] Контейнер `china-auto-radar` в healthy state
- [ ] `GET /api/health` → HTTP 200 / `status: ok`
- [ ] `GET /api/ready` → HTTP 200 / `status: ready`
- [ ] Главная `/` → HTTP 200
- [ ] `/news` → HTTP 200
- [ ] `/trucks` → HTTP 200
- [ ] `/market` → HTTP 200
- [ ] `/analysis` → HTTP 200
- [ ] `/calendar` → HTTP 200
- [ ] `/travel-guide` → HTTP 200
- [ ] `/search?q=SHACMAN` → HTTP 200

## E. Data / source behavior

- [ ] `/api/news` отвечает корректным JSON
- [ ] Источники показывают source trust/provenance
- [ ] Временная недоступность внешнего источника отображается как degraded/error state, а не как ложные данные
- [ ] Scheduler работает внутри deployment
- [ ] Persistent data сохраняются после обычного restart

## F. PWA / mobile

Для production-like проверки использовать HTTPS.

- [ ] `/manifest.json` → HTTP 200
- [ ] `/sw.js` → HTTP 200
- [ ] PWA icon 192×192 доступна
- [ ] PWA icon 512×512 доступна
- [ ] Android отображает mobile navigation и installable PWA shell
- [ ] iPhone/iPad отображает mobile navigation и корректный home-screen flow
- [ ] Нижняя навигация: `Главная / Новости / Рынок / События / Ещё`
- [ ] Install/notification surfaces не перекрывают нижнюю навигацию

## G. Backup / recovery

- [ ] Проверен доступ admin к `/api/admin/backup`
- [ ] Создан тестовый runtime backup либо утверждён инфраструктурный backup persistent volume/VM
- [ ] Определено место хранения backup вне рабочей Docker volume
- [ ] Зафиксирована retention policy
- [ ] Ответственный понимает процедуру restore/rollback

## H. Security

- [ ] `.env.vm` / `.env.corporate` не отслеживаются Git
- [ ] Реальные OIDC/API secrets отсутствуют в repository files
- [ ] TLS private key отсутствует в Git
- [ ] Host firewall/ACL проверен
- [ ] Только необходимые ingress ports доступны пользователям
- [ ] Последний CodeQL/security gate для deployment commit зелёный
- [ ] Production dependency audit не содержит High/Critical blocker

## I. Финальный результат

- [ ] **GO — VM допущена к controlled pilot**
- [ ] **NO-GO — требуется исправление**

Причина NO-GO / замечания:

```text


```

Подпись/ФИО IT: `______________________________`

Дата: `______________________________`
