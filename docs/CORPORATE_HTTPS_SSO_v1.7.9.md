# Окно в Китай — Corporate HTTPS + SSO profile (Pilot v1.7.9)

Этот профиль переводит существующий Web App + PWA в корпоративную схему доступа без прямой публикации Node.js-приложения.

## Архитектура

```text
Employee browser
      |
      | HTTPS
      v
Nginx corporate ingress
      |
      +--> oauth2-proxy --> Corporate OIDC IdP
      |
      +--> Okno v Kitai (private Docker network)
```

Публично на сервере публикуются только HTTP/HTTPS-порты Nginx. Контейнер приложения не имеет host-port в `compose.corporate.yaml`.

## Модель доверия

Приложение уже поддерживает `AUTH_MODE=proxy`.

Nginx передаёт в приложение:

- `X-Forwarded-User`;
- `X-Forwarded-Email`;
- `X-Forwarded-Groups`;
- `X-Okno-Proxy-Secret`.

Identity headers формируются только из ответа `auth_request` от oauth2-proxy. Входящие от браузера identity headers не используются и перезаписываются. Приложение дополнительно проверяет `AUTH_PROXY_SECRET` constant-time сравнением.

Роли:

- член `AUTH_ADMIN_GROUP` → admin;
- член `AUTH_EDITOR_GROUP` → editor;
- любой другой успешно аутентифицированный сотрудник → viewer.

По умолчанию управление controlled pilot требует admin.

## Что требуется от IT

До первого corporate start IT должен дать четыре вещи:

1. внутренний DNS/FQDN (например, `china.mgc.internal` или корпоративный эквивалент);
2. OIDC issuer/discovery URL;
3. OIDC client ID + client secret с callback `https://<host>/oauth2/callback`;
4. доверенный TLS certificate + private key для выбранного hostname.

Для RBAC IdP должен возвращать claim групп. По умолчанию приложение ожидает claim `groups`; имя настраивается через `OIDC_GROUPS_CLAIM`.

Никакие реальные OIDC secrets или TLS private keys не должны попадать в Git.

## Запуск на Windows

1. Заполнить только IT-значения в `.env.corporate`:
   - `CORPORATE_HOST`;
   - `OIDC_ISSUER_URL`;
   - `OIDC_CLIENT_ID`;
   - `OIDC_CLIENT_SECRET`.
2. Положить сертификат/ключ в `deploy/tls/` или изменить `TLS_CERT_FILE` / `TLS_KEY_FILE`.
3. Запустить двойным кликом `START_CORPORATE_HTTPS.bat`.

Launcher сам создаёт криптографически случайные локальные operational secrets:

- OAuth2 Proxy cookie secret;
- trusted proxy secret;
- audit HMAC key;
- scheduler token;
- user-data HMAC key;
- metrics token.

Если OIDC/TLS не настроены, launcher возвращает `NO-GO` и не делает insecure fallback. Для локального пилота по-прежнему используется обычный `START.bat`.

## PWA

HTTPS corporate profile делает origin secure, поэтому уже реализованный PWA layer может регистрировать Service Worker и предлагать установку. News/intelligence API не кэшируется; offline fallback не выдаёт старые новости как актуальные.

## Проверки

Статический security contract:

```bash
npm run pilot:corporate
```

Общий pilot preflight также включает corporate profile contract:

```bash
npm run pilot:preflight
```

GitHub Actions валидирует приложение, PWA, corporate Compose, Nginx TLS/auth template, отсутствие прямого host-port у приложения, trusted identity-header flow и Windows PowerShell launcher.

## Остановка и статус

- `STATUS_CORPORATE.bat`
- `STOP_CORPORATE.bat`

Остановка не удаляет corporate runtime volume.
