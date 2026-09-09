#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
REPORT_ROOT="${MGC_VM_REPORT_ROOT:-$(dirname "$ROOT")/vm-reports}"
BACKUP_ROOT="${MGC_VM_BACKUP_ROOT:-$(dirname "$ROOT")/vm-backups}"
DISK_WARN_GB="${MGC_VM_DISK_WARN_GB:-10}"
DISK_NO_GO_GB="${MGC_VM_DISK_NO_GO_GB:-5}"
BACKUP_MAX_AGE_HOURS="${MGC_VM_BACKUP_MAX_AGE_HOURS:-24}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$REPORT_ROOT/$STAMP"
READINESS_FILE="$DEST/readiness.txt"
rc=0
warnings=0

no_go() { echo "[NO-GO] $*"; rc=1; }
warn() { echo "[WARN] $*"; warnings=1; }
go() { echo "[GO] $*"; }

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[NO-GO] Required command not found: $1" >&2; exit 1; }
}

for cmd in git sha256sum df stat date awk find; do need "$cmd"; done
for value in "$DISK_WARN_GB" "$DISK_NO_GO_GB" "$BACKUP_MAX_AGE_HOURS"; do
  [[ "$value" =~ ^[0-9]+([.][0-9]+)?$ ]] || { echo "[NO-GO] Operational thresholds must be non-negative numbers." >&2; exit 1; }
done
awk -v n="$DISK_NO_GO_GB" -v w="$DISK_WARN_GB" 'BEGIN { exit !(n < w) }' || {
  echo "[NO-GO] MGC_VM_DISK_NO_GO_GB must be lower than MGC_VM_DISK_WARN_GB." >&2
  exit 1
}

[[ -d "$ROOT/.git" ]] || { echo "[NO-GO] Okno Git checkout is unavailable." >&2; exit 1; }
[[ -d "$LANG_ROOT/.git" ]] || { echo "[NO-GO] MGC Languages Git checkout is unavailable." >&2; exit 1; }
mkdir -p "$DEST"

echo "======================================================"
echo " MGC VM OPERATIONS REPORT - two services / no AI"
echo "======================================================"
echo "Generated UTC: $STAMP"
echo ""

echo "=== Runtime / acceptance ==="
CHECK_MODE="full-readiness"
CHECK_SCRIPT="$ROOT/scripts/readiness-both-vm.sh"
if [[ "${MGC_VM_REPORT_CI_SKIP_ACCEPTANCE:-NO}" == "YES" ]]; then
  if [[ "${GITHUB_ACTIONS:-}" != "true" ]]; then
    no_go "MGC_VM_REPORT_CI_SKIP_ACCEPTANCE is allowed only inside GitHub Actions."
  else
    CHECK_MODE="ci-runtime-only"
    CHECK_SCRIPT="$ROOT/scripts/status-both-vm.sh"
  fi
fi

set +e
MGC_LANGUAGES_PATH="$LANG_ROOT" MGC_VM_BACKUP_ROOT="$BACKUP_ROOT" bash "$CHECK_SCRIPT" >"$READINESS_FILE" 2>&1
readiness_rc=$?
set -e
cat "$READINESS_FILE"
if [[ $readiness_rc -ne 0 ]]; then
  no_go "Runtime/acceptance gate returned code $readiness_rc."
else
  go "Runtime/acceptance gate passed ($CHECK_MODE)."
fi

echo ""
echo "=== Host capacity ==="
free_kb="$(df -Pk "$REPORT_ROOT" | awk 'NR==2 {print $4}')"
[[ "$free_kb" =~ ^[0-9]+$ ]] || { echo "[NO-GO] Could not determine free disk space." >&2; exit 1; }
free_gb="$(awk -v kb="$free_kb" 'BEGIN { printf "%.2f", kb / 1048576 }')"
echo "Disk free:             ${free_gb} GiB"
echo "Warning threshold:     ${DISK_WARN_GB} GiB"
echo "NO-GO threshold:       ${DISK_NO_GO_GB} GiB"
if awk -v f="$free_gb" -v n="$DISK_NO_GO_GB" 'BEGIN { exit !(f < n) }'; then
  no_go "Free disk is below the NO-GO threshold. Backups and database writes may become unsafe."
elif awk -v f="$free_gb" -v w="$DISK_WARN_GB" 'BEGIN { exit !(f < w) }'; then
  warn "Free disk is below the warning threshold. Plan cleanup/capacity expansion."
else
  go "Disk capacity is above the warning threshold."
fi

echo ""
echo "=== Backup freshness ==="
latest_backup="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -print 2>/dev/null | sort | tail -n1 || true)"
backup_stamp=""
backup_age_hours="null"
backup_checksum_valid="false"
if [[ -z "$latest_backup" ]]; then
  warn "No timestamped backup found under $BACKUP_ROOT. Create BACKUP_BOTH_VM before sustained pilot use."
else
  backup_stamp="$(basename "$latest_backup")"
  sums="$latest_backup/checksums.sha256"
  manifest="$latest_backup/manifest.json"
  if [[ ! -s "$sums" || ! -s "$manifest" ]]; then
    no_go "Latest backup metadata is incomplete: $latest_backup"
  elif (cd "$latest_backup" && sha256sum -c checksums.sha256 >/dev/null 2>&1); then
    backup_checksum_valid="true"
    manifest_epoch="$(stat -c %Y "$manifest")"
    now_epoch="$(date -u +%s)"
    backup_age_hours="$(awk -v n="$now_epoch" -v m="$manifest_epoch" 'BEGIN { printf "%.2f", (n-m)/3600 }')"
    echo "Latest backup:         $backup_stamp"
    echo "Backup age:            ${backup_age_hours} h"
    echo "Max recommended age:   ${BACKUP_MAX_AGE_HOURS} h"
    go "Latest backup SHA-256 bundle verification passed."
    if awk -v a="$backup_age_hours" -v m="$BACKUP_MAX_AGE_HOURS" 'BEGIN { exit !(a > m) }'; then
      warn "Latest verified backup is older than the recommended freshness window."
    else
      go "Backup freshness is within the recommended window."
    fi
  else
    no_go "Latest backup failed SHA-256 verification: $latest_backup"
  fi
fi

OKNO_SHA="$(git -C "$ROOT" rev-parse HEAD)"
LANG_SHA="$(git -C "$LANG_ROOT" rev-parse HEAD)"
if [[ $rc -ne 0 ]]; then
  RESULT="NO-GO"
elif [[ $warnings -ne 0 ]]; then
  RESULT="WARN"
else
  RESULT="GO"
fi

cat >"$DEST/operations.json" <<EOF
{
  "generated_at_utc": "$STAMP",
  "profile": "dual-vm-cpu-only-no-ai",
  "result": "$RESULT",
  "check_mode": "$CHECK_MODE",
  "okno_commit": "$OKNO_SHA",
  "mgc_languages_commit": "$LANG_SHA",
  "readiness_exit_code": $readiness_rc,
  "disk_free_gb": $free_gb,
  "disk_warn_gb": $DISK_WARN_GB,
  "disk_no_go_gb": $DISK_NO_GO_GB,
  "backup_stamp": "$backup_stamp",
  "backup_age_hours": $backup_age_hours,
  "backup_max_age_hours": $BACKUP_MAX_AGE_HOURS,
  "backup_checksum_valid": $backup_checksum_valid
}
EOF

(
  cd "$DEST"
  sha256sum operations.json readiness.txt > checksums.sha256
  sha256sum -c checksums.sha256 >/dev/null
)
chmod 600 "$DEST/operations.json" "$DEST/readiness.txt" "$DEST/checksums.sha256" 2>/dev/null || true

echo ""
echo "Report: $DEST/operations.json"
echo "SHA-256: $DEST/checksums.sha256"
if [[ "$RESULT" == "NO-GO" ]]; then
  echo "[NO-GO] OPERATIONS REPORT: ATTENTION REQUIRED."
  exit 1
elif [[ "$RESULT" == "WARN" ]]; then
  echo "[WARN] OPERATIONS REPORT: SERVICES CAN RUN, BUT MAINTENANCE ATTENTION IS RECOMMENDED."
  exit 0
fi

echo "[GO] OPERATIONS REPORT: HEALTHY / CURRENT / CAPACITY OK / BACKUP FRESH."
exit 0
