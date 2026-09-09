#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
ACCEPT_ROOT="${MGC_VM_ACCEPTANCE_ROOT:-$(dirname "$ROOT")/vm-acceptance}"
BACKUP_ROOT="${MGC_VM_BACKUP_ROOT:-$(dirname "$ROOT")/vm-backups}"
HOST_ENV="${MGC_VM_HOST_ENV:-$ROOT/.env.vm-host}"
rc=0

fail_line() { echo "[NO-GO] $*"; rc=1; }
warn_line() { echo "[WARN] $*"; }
go_line() { echo "[GO] $*"; }

read_env_value() {
  local key="$1" file="$2" value=""
  if [[ -f "$file" ]]; then
    value="$(awk -F= -v k="$key" '$1==k{v=substr($0,index($0,"=")+1)} END{print v}' "$file")"
  fi
  printf '%s' "$value"
}

json_string() {
  local key="$1" file="$2"
  sed -nE 's/^[[:space:]]*"'"$key"'"[[:space:]]*:[[:space:]]*"([^"]*)"[,]?[[:space:]]*$/\1/p' "$file" | head -n1
}

latest_timestamp_dir() {
  local root="$1"
  find "$root" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -print 2>/dev/null | sort | tail -n1 || true
}

command -v git >/dev/null 2>&1 || { echo "[NO-GO] Git is required." >&2; exit 1; }
command -v sha256sum >/dev/null 2>&1 || { echo "[NO-GO] sha256sum is required." >&2; exit 1; }
[[ -d "$ROOT/.git" ]] || { echo "[NO-GO] Okno Git checkout is unavailable." >&2; exit 1; }
[[ -d "$LANG_ROOT/.git" ]] || { echo "[NO-GO] MGC Languages Git checkout is unavailable." >&2; exit 1; }

echo "======================================================"
echo " MGC VM PILOT READINESS - two services / no AI"
echo "======================================================"
echo ""

echo "=== Runtime ==="
if MGC_LANGUAGES_PATH="$LANG_ROOT" bash "$ROOT/scripts/status-both-vm.sh"; then
  go_line "Both services passed current readiness + container ingress isolation."
else
  fail_line "Current service readiness or ingress isolation failed."
fi

echo ""
echo "=== Deployment identity ==="
current_okno="$(git -C "$ROOT" rev-parse HEAD)"
current_lang="$(git -C "$LANG_ROOT" rev-parse HEAD)"
echo "Okno current:         $current_okno"
echo "MGC Languages current: $current_lang"

echo ""
echo "=== Latest acceptance ==="
latest_accept="$(latest_timestamp_dir "$ACCEPT_ROOT")"
if [[ -z "$latest_accept" ]]; then
  fail_line "No acceptance receipt found under $ACCEPT_ROOT. Run ACCEPT_BOTH_VM before admitting pilot users."
else
  receipt="$latest_accept/acceptance.json"
  sums="$latest_accept/checksums.sha256"
  if [[ ! -s "$receipt" || ! -s "$sums" ]]; then
    fail_line "Latest acceptance evidence is incomplete: $latest_accept"
  elif (cd "$latest_accept" && sha256sum -c checksums.sha256 >/dev/null 2>&1); then
    accepted_okno="$(json_string okno_commit "$receipt")"
    accepted_lang="$(json_string mgc_languages_commit "$receipt")"
    accepted_cidr="$(json_string allowed_cidr "$receipt")"
    accepted_at="$(json_string accepted_at_utc "$receipt")"
    accepted_result="$(json_string result "$receipt")"
    current_cidr="${MGC_VM_ALLOWED_CIDR:-$(read_env_value MGC_VM_ALLOWED_CIDR "$HOST_ENV")}"

    echo "Receipt:              $latest_accept"
    echo "Accepted at UTC:      ${accepted_at:-unknown}"
    echo "Accepted Okno:        ${accepted_okno:-unknown}"
    echo "Accepted MGC:         ${accepted_lang:-unknown}"
    echo "Accepted CIDR:        ${accepted_cidr:-unknown}"

    if [[ "$accepted_result" != "GO" ]]; then
      fail_line "Latest acceptance receipt does not contain result=GO."
    elif [[ -z "$accepted_okno" || -z "$accepted_lang" || -z "$accepted_cidr" ]]; then
      fail_line "Latest acceptance receipt is missing deployment identity fields."
    elif [[ "$accepted_okno" != "$current_okno" || "$accepted_lang" != "$current_lang" ]]; then
      fail_line "ACCEPTANCE STALE: repository revisions changed after the last GO. Run ACCEPT_BOTH_VM again."
    elif [[ -z "$current_cidr" || "$accepted_cidr" != "$current_cidr" ]]; then
      fail_line "ACCEPTANCE STALE: corporate CIDR differs from the accepted boundary. Run ACCEPT_BOTH_VM again."
    else
      go_line "Acceptance is CURRENT: commits and corporate CIDR match the latest GO receipt."
    fi
  else
    fail_line "Latest acceptance receipt failed SHA-256 verification: $latest_accept"
  fi
fi

echo ""
echo "=== Latest backup ==="
latest_backup="$(latest_timestamp_dir "$BACKUP_ROOT")"
if [[ -z "$latest_backup" ]]; then
  warn_line "No normal timestamped backup found under $BACKUP_ROOT. Create BACKUP_BOTH_VM before sustained pilot use."
else
  manifest="$latest_backup/manifest.json"
  sums="$latest_backup/checksums.sha256"
  if [[ ! -s "$manifest" || ! -s "$sums" ]]; then
    warn_line "Latest backup metadata is incomplete: $latest_backup"
  else
    manifest_line="$(grep -E '(^|[[:space:]])\.?/?manifest\.json$' "$sums" | head -n1 || true)"
    if [[ -z "$manifest_line" ]]; then
      warn_line "Latest backup checksum file does not cover manifest.json: $latest_backup"
    elif (cd "$latest_backup" && printf '%s\n' "$manifest_line" | sha256sum -c - >/dev/null 2>&1); then
      backup_okno="$(json_string okno_commit "$manifest")"
      backup_lang="$(json_string mgc_languages_commit "$manifest")"
      backup_at="$(json_string created_utc "$manifest")"
      echo "Backup:               $latest_backup"
      echo "Backup created UTC:   ${backup_at:-unknown}"
      echo "Backup Okno commit:   ${backup_okno:-unknown}"
      echo "Backup MGC commit:    ${backup_lang:-unknown}"
      go_line "Latest backup manifest checksum is valid."
      if [[ "$backup_okno" != "$current_okno" || "$backup_lang" != "$current_lang" ]]; then
        warn_line "Latest backup was created on different revisions than the current checkout. This is allowed, but create a fresh backup before risky maintenance."
      fi
    else
      warn_line "Latest backup manifest checksum verification failed: $latest_backup"
    fi
  fi
fi

echo ""
if [[ $rc -eq 0 ]]; then
  echo "[GO] PILOT READINESS: CURRENT ACCEPTANCE / SERVICES READY."
  exit 0
fi

echo "[NO-GO] PILOT READINESS: ATTENTION REQUIRED."
exit "$rc"
