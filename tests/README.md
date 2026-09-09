# Automated tests

This directory contains the automated verification suite for **Окно в Китай**.

## Test layers

- `npm test` — builds the application and runs the full Node.js test suite in `tests/*.test.mjs`.
- `npm run test:latest` — runs the current pilot regression gate without changing the application version. It covers the latest approved UI, news behavior, and mobile/PWA UX contract.
- `npm run test:mobile` — runs the dedicated Android/iPhone mobile PWA UX regression suite.
- `npm run test:runtime` — checks a running deployment over HTTP instead of relying on manual link clicking.
- GitHub Actions runs the full suite automatically for changes to `main` and for pull requests targeting `main`, then runs `test:latest` as a separate visible gate before Docker/runtime smoke checks.
- `tests/current-pilot-regressions.test.mjs` is the version-neutral regression suite for the latest pilot state: simplified home hero, notification-bell placement, commercial-transport receipt timestamps, event travel readability, and travel-section heading clipping.
- `tests/news-received-time-v179.test.mjs` protects exact live-news receipt timestamps in both the main news feed and **Коммерческий транспорт**, including Moscow time formatting and the separation between **Получено** and **Опубликовано**.
- `tests/web-notifications.test.mjs` protects configurable web notifications: master enable/disable, company/brand and auto-industry segment filters, browser Notification API integration, Service Worker notification click behavior, user preference persistence, and the compact bell layout that stays separated from the corporate pilot profile.
- `tests/pilot-ui-functionality-v180.test.mjs` protects the approved pilot navigation and current UI regressions: retired home-market CTA buttons stay removed, event flight/hotel text remains readable in the light corporate theme, and the **Телефон до вылета / Оплата в Китае / Багаж и граница / Культурный код** labels keep safe horizontal padding so their first letters are not clipped.
- `tests/mobile-pwa-ux-v179.test.mjs` protects the mobile app architecture for both Android and iPhone: five-action bottom navigation, the compact **Ещё** sheet, mobile search, safe-area handling, touch target sizing, mobile market cards, Android `beforeinstallprompt`, standalone PWA mode, iOS home-screen guidance, and notification/install surfaces that stay above the bottom app bar.
- `tests/pwa-runtime.mjs` verifies the PWA assets against a running pilot and additionally checks that Android and iPhone user agents receive the same installable mobile intelligence shell.

## Runtime smoke coverage

The runtime smoke test verifies that the application is actually reachable and returns the expected response/contract for:

- `/`
- `/news`
- `/trucks`
- `/market`
- `/analysis`
- `/decision`
- `/executive`
- `/calendar`
- `/travel-guide`
- `/trip-planner`
- `/pilot-feedback`
- `/pilot`
- `/search?q=SHACMAN`
- `/api/health`
- `/api/ready`
- `/api/news`
- `/api/user/preferences`
- `/api/user/notifications`
- `/api/pilot/operations`
- `/api/pilot/report`

The notification runtime coverage performs a real preference round-trip against the running Docker pilot: it enables notifications, saves **SHACMAN** and **Коммерческий транспорт** filters, reads them back using the same pseudonymous user cookie, verifies the notification endpoint, then disables the master switch and confirms the new state. The shell contract also confirms that the approved notification center is present while other retired controls remain absent.

The PWA runtime gate verifies the manifest, service worker update policy, offline fallback, application icons, install metadata, mobile bottom navigation, and equivalent installable shell delivery for representative Android and iPhone user agents.

Set `BASE_URL` when testing a non-local deployment:

```bash
BASE_URL=http://127.0.0.1:3000 npm run test:runtime
```

A failed request, unexpected HTTP status, invalid response contract, failed preference persistence, wrong content type, missing receipt-time metadata, broken Android/iPhone PWA contract, or a protected UI regression makes the test fail and therefore makes the GitHub Actions check fail.
