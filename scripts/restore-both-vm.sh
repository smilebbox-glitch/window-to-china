#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
BACKUP_ROOT="${MGC_VM_BACKUP_ROOT:-$(dirname "$ROOT")/vm-backups}"
BACKUP_PATH="${1:-${MGC_VM_RESTORE_PATH:-}}"
CONFIRM="${MGC_VM_RESTORE_CONFIRM:-}"
SAFETY_ROOT="$BACKUP_ROOT/pre-restore"
PG_TMP="/tmp/mgc_languages_restore.dump"
OKNO_CID=""
DB_CID=""

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[NO-GO] Required command not found: $1" >&2; exit 1; }
}

need docker
need sha256sum
need curl

docker info >/dev/null 2>&1 || { echo "[NO-GO] Docker daemon is not running." >&2; exit 1; }
[[ -f "$ROOT/.env.vm" ]] || { echo "[NO-GO] Okno .env.vm is missing." >&2; exit 1; }
[[ -f "$LANG_ROOT/.env.vm" ]] || { echo "[NO-GO] MGC Languages .env.vm is missing." >&2; exit 1; }

if [[ -z "$BACKUP_PATH" ]]; then
  BACKUP_PATH="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -print 2>/dev/null | sort | tail -n1 || true)"
fi
[[ -n "$BACKUP_PATH" ]] || { echo "[NO-GO] No backup directory was supplied or found in $BACKUP_ROOT." >&2; exit 1; }
BACKUP_PATH="$(cd "$BACKUP_PATH" 2>/dev/null && pwd)" || { echo "[NO-GO] Backup directory does not exist: $BACKUP_PATH" >&2; exit 1; }

for required in okno.sqlite mgc_languages.dump manifest.json checksums.sha256; do
  [[ -s "$BACKUP_PATH/$required" ]] || { echo "[NO-GO] Required backup file is missing or empty: $required" >&2; exit 1; }
done

(
  cd "$BACKUP_PATH"
  sha256sum -c checksums.sha256 >/dev/null
)
echo "[GO] Backup SHA-256 verification passed."

grep -q '"profile"[[:space:]]*:[[:space:]]*"dual-vm-cpu-only-no-ai"' "$BACKUP_PATH/manifest.json" || {
  echo "[NO-GO] Backup manifest profile is not dual-vm-cpu-only-no-ai." >&2
  exit 1
}

if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo ""
  echo "This will replace BOTH pilot databases with:"
  echo "  $BACKUP_PATH"
  echo "A fresh pre-restore safety backup will be created first."
  printf 'Type RESTORE to continue: '
  read -r CONFIRM
fi
[[ "$CONFIRM" == "RESTORE" ]] || { echo "Restore cancelled."; exit 2; }

OKNO_ARGS=(compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml)
LANG_ARGS=(compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml)

OKNO_CID="$(cd "$ROOT" && docker "${OKNO_ARGS[@]}" ps -q china-auto-radar)"
DB_CID="$(cd "$LANG_ROOT" && docker "${LANG_ARGS[@]}" ps -q db)"
[[ -n "$OKNO_CID" ]] || { echo "[NO-GO] Okno v Kitai container is not running. Start the VM profile first." >&2; exit 1; }
[[ -n "$DB_CID" ]] || { echo "[NO-GO] MGC Languages PostgreSQL container is not running. Start the VM profile first." >&2; exit 1; }

mkdir -p "$SAFETY_ROOT"
echo "=== Creating pre-restore safety backup ==="
MGC_VM_BACKUP_ROOT="$SAFETY_ROOT" MGC_VM_BACKUP_INCLUDE_SECRETS=NO "$ROOT/scripts/backup-both-vm.sh"
SAFETY_PATH="$(find "$SAFETY_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -print | sort | tail -n1)"
[[ -n "$SAFETY_PATH" ]] || { echo "[NO-GO] Safety backup was not created." >&2; exit 1; }
echo "[GO] Safety backup: $SAFETY_PATH"

cleanup() {
  [[ -n "$DB_CID" ]] && docker exec "$DB_CID" rm -f "$PG_TMP" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Stage and validate PostgreSQL dump before stopping application services.
docker cp "$BACKUP_PATH/mgc_languages.dump" "${DB_CID}:${PG_TMP}"
docker exec "$DB_CID" pg_restore --list "$PG_TMP" >/dev/null

OKNO_IMAGE="$(docker inspect --format '{{.Image}}' "$OKNO_CID")"
[[ -n "$OKNO_IMAGE" ]] || { echo "[NO-GO] Could not resolve Okno image." >&2; exit 1; }

echo "=== Stopping application writers ==="
(cd "$ROOT" && docker "${OKNO_ARGS[@]}" stop china-auto-radar-scheduler china-auto-radar >/dev/null)
(cd "$LANG_ROOT" && docker "${LANG_ARGS[@]}" stop nginx app >/dev/null)

restore_failed=0

set +e
docker run --rm \
  --volumes-from "$OKNO_CID" \
  --mount "type=bind,source=$BACKUP_PATH,target=/restore,readonly" \
  "$OKNO_IMAGE" sh -lc '
    set -eu
    cp /restore/okno.sqlite /data/okno.sqlite.restore
    node --input-type=module -e '\''import { DatabaseSync } from "node:sqlite"; const db=new DatabaseSync("/data/okno.sqlite.restore",{readOnly:true}); try { const row=db.prepare("PRAGMA integrity_check").get(); if (!row || row.integrity_check!=="ok") process.exit(2); } finally { db.close(); }'\''
    rm -f /data/okno.sqlite-wal /data/okno.sqlite-shm
    mv /data/okno.sqlite.restore /data/okno.sqlite
  '
if [[ $? -ne 0 ]]; then restore_failed=1; fi

if [[ $restore_failed -eq 0 ]]; then
  docker exec "$DB_CID" sh -lc '
    set -eu
    pg_restore --list /tmp/mgc_languages_restore.dump >/dev/null
    dropdb --if-exists --force -U "$POSTGRES_USER" "$POSTGRES_DB"
    createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
    pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges /tmp/mgc_languages_restore.dump
  '
  if [[ $? -ne 0 ]]; then restore_failed=1; fi
fi
set -e

if [[ $restore_failed -ne 0 ]]; then
  echo "[NO-GO] Restore failed. Safety backup is available at: $SAFETY_PATH" >&2
  echo "Starting services with the current on-disk state for diagnostics..." >&2
  (cd "$ROOT" && docker "${OKNO_ARGS[@]}" up -d china-auto-radar china-auto-radar-scheduler >/dev/null) || true
  (cd "$LANG_ROOT" && docker "${LANG_ARGS[@]}" up -d db app nginx >/dev/null) || true
  exit 1
fi

docker exec "$DB_CID" rm -f "$PG_TMP" >/dev/null

echo "=== Starting restored services ==="
(cd "$ROOT" && docker "${OKNO_ARGS[@]}" up -d china-auto-radar china-auto-radar-scheduler >/dev/null)
(cd "$LANG_ROOT" && docker "${LANG_ARGS[@]}" up -d db app nginx >/dev/null)

wait_url() {
  url="$1"
  name="$2"
  i=0
  while [[ $i -lt 90 ]]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[GO] $name readiness passed."
      return 0
    fi
    i=$((i+1))
    sleep 2
  done
  echo "[NO-GO] $name did not become ready after restore." >&2
  return 1
}

wait_url http://127.0.0.1:3000/api/ready "Okno v Kitai"
wait_url http://127.0.0.1:8080/health/ready "MGC Languages"

echo ""
echo "[GO] Dual VM restore completed successfully."
echo "Restored from: $BACKUP_PATH"
echo "Pre-restore safety backup: $SAFETY_PATH"
echo "Runtime configuration, audit logs and .env.vm secrets were intentionally preserved."
