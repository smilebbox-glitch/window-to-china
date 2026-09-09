#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
rc=0

command -v docker >/dev/null 2>&1 || { echo "[NO-GO] Docker is not installed or not in PATH." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "[NO-GO] Docker daemon is not running." >&2; exit 1; }

echo "=== Stopping MGC Languages VM ==="
if [[ -f "$LANG_ROOT/.env.vm" && -f "$LANG_ROOT/docker-compose.lan.yml" && -f "$LANG_ROOT/docker-compose.vm.yml" ]]; then
  if (cd "$LANG_ROOT" && docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml down --remove-orphans); then
    echo "[GO] MGC Languages stopped. PostgreSQL volume was preserved."
  else
    echo "[NO-GO] Failed to stop MGC Languages." >&2
    rc=1
  fi
else
  echo "[INFO] MGC Languages VM profile is not initialized; nothing to stop."
fi

echo ""
echo "=== Stopping Okno v Kitai VM ==="
if [[ -f "$ROOT/.env.vm" && -f "$ROOT/compose.yaml" && -f "$ROOT/compose.vm.yaml" ]]; then
  if (cd "$ROOT" && docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml down --remove-orphans); then
    echo "[GO] Okno v Kitai stopped. Runtime data volume was preserved."
  else
    echo "[NO-GO] Failed to stop Okno v Kitai." >&2
    rc=1
  fi
else
  echo "[INFO] Okno VM profile is not initialized; nothing to stop."
fi

echo ""
if [[ "$rc" -eq 0 ]]; then
  echo "[GO] Both VM stacks are stopped. No Docker volumes were deleted."
else
  echo "[NO-GO] One or more VM stacks could not be stopped cleanly."
fi
exit "$rc"
