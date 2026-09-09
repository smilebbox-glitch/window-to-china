#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="mgc-vm-weekly-backup-verify.service"
TIMER_NAME="mgc-vm-weekly-backup-verify.timer"
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"
TIMER_PATH="/etc/systemd/system/$TIMER_NAME"
WEEKLY_DAY="${MGC_VM_WEEKLY_VERIFY_DAY:-Sun}"
WEEKLY_TIME="${MGC_VM_WEEKLY_VERIFY_TIME:-03:30}"
TARGET_USER="${MGC_VM_WEEKLY_VERIFY_USER:-${SUDO_USER:-${USER:-}}}"
ACTION="${1:-menu}"

[[ "$WEEKLY_DAY" =~ ^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$ ]] || { echo '[NO-GO] MGC_VM_WEEKLY_VERIFY_DAY must be Mon..Sun.' >&2; exit 1; }
[[ "$WEEKLY_TIME" =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]] || { echo '[NO-GO] MGC_VM_WEEKLY_VERIFY_TIME must use HH:MM.' >&2; exit 1; }
[[ -n "$TARGET_USER" ]] || { echo '[NO-GO] Could not determine scheduled-task user.' >&2; exit 1; }

as_root() { if [[ ${EUID:-$(id -u)} -eq 0 ]]; then "$@"; else sudo "$@"; fi; }
run_as_target() {
  if [[ ${EUID:-$(id -u)} -eq 0 ]]; then sudo -u "$TARGET_USER" -H "$@"; else "$@"; fi
}

install_schedule() {
  command -v systemctl >/dev/null 2>&1 || { echo '[NO-GO] systemd/systemctl is required.' >&2; exit 1; }
  command -v docker >/dev/null 2>&1 || { echo '[NO-GO] Docker is required.' >&2; exit 1; }
  run_as_target docker info >/dev/null 2>&1 || {
    echo "[NO-GO] User $TARGET_USER cannot access Docker. Grant Docker access before scheduling." >&2
    exit 1
  }
  local target_group hour minute service_tmp timer_tmp
  target_group="$(id -gn "$TARGET_USER")"
  hour="${WEEKLY_TIME%:*}"
  minute="${WEEKLY_TIME#*:}"
  service_tmp="$(mktemp)"
  timer_tmp="$(mktemp)"
  trap 'rm -f "$service_tmp" "$timer_tmp"' RETURN

  cat >"$service_tmp" <<EOF
[Unit]
Description=MGC dual VM weekly non-destructive backup restoreability verification
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=$TARGET_USER
Group=$target_group
WorkingDirectory=$ROOT
ExecStart=/usr/bin/env bash $ROOT/scripts/verify-backup-both-vm.sh
Nice=10
EOF

  cat >"$timer_tmp" <<EOF
[Unit]
Description=Run MGC dual VM weekly backup restoreability verification

[Timer]
OnCalendar=$WEEKLY_DAY *-*-* ${hour}:${minute}:00
Persistent=true
RandomizedDelaySec=15m
Unit=$SERVICE_NAME

[Install]
WantedBy=timers.target
EOF

  as_root install -m 0644 "$service_tmp" "$SERVICE_PATH"
  as_root install -m 0644 "$timer_tmp" "$TIMER_PATH"
  as_root systemctl daemon-reload
  as_root systemctl enable --now "$TIMER_NAME" >/dev/null
  echo "[GO] Weekly backup restoreability verification installed for $TARGET_USER on $WEEKLY_DAY at about $WEEKLY_TIME local server time."
  echo '[GO] Persistent timer enabled; missed checks run after the VM returns online.'
  as_root systemctl list-timers "$TIMER_NAME" --no-pager || true
}

remove_schedule() {
  command -v systemctl >/dev/null 2>&1 || { echo '[NO-GO] systemd/systemctl is required.' >&2; exit 1; }
  as_root systemctl disable --now "$TIMER_NAME" >/dev/null 2>&1 || true
  as_root rm -f "$SERVICE_PATH" "$TIMER_PATH"
  as_root systemctl daemon-reload
  as_root systemctl reset-failed "$SERVICE_NAME" "$TIMER_NAME" >/dev/null 2>&1 || true
  echo '[GO] Weekly backup verification schedule removed. Backup and verification evidence were preserved.'
}

show_status() {
  command -v systemctl >/dev/null 2>&1 || { echo '[NO-GO] systemd/systemctl is required.' >&2; exit 1; }
  as_root systemctl status "$TIMER_NAME" --no-pager || true
  echo ''
  as_root systemctl list-timers "$TIMER_NAME" --no-pager || true
  echo ''
  as_root systemctl status "$SERVICE_NAME" --no-pager || true
}

run_now() {
  echo "[GO] Running non-destructive backup restoreability verification now as $TARGET_USER."
  run_as_target env \
    MGC_VM_BACKUP_ROOT="${MGC_VM_BACKUP_ROOT:-$(dirname "$ROOT")/vm-backups}" \
    MGC_VM_BACKUP_VERIFY_ROOT="${MGC_VM_BACKUP_VERIFY_ROOT:-$(dirname "$ROOT")/vm-backup-verification}" \
    bash "$ROOT/scripts/verify-backup-both-vm.sh"
}

menu() {
  while true; do
    cat <<'EOF'
======================================================
 MGC WEEKLY BACKUP RESTOREABILITY
======================================================
  1. RUN NOW
  2. INSTALL WEEKLY SCHEDULE
  3. SCHEDULE STATUS
  4. REMOVE SCHEDULE
  Q. BACK
EOF
    printf '\nSelect: '
    read -r choice || exit 0
    case "$choice" in
      1) run_now ;;
      2) install_schedule ;;
      3) show_status ;;
      4) remove_schedule ;;
      q|Q) return 0 ;;
      *) echo 'Unknown selection.' ;;
    esac
    echo ''
  done
}

case "$ACTION" in
  install) install_schedule ;;
  remove) remove_schedule ;;
  status) show_status ;;
  run) run_now ;;
  menu) menu ;;
  *) echo 'Usage: manage-weekly-backup-verify.sh [install|remove|status|run|menu]' >&2; exit 2 ;;
esac
