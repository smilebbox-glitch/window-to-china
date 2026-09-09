#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

finish() {
  local rc="$1"
  echo ""
  if [[ $rc -eq 0 ]]; then echo "[GO] Operation completed."; else echo "[NO-GO] Operation returned code $rc."; fi
  if [[ -t 0 ]]; then read -r -p 'Press Enter to return to menu...' _ || true; fi
}

run() {
  local script="$1"
  echo ""
  "$ROOT/scripts/$script"
  finish $?
}

run_sudo() {
  local script="$1"
  echo ""
  sudo "$ROOT/scripts/$script"
  finish $?
}

while true; do
  clear 2>/dev/null || true
  cat <<'EOF'
======================================================
       MGC VM CONTROL - two services / no AI
======================================================

  1. FIREWALL SETUP  Configure restricted host ingress
  2. FIREWALL CHECK  Verify host firewall boundary
  3. START           Start/rebuild both services
  4. STATUS          Check both services and readiness
  5. BACKUP          Create verified backup of both DBs
  6. DIAGNOSTICS     Create secret-safe diagnostics bundle
  7. UPDATE          Backup + safe fast-forward update
  8. RESTORE         Controlled restore of both DBs
  9. STOP            Stop both services, preserve data
  Q. EXIT
EOF
  printf '\nSelect: '
  read -r choice || exit 0
  case "$choice" in
    1) run_sudo configure-vm-firewall.sh ;;
    2) run_sudo host-firewall-preflight.sh ;;
    3) run start-both-vm.sh ;;
    4) run status-both-vm.sh ;;
    5) run backup-both-vm.sh ;;
    6) run diagnostics-both-vm.sh ;;
    7) run update-both-vm.sh ;;
    8) run restore-both-vm.sh ;;
    9) run stop-both-vm.sh ;;
    q|Q) exit 0 ;;
    *) echo 'Unknown selection.'; sleep 1 ;;
  esac
done
