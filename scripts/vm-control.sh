#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

run() {
  local script="$1"
  echo ""
  "$ROOT/scripts/$script"
  local rc=$?
  echo ""
  if [[ $rc -eq 0 ]]; then echo "[GO] Operation completed."; else echo "[NO-GO] Operation returned code $rc."; fi
  if [[ -t 0 ]]; then read -r -p 'Press Enter to return to menu...' _ || true; fi
}

while true; do
  clear 2>/dev/null || true
  cat <<'EOF'
======================================================
       MGC VM CONTROL - two services / no AI
======================================================

  1. START        Start/rebuild both services
  2. STATUS       Check both services and readiness
  3. BACKUP       Create verified backup of both DBs
  4. DIAGNOSTICS  Create secret-safe diagnostics bundle
  5. UPDATE       Backup + safe fast-forward update
  6. RESTORE      Controlled restore of both DBs
  7. STOP         Stop both services, preserve data
  Q. EXIT
EOF
  printf '\nSelect: '
  read -r choice || exit 0
  case "$choice" in
    1) run start-both-vm.sh ;;
    2) run status-both-vm.sh ;;
    3) run backup-both-vm.sh ;;
    4) run diagnostics-both-vm.sh ;;
    5) run update-both-vm.sh ;;
    6) run restore-both-vm.sh ;;
    7) run stop-both-vm.sh ;;
    q|Q) exit 0 ;;
    *) echo 'Unknown selection.'; sleep 1 ;;
  esac
done
