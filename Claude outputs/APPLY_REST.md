# Что осталось применить вручную

Остальные 46 файлов уже записаны в `C:\projects\window-to-china`.
Три вещи политика удалённого доступа делать не даёт — сделай их сам, это одна команда и два копирования.

## 1. Удалить мёртвую Cloudflare-ветку (обязательно)

`vite.config.ts` больше не подключает `@cloudflare/vite-plugin`, а `package.json` не содержит
`drizzle-orm` / `drizzle-kit` / `wrangler`. Файлы ниже теперь ни на что не ссылаются, но
физически лежат в репозитории:

```powershell
cd C:\projects\window-to-china
git rm -r --cached worker db drizzle.config.ts
Remove-Item -Recurse -Force worker, db, drizzle.config.ts
```

Пока они не удалены, `npm ci` пройдёт, а `npm run build` — тоже, но `git status`
будет показывать их как неотслеживаемый мусор.

## 2. `.env.corporate.example`

Добавить после строки `METRICS_TOKEN=GENERATE_ON_FIRST_START`:

```
# nginx/oauth2-proxy перезаписывает X-Forwarded-For реальным адресом клиента,
# поэтому в корпоративном контуре заголовку можно доверять.
TRUSTED_PROXY=1
```

Готовый файл целиком — `env.corporate.example.txt` рядом с этим файлом.

## 3. `.github/workflows/pilot-functional-tests.yml`

Добавить шаг после «Run regression runtime smoke» в job `runtime-pilot`:

```yaml
      - name: Verify security contracts against live pilot
        env:
          BASE_URL: http://127.0.0.1:3000
          SMOKE_TIMEOUT_MS: '45000'
        run: |
          # The launcher generated the pilot secrets into .env; reuse the admin
          # token so the authenticated half of the contracts runs too.
          ADMIN_API_TOKEN="$(grep -E '^ADMIN_API_TOKEN=' .env | head -n1 | cut -d= -f2-)" \
            npm run test:security:runtime
```

Готовый файл целиком — `pilot-functional-tests.yml` рядом с этим файлом.

## 4. Переустановить зависимости

`package-lock.json` изменился (убраны 43 пакета):

```powershell
npm ci
```
