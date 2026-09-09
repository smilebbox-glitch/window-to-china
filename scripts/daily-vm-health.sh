#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
BACKUP_ROOT="${MGC_VM_BACKUP_ROOT:-$(dirname "$ROOT")/vm-backups}"
REPORT_ROOT="${MGC_VM_REPORT_ROOT:-$(dirname "$ROOT")/vm-reports}"
LOG_ROOT="${MGC_VM_DAILY_LOG_ROOT:-$(dirname "$ROOT")/vm-daily-logs}"
BACKUP_AFTER_HOURS="${MGC_VM_DAILY_BACKUP_AFTER_HOURS:-20}"
LOG_RETENTION_DAYS="${MGC_VM_DAILY_LOG_RETENTION_DAYS:-30}"
REPORT_RETENTION_DAYS="${MGC_VM_REPORT_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$LOG_ROOT/$STAMP.log"
LOCK_DIR="$LOG_ROOT/.daily-health.lock"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[NO-GO] Required command not found: $1" >&2; exit 1; }
}

for cmd in date find stat awk cp mkdir sha256sum tee; do need "$cmd"; done
[[ "$BACKUP_AFTER_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]] || {
  echo "[NO-GO] MGC_VM_DAILY_BACKUP_AFTER_HOURS must be a non-negative number." >&2
  exit 1
}
for value in "$LOG_RETENTION_DAYS" "$REPORT_RETENTION_DAYS"; do
  [[ "$value" =~ ^[0-9]+$ ]] || {
    echo "[NO-GO] Daily log/report retention values must be non-negative whole days." >&2
    exit 1
  }
done

mkdir -p "$LOG_ROOT"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "[WARN] Daily VM health check is already running. Skipping duplicate invocation."
  exit 0
fi
cleanup() { rmdir "$LOCK_DIR" 2>/dev/null || true; }
trap cleanup EXIT

exec > >(tee -a "$LOG_FILE") 2>&1

echo "======================================================"
echo " MGC DAILY VM HEALTH - two services / no AI"
echo "======================================================"
echo "Generated UTC: $STAMP"
echo ""

backup_due=0
latest_backup="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -print 2>/dev/null | sort | tail -n1 || true)"
if [[ -z "$latest_backup" || ! -s "$latest_backup/manifest.json" || ! -s "$latest_backup/checksums.sha256" ]]; then
  backup_due=1
  echo "[WARN] No complete timestamped backup found. A verified backup will be created."
elif ! (cd "$latest_backup" && sha256sum -c checksums.sha256 >/dev/null 2>&1); then
  backup_due=1
  echo "[WARN] Latest backup failed SHA-256 verification. A fresh verified backup will be created."
else
  manifest_epoch="$(stat -c %Y "$latest_backup/manifest.json")"
  now_epoch="$(date -u +%s)"
  backup_age_hours="$(awk -v n="$now_epoch" -v m="$manifest_epoch" 'BEGIN { printf "%.2f", (n-m)/3600 }')"
  echo "Latest backup: $(basename "$latest_backup") (${backup_age_hours} h old, SHA-256 verified)"
  if awk -v a="$backup_age_hours" -v m="$BACKUP_AFTER_HOURS" 'BEGIN { exit !(a >= m) }'; then
    backup_due=1
  fi
fi

backup_rc=0
if [[ $backup_due -eq 1 ]]; then
  echo ""
  echo "=== Daily verified backup ==="
  set +e
  MGC_LANGUAGES_PATH="$LANG_ROOT" MGC_VM_BACKUP_ROOT="$BACKUP_ROOT" bash "$ROOT/scripts/backup-both-vm.sh"
  backup_rc=$?
  set -e
  if [[ $backup_rc -ne 0 ]]; then
    echo "[NO-GO] Daily verified backup failed with code $backup_rc."
  else
    echo "[GO] Daily verified backup completed."
  fi
else
  echo "[GO] Existing verified backup is newer than ${BACKUP_AFTER_HOURS} h; no duplicate backup needed."
fi

echo ""
echo "=== Daily operations report ==="
set +e
MGC_LANGUAGES_PATH="$LANG_ROOT" MGC_VM_BACKUP_ROOT="$BACKUP_ROOT" MGC_VM_REPORT_ROOT="$REPORT_ROOT" bash "$ROOT/scripts/ops-report-both-vm.sh"
report_rc=$?
set -e

cp "$LOG_FILE" "$LOG_ROOT/latest.log"
chmod 600 "$LOG_FILE" "$LOG_ROOT/latest.log" 2>/dev/null || true

# Bound operational evidence growth. Backups have their own retention policy.
if [[ "$LOG_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  find "$LOG_ROOT" -maxdepth 1 -type f -name '20??????T??????Z.log' -mtime "+$LOG_RETENTION_DAYS" -delete 2>/dev/null || true
fi
if [[ "$REPORT_RETENTION_DAYS" =~ ^[0-9]+$ && -d "$REPORT_ROOT" ]]; then
  find "$REPORT_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -mtime "+$REPORT_RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true
fi

echo ""
echo "Log: $LOG_FILE"
echo "Log retention: ${LOG_RETENTION_DAYS} days"
echo "Report retention: ${REPORT_RETENTION_DAYS} days"
if [[ $backup_rc -ne 0 || $report_rc -ne 0 ]]; then
  echo "[NO-GO] DAILY VM HEALTH: ATTENTION REQUIRED."
  exit 1
fi

echo "[GO] DAILY VM HEALTH: COMPLETED. Review any [WARN] lines above."
exit 0
