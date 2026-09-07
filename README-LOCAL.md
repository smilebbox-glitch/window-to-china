# Окно в Китай — локальный/LAN запуск Pilot v1.6.1

## Самый простой запуск

### Windows

Дважды нажмите `START.bat`.

### Linux / macOS

```bash
./start.sh
```

Первый запуск сам создаёт `.env`, генерирует обязательные secrets, собирает image, запускает web + scheduler и ждёт readiness. Данные администратора сохраняются локально в `.pilot-access.txt`.

По умолчанию сервис доступен не только на текущем компьютере, но и другим компьютерам в той же доверенной локальной/корпоративной сети. После запуска консоль показывает два адреса:

- `This PC: http://127.0.0.1:3000` — адрес для компьютера, где запущен Docker;
- `Other PCs on the same LAN: http://<IPv4-компьютера>:3000` — этот адрес нужно открыть на другом ПК.

Если LAN-адрес не открылся, проверьте, что оба компьютера находятся в одной сети и что firewall хоста разрешает входящий TCP на `APP_PORT` (по умолчанию `3000`) для доверенного профиля Domain/Private. Не публикуйте этот порт напрямую в интернет. Для корпоративного production-развёртывания используйте reverse proxy, HTTPS и SSO.

Чтобы вернуть режим «только этот компьютер», задайте в `.env`:

```env
APP_BIND_ADDRESS=127.0.0.1
ALLOW_PUBLIC_BIND=NO
```

`STOP.bat` / `./stop.sh` останавливает сервис без удаления persistent volume. `STATUS.bat` / `./status.sh` показывает состояние.

---

## 1. Ручная подготовка для IT

```bash
cp .env.example .env
```

Для controlled pilot замените как минимум:

- `ADMIN_API_TOKEN` — если SSO ещё не подключён;
- `AUDIT_HMAC_KEY`;
- `SCHEDULER_TOKEN`.

По умолчанию `.env.example` включает доступ из доверенной LAN:

```env
APP_BIND_ADDRESS=0.0.0.0
ALLOW_PUBLIC_BIND=YES
APP_PORT=3000
```

## 2. Ручная проверка хоста

```bash
bash scripts/host-preflight.sh
```

## 3. Ручная сборка и запуск

```bash
docker compose build
docker compose up -d
docker compose ps
bash scripts/container-smoke.sh
```

Поднимаются два сервиса:

- `china-auto-radar` — web/API;
- `china-auto-radar-scheduler` — плановое обновление FX/news.

## 4. Данные

Named volume `okno-runtime-data` содержит:

- `/data/runtime-config.json`;
- `/data/okno.sqlite` + WAL/SHM;
- `/data/audit/audit.jsonl`;
- `/data/backups/*` после запуска backup-команды.

Удаление контейнера не удаляет данные. `docker compose down -v` удаляет volume и данные — использовать только осознанно.

## 5. Admin

`/admin` показывает источники, audit, reliability snapshots/history и managed content. В `AUTH_MODE=disabled` admin/editor операции доступны по `ADMIN_API_TOKEN`; в `AUTH_MODE=proxy` права приходят из SSO-групп.

## v1.6 acceptance

Локально: `ACCEPTANCE_MODE=package npm run pilot:acceptance`. На корпоративном сервере после deployment: `ACCEPTANCE_MODE=target ONLINE_ACCEPTANCE=YES npm run pilot:acceptance`.

## v1.6 personal workspace

После запуска откройте `/my`. Для controlled pilot обязательно задайте `USER_DATA_HMAC_KEY` длиной не менее 32 символов. В AUTH_MODE=proxy пользовательский профиль привязывается к SSO subject; в disabled pilot-mode — к HttpOnly device cookie текущего браузера.
