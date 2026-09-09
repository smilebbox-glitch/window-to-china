#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
BACKUP_ROOT="${MGC_VM_BACKUP_ROOT:-$(dirname "$ROOT")/vm-backups}"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[NO-GO] Required command not found: $1" >&2; exit 1; }
}

check_repo() {
  local repo="$1" name="$2"
  [[ -d "$repo/.git" ]] || { echo "[NO-GO] $name is not a Git working copy: $repo" >&2; exit 1; }
  local branch
  branch="$(git -C "$repo" branch --show-current)"
  [[ "$branch" == "main" ]] || { echo "[NO-GO] $name must be on main, current branch: ${branch:-detached}" >&2; exit 1; }
  # Linux operators may chmod tracked .sh launchers after checkout. Ignore mode-only
  # differences but never overwrite real content changes or untracked files.
  if [[ -n "$(git -C "$repo" -c core.fileMode=false status --porcelain)" ]]; then
    echo "[NO-GO] $name has local changes or untracked files. Update aborted without overwriting them." >&2
    git -C "$repo" -c core.fileMode=false status --short >&2 || true
    exit 1
  fi
}

preflight_remote() {
  local repo="$1" name="$2"
  echo "Fetching $name..."
  git -C "$repo" fetch origin main
  git -C "$repo" rev-parse --verify origin/main >/dev/null
  if ! git -C "$repo" merge-base --is-ancestor HEAD origin/main; then
    echo "[NO-GO] $name cannot fast-forward cleanly to origin/main. No pull was performed." >&2
    exit 1
  fi
}

need git
need docker

docker info >/dev/null 2>&1 || { echo "[NO-GO] Docker daemon is not running." >&2; exit 1; }
[[ -d "$LANG_ROOT" ]] || { echo "[NO-GO] MGC Languages was not found at: $LANG_ROOT" >&2; exit 1; }

check_repo "$ROOT" "Okno v Kitai"
check_repo "$LANG_ROOT" "MGC Languages"
preflight_remote "$ROOT" "Okno v Kitai"
preflight_remote "$LANG_ROOT" "MGC Languages"

OKNO_BEFORE="$(git -C "$ROOT" rev-parse HEAD)"
LANG_BEFORE="$(git -C "$LANG_ROOT" rev-parse HEAD)"

echo ""
echo "=== Mandatory pre-update backup ==="
chmod +x "$ROOT/scripts/backup-both-vm.sh" 2>/dev/null || true
"$ROOT/scripts/backup-both-vm.sh"
BACKUP_DIR="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' | sort | tail -n1)"
[[ -n "$BACKUP_DIR" && -s "$BACKUP_DIR/okno.sqlite" && -s "$BACKUP_DIR/mgc_languages.dump" ]] || {
  echo "[NO-GO] Verified pre-update backup could not be located. Update aborted." >&2
  exit 1
}
echo "[GO] Pre-update backup: $BACKUP_DIR"

echo ""
echo "=== Fast-forwarding both repositories ==="
git -C "$ROOT" pull --ff-only origin main
git -C "$LANG_ROOT" pull --ff-only origin main

OKNO_AFTER="$(git -C "$ROOT" rev-parse HEAD)"
LANG_AFTER="$(git -C "$LANG_ROOT" rev-parse HEAD)"

cat > "$BACKUP_DIR/update-result.txt" <<EOF
updated_utc=$(date -u +%Y%m%dT%H%M%SZ)
okno_before=$OKNO_BEFORE
okno_after=$OKNO_AFTER
languages_before=$LANG_BEFORE
languages_after=$LANG_AFTER
status=pulled-awaiting-readiness
EOF

echo ""
echo "=== Rebuilding/recreating CPU-only VM profiles ==="
chmod +x "$ROOT/scripts/start-both-vm.sh" "$ROOT/scripts/status-both-vm.sh" 2>/dev/null || true
chmod +x "$LANG_ROOT/scripts/start-vm.sh" 2>/dev/null || true
if ! "$ROOT/scripts/start-both-vm.sh"; then
  echo "[NO-GO] Updated services did not start cleanly." >&2
  echo "Pre-update backup remains at: $BACKUP_DIR" >&2
  echo "No automatic data rollback was attempted." >&2
  exit 1
fi

if ! "$ROOT/scripts/status-both-vm.sh"; then
  echo "[NO-GO] Update completed, but readiness verification failed." >&2
  echo "Pre-update backup remains at: $BACKUP_DIR" >&2
  echo "No automatic data rollback was attempted." >&2
  exit 1
fi

cat >> "$BACKUP_DIR/update-result.txt" <<EOF
verified_utc=$(date -u +%Y%m%dT%H%M%SZ)
status=success
EOF

echo ""
echo "[GO] Both VM services were updated and passed readiness checks."
echo "Okno:      $OKNO_BEFORE -> $OKNO_AFTER"
echo "Languages: $LANG_BEFORE -> $LANG_AFTER"
echo "Rollback data source if ever needed: $BACKUP_DIR"
