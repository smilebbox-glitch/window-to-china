#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${MGC_VM_BACKUP_ROOT:-$(dirname "$ROOT")/vm-backups}"
VERIFY_ROOT="${MGC_VM_BACKUP_VERIFY_ROOT:-$(dirname "$ROOT")/vm-backup-verification}"
POSTGRES_IMAGE="${MGC_VM_VERIFY_POSTGRES_IMAGE:-postgres:16.4-alpine}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$VERIFY_ROOT/$STAMP"
PG_NAME="mgc-backup-verify-${STAMP,,}-$$"
PG_PASSWORD="verify-${STAMP}-$$"
PG_USER="verify"
PG_DB="verify"
PG_STARTED=0

cleanup() {
  if [[ $PG_STARTED -eq 1 ]]; then
    docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[NO-GO] Required command not found: $1" >&2; exit 1; }
}
for cmd in docker sha256sum find sort date awk; do need "$cmd"; done

docker info >/dev/null 2>&1 || { echo "[NO-GO] Docker daemon is not running." >&2; exit 1; }
latest_backup="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -print 2>/dev/null | sort | tail -n1 || true)"
[[ -n "$latest_backup" ]] || { echo "[NO-GO] No timestamped backup found under $BACKUP_ROOT." >&2; exit 1; }
for file in okno.sqlite mgc_languages.dump manifest.json checksums.sha256; do
  [[ -s "$latest_backup/$file" ]] || { echo "[NO-GO] Backup file is missing or empty: $latest_backup/$file" >&2; exit 1; }
done

mkdir -p "$DEST"
LOG="$DEST/verification.txt"
exec > >(tee "$LOG") 2>&1

echo "======================================================"
echo " MGC VM BACKUP RESTOREABILITY VERIFICATION"
echo "======================================================"
echo "Generated UTC: $STAMP"
echo "Backup: $latest_backup"
echo ""

echo "=== Bundle integrity ==="
(cd "$latest_backup" && sha256sum -c checksums.sha256)
echo "[GO] Backup SHA-256 bundle verification passed."

echo ""
echo "=== SQLite restoreability ==="
OKNO_IMAGE="${MGC_VM_VERIFY_OKNO_IMAGE:-}"
if [[ -z "$OKNO_IMAGE" ]]; then
  if [[ -f "$ROOT/.env.vm" ]]; then
    OKNO_IMAGE="$(cd "$ROOT" && docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml config --images 2>/dev/null | grep '^okno-v-kitai:' | head -n1 || true)"
  fi
  OKNO_IMAGE="${OKNO_IMAGE:-okno-v-kitai:1.7.9-pilot}"
fi

docker image inspect "$OKNO_IMAGE" >/dev/null 2>&1 || {
  echo "[NO-GO] Required Okno image is unavailable locally: $OKNO_IMAGE" >&2
  echo "Run START_BOTH_VM once or set MGC_VM_VERIFY_OKNO_IMAGE." >&2
  exit 1
}

docker run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --mount "type=bind,src=$latest_backup/okno.sqlite,dst=/verify/okno.sqlite,readonly" \
  "$OKNO_IMAGE" \
  node --input-type=module -e '
    import { DatabaseSync } from "node:sqlite";
    const db = new DatabaseSync("/verify/okno.sqlite", { readOnly: true });
    try {
      const row = db.prepare("PRAGMA integrity_check").get();
      if (!row || row.integrity_check !== "ok") process.exit(2);
      const tables = db.prepare(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'`).get();
      if (!tables || Number(tables.n) < 1) process.exit(3);
      console.log(`SQLite integrity=ok tables=${tables.n}`);
    } finally { db.close(); }
  '
echo "[GO] Okno SQLite backup opened read-only and passed integrity_check."

echo ""
echo "=== PostgreSQL disposable restore drill ==="
docker image inspect "$POSTGRES_IMAGE" >/dev/null 2>&1 || docker pull "$POSTGRES_IMAGE" >/dev/null

docker run -d --name "$PG_NAME" \
  --network none \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  --cap-add CHOWN \
  --cap-add DAC_OVERRIDE \
  --cap-add FOWNER \
  --cap-add SETGID \
  --cap-add SETUID \
  --tmpfs /var/lib/postgresql/data:rw,nosuid,nodev,size=512m \
  --tmpfs /tmp:rw,nosuid,nodev,size=128m \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD="$PG_PASSWORD" \
  -e POSTGRES_DB="$PG_DB" \
  "$POSTGRES_IMAGE" >/dev/null
PG_STARTED=1

ready=0
for _ in $(seq 1 60); do
  if docker exec "$PG_NAME" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ $ready -eq 1 ]] || { echo "[NO-GO] Disposable PostgreSQL verification container did not become ready." >&2; exit 1; }

docker cp "$latest_backup/mgc_languages.dump" "$PG_NAME:/tmp/mgc_languages.dump"
# The application schema contains RLS/policy references to the production role name "app".
# Create only a NOLOGIN compatibility role inside this disposable, network-isolated database.
# No production password, membership or privilege is copied into the drill.
docker exec "$PG_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app') THEN CREATE ROLE app NOLOGIN; END IF; END \$\$;" >/dev/null
docker exec "$PG_NAME" pg_restore --no-owner --no-privileges -U "$PG_USER" -d "$PG_DB" /tmp/mgc_languages.dump
TABLE_COUNT="$(docker exec "$PG_NAME" psql -U "$PG_USER" -d "$PG_DB" -Atc "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname='public';")"
[[ "$TABLE_COUNT" =~ ^[0-9]+$ ]] && [[ "$TABLE_COUNT" -gt 0 ]] || { echo "[NO-GO] Restored PostgreSQL database contains no public tables." >&2; exit 1; }
ALEMBIC_HEAD="$(docker exec "$PG_NAME" psql -U "$PG_USER" -d "$PG_DB" -Atc "SELECT version_num FROM alembic_version LIMIT 1;" 2>/dev/null || true)"
ROLE_LOGIN="$(docker exec "$PG_NAME" psql -U "$PG_USER" -d "$PG_DB" -Atc "SELECT rolcanlogin FROM pg_roles WHERE rolname='app';")"
[[ "$ROLE_LOGIN" == "f" ]] || { echo "[NO-GO] Disposable compatibility role app unexpectedly has LOGIN capability." >&2; exit 1; }
echo "Restored public tables: $TABLE_COUNT"
echo "Alembic head: ${ALEMBIC_HEAD:-unknown}"
echo "Compatibility role app: NOLOGIN"
echo "[GO] MGC Languages PostgreSQL dump restored successfully into an isolated disposable database."

docker rm -f "$PG_NAME" >/dev/null
PG_STARTED=0

cat > "$DEST/verification.json" <<EOF
{
  "generated_at_utc": "$STAMP",
  "profile": "dual-vm-cpu-only-no-ai",
  "result": "GO",
  "backup_stamp": "$(basename "$latest_backup")",
  "sqlite_integrity": "passed",
  "postgres_restore": "passed",
  "postgres_public_tables": $TABLE_COUNT,
  "compatibility_role_app": "NOLOGIN",
  "alembic_head": "${ALEMBIC_HEAD:-unknown}",
  "postgres_image": "$POSTGRES_IMAGE",
  "okno_image": "$OKNO_IMAGE"
}
EOF
(
  cd "$DEST"
  sha256sum verification.json > checksums.sha256
  sha256sum -c checksums.sha256 >/dev/null
)
chmod 600 "$DEST/verification.json" "$DEST/verification.txt" "$DEST/checksums.sha256" 2>/dev/null || true

echo ""
echo "Evidence: $DEST/verification.json"
echo "SHA-256: $DEST/checksums.sha256"
echo "[GO] BACKUP RESTOREABILITY: VERIFIED WITHOUT MODIFYING PILOT DATABASES."
