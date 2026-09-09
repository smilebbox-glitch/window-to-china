#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
BACKUP_ROOT="${MGC_VM_BACKUP_ROOT:-$(dirname "$ROOT")/vm-backups}"
RETENTION_DAYS="${MGC_VM_BACKUP_RETENTION_DAYS:-14}"
INCLUDE_SECRETS="${MGC_VM_BACKUP_INCLUDE_SECRETS:-NO}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$BACKUP_ROOT/$STAMP"
OKNO_TMP=""
OKNO_CID=""
DB_TMP=""
DB_CID=""

cleanup() {
  if [[ -n "$OKNO_CID" && -n "$OKNO_TMP" ]]; then docker exec "$OKNO_CID" rm -f "$OKNO_TMP" >/dev/null 2>&1 || true; fi
  if [[ -n "$DB_CID" && -n "$DB_TMP" ]]; then docker exec "$DB_CID" rm -f "$DB_TMP" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[NO-GO] Required command not found: $1" >&2; exit 1; }
}

need docker
need git
need sha256sum

docker info >/dev/null 2>&1 || { echo "[NO-GO] Docker daemon is not running." >&2; exit 1; }
[[ -f "$ROOT/.env.vm" ]] || { echo "[NO-GO] Okno .env.vm is missing. Start the VM profile first." >&2; exit 1; }
[[ -f "$LANG_ROOT/.env.vm" ]] || { echo "[NO-GO] MGC Languages .env.vm is missing. Start the VM profile first." >&2; exit 1; }

mkdir -p "$DEST"

echo "=== Backing up Okno v Kitai ==="
OKNO_CID="$(cd "$ROOT" && docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml ps -q china-auto-radar)"
[[ -n "$OKNO_CID" ]] || { echo "[NO-GO] Okno v Kitai container is not running." >&2; exit 1; }

docker exec "$OKNO_CID" test -f /data/okno.sqlite
(cd "$ROOT" && docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml exec -T china-auto-radar node scripts/sqlite-backup.mjs)
OKNO_TMP="$(docker exec "$OKNO_CID" sh -lc 'ls -1t /data/backups/okno-*.sqlite 2>/dev/null | head -n1')"
[[ -n "$OKNO_TMP" ]] || { echo "[NO-GO] Okno SQLite backup was not created." >&2; exit 1; }

docker exec "$OKNO_CID" node --input-type=module -e 'import { DatabaseSync } from "node:sqlite"; const db=new DatabaseSync(process.argv[1],{readOnly:true}); try { const row=db.prepare("PRAGMA integrity_check").get(); if (!row || row.integrity_check!=="ok") process.exit(2); } finally { db.close(); }' "$OKNO_TMP"
docker cp "${OKNO_CID}:${OKNO_TMP}" "$DEST/okno.sqlite"

docker exec "$OKNO_CID" test -f /data/runtime-config.json >/dev/null 2>&1 && docker cp "${OKNO_CID}:/data/runtime-config.json" "$DEST/runtime-config.json" || true
docker exec "$OKNO_CID" test -d /data/audit >/dev/null 2>&1 && docker cp "${OKNO_CID}:/data/audit" "$DEST/okno-audit" || true

docker exec "$OKNO_CID" rm -f "$OKNO_TMP"
OKNO_TMP=""
test -s "$DEST/okno.sqlite"
echo "[GO] Okno SQLite backup passed integrity_check."

echo ""
echo "=== Backing up MGC Languages PostgreSQL ==="
DB_CID="$(cd "$LANG_ROOT" && docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml ps -q db)"
[[ -n "$DB_CID" ]] || { echo "[NO-GO] MGC Languages database container is not running." >&2; exit 1; }
DB_TMP="/tmp/mgc_languages_${STAMP}.dump"
docker exec "$DB_CID" sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"' sh "$DB_TMP"
docker exec "$DB_CID" pg_restore --list "$DB_TMP" >/dev/null
docker cp "${DB_CID}:${DB_TMP}" "$DEST/mgc_languages.dump"
docker exec "$DB_CID" rm -f "$DB_TMP"
DB_TMP=""
test -s "$DEST/mgc_languages.dump"
echo "[GO] PostgreSQL dump passed pg_restore --list validation."

if [[ "$INCLUDE_SECRETS" == "YES" ]]; then
  mkdir -p "$DEST/secrets"
  cp "$ROOT/.env.vm" "$DEST/secrets/okno.env.vm"
  cp "$LANG_ROOT/.env.vm" "$DEST/secrets/mgc-languages.env.vm"
  chmod 600 "$DEST/secrets/okno.env.vm" "$DEST/secrets/mgc-languages.env.vm" 2>/dev/null || true
  echo "[WARN] VM secrets were included because MGC_VM_BACKUP_INCLUDE_SECRETS=YES. Protect this backup accordingly."
fi

OKNO_SHA="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || printf unknown)"
LANG_SHA="$(git -C "$LANG_ROOT" rev-parse HEAD 2>/dev/null || printf unknown)"
if [[ "$INCLUDE_SECRETS" == "YES" ]]; then SECRET_JSON=true; else SECRET_JSON=false; fi
cat > "$DEST/manifest.json" <<EOF
{
  "created_utc": "$STAMP",
  "profile": "dual-vm-cpu-only-no-ai",
  "okno_commit": "$OKNO_SHA",
  "mgc_languages_commit": "$LANG_SHA",
  "okno_port": 3000,
  "mgc_languages_port": 8080,
  "includes_vm_secrets": $SECRET_JSON,
  "retention_days": $RETENTION_DAYS
}
EOF

(
  cd "$DEST"
  find . -type f ! -name 'checksums.sha256' -print0 | sort -z | xargs -0 sha256sum > checksums.sha256
  sha256sum -c checksums.sha256 >/dev/null
)

echo "[GO] SHA-256 manifest verified."

if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -mtime "+$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true
fi

echo ""
echo "[GO] Dual VM backup completed: $DEST"
echo "Files: okno.sqlite, mgc_languages.dump, manifest.json, checksums.sha256"
if [[ -d "$DEST/okno-audit" ]]; then
  echo "Also included: Okno audit directory"
fi
if [[ -f "$DEST/runtime-config.json" ]]; then
  echo "Also included: Okno runtime configuration"
fi

# Optional artifacts must not make a successful backup return a non-zero status.
exit 0
