# Automated tests

This directory contains the automated verification suite for **Окно в Китай**.

## Test layers

- `npm test` — builds the application and runs the Node.js test suite in `tests/*.test.mjs`.
- `npm run test:runtime` — checks a running deployment over HTTP instead of relying on manual link clicking.
- GitHub Actions runs the tests automatically for changes to `main` and for pull requests targeting `main`.

## Runtime smoke coverage

The runtime smoke test verifies that the application is actually reachable and returns the expected response type for:

- `/`
- `/market`
- `/calendar`
- `/travel-guide`
- `/trip-planner`
- `/api/health`
- `/api/ready`

Set `BASE_URL` when testing a non-local deployment:

```bash
BASE_URL=http://127.0.0.1:3000 npm run test:runtime
```

A failed request, unexpected HTTP status, or wrong content type makes the test fail and therefore makes the GitHub Actions check fail.
