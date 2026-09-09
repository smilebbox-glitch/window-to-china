# IT VM handoff — Окно в Китай (Pilot v1.7.9)

Этот файл — основной вход для IT-директора/системного администратора при развёртывании **только сервиса `window-to-china`** на виртуальной машине.

> Если на одной VM требуется одновременно запускать ещё и `mgc-languages`, используйте отдельный сценарий `IT_DUAL_VM_QUICKSTART.md`. Для передачи только «Окна в Китай» dual-service инструкции не требуются.

## 1. Что передаётся

- Репозиторий: `smilebbox-glitch/window-to-china`
- Ветка развёртывания: `main`
- Версия приложения: `1.7.9-pilot`
- Runtime: Docker / Docker Compose v2
- База пилота: SQLite в persistent Docker volume
- Генеративный RAG/LLM: опционален; в лёгком VM-профиле отключён
- Web/PWA: один и тот же продукт для desktop, Android и iPhone

При установке зафиксируйте точный SHA:

```bash
git rev-parse HEAD
```

Не разворачивайте произвольную feature-ветку вместо `main`.

## 2. Ресурсы VM

Минимум для контролируемого пилота:

- 4 vCPU
- 8 GB RAM
- 30–40 GB свободного диска
- Docker Engine + Docker Compose v2 (Linux) или поддерживаемый Docker runtime на Windows
- Git
- доступ к корпоративным DNS/сетевым ресурсам
- исходящий HTTPS к разрешённым новостным/рыночным источникам, если нужны live-данные

Рекомендуется для комфортной сборки, логов и резервных копий:

- 8 vCPU
- 16 GB RAM
- 50+ GB свободного диска

GPU не требуется для текущего пилота.

## 3. Какой профиль выбрать

### A. Корпоративный HTTPS + SSO — рекомендуемый

Используйте для доступа сотрудников и PWA на реальных телефонах.

Архитектура:

```text
Employee / PWA
      |
      | HTTPS :443
      v
Nginx ingress
      |
      +--> oauth2-proxy --> Corporate OIDC IdP
      |
      +--> Okno v Kitai (private Docker network)
```

Приложение не публикует свой Node.js port напрямую. На сервере публикуется Nginx ingress. Профиль использует `AUTH_MODE=proxy`, trusted proxy secret и RBAC-группы.

До запуска IT должен подготовить:

1. внутренний FQDN/DNS, например `china.mgc.internal` или утверждённый аналог;
2. доверенный TLS certificate + private key для этого hostname;
3. OIDC issuer/discovery URL;
4. OIDC client ID и client secret;
5. callback `https://<host>/oauth2/callback` в IdP;
6. группу допуска, по умолчанию `okno-china-users`;
7. при необходимости группы `okno-china-admin` и `okno-china-editor`.

Шаблон:

```text
.env.corporate.example -> .env.corporate
```

Заполнить IT-значения, не коммитить `.env.corporate`, сертификаты и private keys.

Windows one-click:

```text
START_CORPORATE_HTTPS.bat
STATUS_CORPORATE.bat
STOP_CORPORATE.bat
```

Подробный security contract: `docs/CORPORATE_HTTPS_SSO_v1.7.9.md`.

### B. Изолированный CPU-only VM pilot — если SSO ещё не готов

Этот профиль предназначен только для временного внутреннего пилота.

Windows:

```text
START_VM.bat
```

Linux:

```bash
chmod +x scripts/start-vm.sh
./scripts/start-vm.sh
```

Launcher:

- проверяет Docker daemon и Compose v2;
- создаёт `.env.vm` из `.env.vm.example`;
- генерирует локальные operational secrets;
- валидирует Compose;
- собирает контейнеры;
- запускает сервис;
- ждёт healthy state;
- выдаёт `[GO]` только после успешного старта.

По умолчанию порт приложения — TCP `3000`.

**Обязательное ограничение:** временный профиль не должен быть доступен из публичного Интернета. IT обязан ограничить TCP 3000 host firewall/VLAN/ACL только утверждённой корпоративной подсетью или отдельным тестовым сегментом. Не использовать `0.0.0.0/0` как разрешённую клиентскую сеть.

В `.env.vm` `AUTH_MODE=disabled`, поэтому этот режим нельзя считать заменой корпоративному SSO.

## 4. Первый deployment — рекомендуемый порядок

1. Создать VM и установить Docker + Compose v2 + Git.
2. Клонировать только `main`:

```bash
git clone https://github.com/smilebbox-glitch/window-to-china.git
cd window-to-china
git checkout main
git pull --ff-only origin main
git rev-parse HEAD
```

3. Выбрать профиль A или B.
4. Настроить firewall/ACL до допуска пользователей.
5. Запустить сервис.
6. Проверить health/readiness.
7. Открыть web UI с рабочей станции.
8. Для corporate HTTPS проверить SSO и роли.
9. С телефона проверить PWA/manifest по HTTPS.
10. Заполнить `IT_VM_ACCEPTANCE_CHECKLIST.md`.

## 5. Обязательные smoke checks

Локально на VM для обычного VM-профиля:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
curl -fsS http://127.0.0.1:3000/ >/dev/null
curl -fsS http://127.0.0.1:3000/manifest.json >/dev/null
```

Ожидается:

- `/api/health` → HTTP 200 и `status: ok`;
- `/api/ready` → HTTP 200 и `status: ready`;
- главная → HTTP 200;
- manifest → HTTP 200.

Для corporate profile те же проверки выполняются через утверждённый HTTPS hostname. Не обходите SSO публикацией внутреннего app-port.

## 6. PWA / Android / iPhone

Для реальной установки PWA, Service Worker и browser notifications используйте **HTTPS corporate profile**. `localhost` подходит только для локальной технической проверки.

Проверить:

- manifest доступен;
- service worker `/sw.js` доступен;
- Android получает installable PWA shell;
- iPhone/iPad получает корректный web-app metadata / home-screen flow;
- mobile bottom navigation отображается и не перекрывается install/notification UI.

Эти контракты уже входят в автоматические regression/runtime tests.

## 7. Данные и резервное копирование

Runtime-данные находятся в persistent Docker volume; обычный stop/restart не должен удалять volume.

Приложение имеет admin backup endpoint `/api/admin/backup`, который создаёт экспорт runtime backup только для администратора и аудирует операцию. Для инфраструктурного DR IT также должен включить backup persistent Docker volume/VM согласно корпоративной политике.

Перед обновлением или изменением Compose/VM:

1. сделать резервную копию;
2. зафиксировать текущий Git SHA;
3. обновлять только fast-forward способом;
4. после обновления повторить health/readiness + acceptance checklist.

Никогда не использовать `docker compose down -v` как обычную команду остановки: `-v` удаляет persistent volumes.

## 8. Обновление

Рекомендуемый Git-процесс на VM:

```bash
git status --short
git fetch origin
git checkout main
git pull --ff-only origin main
```

Не хранить ручные изменения production-файлов внутри рабочей копии. Локальные `.env.*`, TLS keys и другие secrets не должны попадать в Git.

После обновления обязательно повторить deployment verification.

## 9. Что считать GO

Deployment допускается к пилотным пользователям только если одновременно:

- Docker/Compose запускаются без ошибок;
- контейнер приложения healthy;
- `/api/health` = 200;
- `/api/ready` = 200;
- главная страница открывается;
- live news API работает либо корректно показывает degraded-state внешних источников;
- persistent runtime volume присутствует;
- firewall/ACL соответствует выбранному профилю;
- для corporate режима SSO fail-closed и роли проверены;
- PWA assets доступны по HTTPS;
- нет реальных secrets/private keys в Git;
- `IT_VM_ACCEPTANCE_CHECKLIST.md` заполнен.

Любой провал security boundary, readiness, SSO или persistent storage = **NO-GO**.

## 10. Что передать IT вместе с этим файлом

IT-директору достаточно начать с этих файлов:

1. `IT_VM_HANDOFF.md` — этот документ;
2. `IT_VM_ACCEPTANCE_CHECKLIST.md` — финальный чек-лист;
3. `.env.vm.example` — временный VM профиль;
4. `.env.corporate.example` — corporate SSO профиль;
5. `docs/CORPORATE_HTTPS_SSO_v1.7.9.md` — детали SSO/TLS;
6. `docs/PWA_WEB_APP_v1.7.9.md` — PWA contract;
7. `SECURITY.md` и `SECURITY_PILOT.md` — security notes.

## 11. Уже автоматизированные проверки в GitHub

Перед handoff ветка `main` должна иметь зелёные:

- One-click verification;
- Pilot functionality tests;
- VM pilot acceptance verification;
- Server and mobile security gate;
- CodeQL security scan;
- repository-integrity.

Локальные команды для дополнительной проверки:

```bash
npm ci
npm test
npm run test:latest
npm run test:mobile
npm run pilot:preflight
npm run pilot:audit-deps
```

## 12. Важные ограничения текущего пилота

- Это controlled pilot, не финальный production SLA.
- Внешние новостные источники могут временно деградировать; приложение должно отображать provenance/degraded-state, а не подменять данные.
- Генеративный RAG/LLM в лёгком VM-профиле отключён; built-in evidence-based analysis остаётся доступным.
- Для широкого корпоративного доступа используйте HTTPS+SSO, а не временный `AUTH_MODE=disabled` профиль.
