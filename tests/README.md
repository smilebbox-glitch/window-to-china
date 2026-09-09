# Automated tests

This directory contains the automated verification suite for **Окно в Китай**.

## Test layers

- `npm test` — builds the application and runs the Node.js test suite in `tests/*.test.mjs`.
- `npm run test:runtime` — checks a running deployment over HTTP instead of relying on manual link clicking.
- GitHub Actions runs the tests automatically for changes to `main` and for pull requests targeting `main`.
- `tests/news-received-time-v179.test.mjs` protects exact live-news receipt timestamps in both the main news feed and **Коммерческий транспорт**, including Moscow time formatting and the separation between **Получено** and **Опубликовано**.
- `tests/web-notifications.test.mjs` protects configurable web notifications: master enable/disable, company/brand and auto-industry segment filters, browser Notification API integration, Service Worker notification click behavior, user preference persistence, and the compact bell layout that stays separated from the corporate pilot profile.
- `tests/pilot-ui-functionality-v180.test.mjs` protects the approved pilot navigation and current UI regressions: retired home-market CTA buttons stay removed, event flight/hotel text remains readable in the light corporate theme, and the **Телефон до вылета / Оплата в Китае / Багаж и граница / Культурный код** labels keep safe horizontal padding so their first letters are not clipped.

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

Set `BASE_URL` when testing a non-local deployment:

```bash
BASE_URL=http://127.0.0.1:3000 npm run test:runtime
```

A failed request, unexpected HTTP status, invalid response contract, failed preference persistence, wrong content type, missing receipt-time metadata, or a protected UI regression makes the test fail and therefore makes the GitHub Actions check fail.
