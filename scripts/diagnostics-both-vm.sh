#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
DIAG_ROOT="${MGC_VM_DIAGNOSTICS_ROOT:-$ROOT/../vm-diagnostics}"
INCLUDE_LOGS="${MGC_VM_DIAGNOSTICS_INCLUDE_LOGS:-NO}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$DIAG_ROOT/$stamp"
mkdir -p "$out"

command -v docker >/dev/null 2>&1 || { echo "[NO-GO] Docker is not installed or not in PATH." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "[NO-GO] Docker daemon is not running." >&2; exit 1; }

capture() {
  local file="$1"
  shift
  "$@" >"$out/$file" 2>&1 || true
}

{
  echo "created_utc=$stamp"
  echo "profile=dual-vm-cpu-only-no-ai"
  echo "hostname=$(hostname 2>/dev/null || true)"
  echo "okno_root=$ROOT"
  echo "languages_root=$LANG_ROOT"
  echo "logs_included=$INCLUDE_LOGS"
} > "$out/summary.txt"

capture host.txt sh -c 'uname -a; printf "\n"; uptime 2>/dev/null || true; printf "\n"; df -h 2>/dev/null || true'
capture docker-version.txt docker version
capture docker-disk.txt docker system df
capture docker-containers.txt docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
capture docker-stats.txt docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'

if [[ -d "$ROOT/.git" ]]; then
  (cd "$ROOT" && { git rev-parse HEAD; git status --short; }) > "$out/okno-git.txt" 2>&1 || true
fi
if [[ -d "$LANG_ROOT/.git" ]]; then
  (cd "$LANG_ROOT" && { git rev-parse HEAD; git status --short; }) > "$out/languages-git.txt" 2>&1 || true
fi

if [[ -f "$ROOT/.env.vm" ]]; then
  (cd "$ROOT" && docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml ps) > "$out/okno-compose-ps.txt" 2>&1 || true
fi
if [[ -f "$LANG_ROOT/.env.vm" ]]; then
  (cd "$LANG_ROOT" && docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml ps) > "$out/languages-compose-ps.txt" 2>&1 || true
fi

curl -fsS --max-time 8 http://127.0.0.1:3000/api/health > "$out/okno-health.json" 2> "$out/okno-health.err" || true
curl -fsS --max-time 8 http://127.0.0.1:3000/api/ready > "$out/okno-ready.json" 2> "$out/okno-ready.err" || true
curl -fsS --max-time 8 http://127.0.0.1:8080/health/live > "$out/languages-live.json" 2> "$out/languages-live.err" || true
curl -fsS --max-time 8 http://127.0.0.1:8080/health/ready > "$out/languages-ready.json" 2> "$out/languages-ready.err" || true

# Deliberately avoid docker inspect environment dumps and .env.vm copies: they contain secrets.
if [[ "$INCLUDE_LOGS" == "YES" ]]; then
  echo "WARNING: application logs may contain operational or user-derived data; treat this bundle as internal." >> "$out/summary.txt"
  if [[ -f "$ROOT/.env.vm" ]]; then
    (cd "$ROOT" && docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml logs --no-color --tail=200) > "$out/okno-logs.txt" 2>&1 || true
  fi
  if [[ -f "$LANG_ROOT/.env.vm" ]]; then
    (cd "$LANG_ROOT" && docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml logs --no-color --tail=200 app db nginx) > "$out/languages-logs.txt" 2>&1 || true
  fi
fi

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$out" && find . -maxdepth 1 -type f ! -name checksums.sha256 -printf '%P\n' | sort | xargs -r sha256sum > checksums.sha256)
fi

echo "[GO] Diagnostics bundle created: $out"
echo "No .env.vm files or container environment variables were collected."
if [[ "$INCLUDE_LOGS" != "YES" ]]; then
  echo "Application logs were excluded. Set MGC_VM_DIAGNOSTICS_INCLUDE_LOGS=YES only when IT needs them."
fi
