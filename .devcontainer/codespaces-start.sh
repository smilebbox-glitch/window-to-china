#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  echo 'Окно в Китай already running on port 3000.'
  exit 0
fi
echo 'Starting Окно в Китай Pilot v1.6.1 in GitHub Codespaces...'
NO_BROWSER=1 ./start.sh
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo 'READY: open the forwarded port 3000.'
    exit 0
  fi
  sleep 2
done
./status.sh || true
echo 'Startup health check timed out.' >&2
exit 1
