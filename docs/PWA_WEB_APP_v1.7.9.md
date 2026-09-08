# Окно в Китай — Web App + PWA (Pilot v1.7.9)

Текущий Pilot v1.7.9 работает как обычное web-приложение и дополнительно имеет PWA-слой. Переписывать backend или текущие маршруты не требуется.

## Что это даёт

- сотрудники могут открывать сервис по корпоративной ссылке в Edge/Chrome/Safari;
- на поддерживаемых устройствах сервис можно установить как приложение;
- после установки он открывается в отдельном standalone-окне;
- доступны ярлыки на Новости, Executive Brief и Truck Radar;
- при потере соединения показывается нейтральная offline-страница.

## Freshness и безопасность

Service Worker намеренно **не кэширует API, новости, аналитику, user/admin/pilot endpoints или HTML-страницы**. Для intelligence-продукта свежесть важнее полноценного offline-режима.

Кэшируются только versioned/static assets (`/_next/static/*`, CSS, JS, fonts, icons) и offline fallback. Поэтому PWA не должна показывать старый briefing как текущий.

## Требование HTTPS

PWA/service worker требует secure context:

- `https://...` — поддерживается;
- `http://localhost:...` — поддерживается браузерами как локальное исключение;
- обычный `http://192.168.x.x:...` или другой LAN HTTP может работать как web-приложение, но установка PWA/service worker будет недоступна.

Для корпоративного размещения используйте TLS на reverse proxy и существующую схему SSO/proxy-auth.

## Установка

### Windows / macOS (Edge или Chrome)

Откройте HTTPS-адрес сервиса. Когда браузер разрешит установку, в интерфейсе появится кнопка **«Установить приложение»**. Также можно использовать системную кнопку установки в адресной строке браузера.

### Android

Откройте HTTPS-адрес в Chrome и выберите установку приложения, если она предложена браузером.

### iPhone / iPad

Откройте HTTPS-адрес в Safari → **Поделиться** → **На экран «Домой»**.

## Технические файлы

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/offline.html`
- `public/pwa-icon-192.png`
- `public/pwa-icon-512.png`
- `public/apple-touch-icon.png`
- `components/pwa-install-button.tsx`
- `scripts/pwa-webapp-preflight.mjs`
- `tests/pwa-webapp.test.mjs`

Проверка:

```bash
npm run pilot:pwa
```

Полный pilot preflight также включает PWA contract:

```bash
npm run pilot:preflight
```
