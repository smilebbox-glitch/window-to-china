#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_ENV="${MGC_VM_HOST_ENV:-$ROOT/.env.vm-host}"
EXAMPLE="$ROOT/.env.vm-host.example"

[[ ${EUID:-$(id -u)} -eq 0 ]] || { echo '[NO-GO] Run this command as root: sudo ./scripts/configure-vm-firewall.sh' >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo '[NO-GO] Docker is required.' >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo '[NO-GO] Docker daemon must be running.' >&2; exit 1; }

set_host_env() {
  local cidr="$1"
  umask 077
  printf '%s\n' \
    '# Local host firewall boundary for the temporary dual-service VM.' \
    "MGC_VM_ALLOWED_CIDR=$cidr" > "$HOST_ENV"
  chmod 600 "$HOST_ENV" 2>/dev/null || true
}

current="${MGC_VM_ALLOWED_CIDR:-}"
if [[ -z "$current" && -f "$HOST_ENV" ]]; then
  current="$(awk -F= '$1=="MGC_VM_ALLOWED_CIDR"{v=substr($0,index($0,"=")+1)} END{print v}' "$HOST_ENV")"
fi
if [[ -z "$current" || "$current" == CHANGE_ME_* ]]; then
  if [[ -n "${1:-}" ]]; then
    current="$1"
  elif [[ -t 0 ]]; then
    echo 'Enter the approved corporate IPv4 CIDR that may access this VM.'
    echo 'Example: 10.20.30.0/24'
    read -r -p 'Corporate CIDR: ' current
  else
    echo "[NO-GO] MGC_VM_ALLOWED_CIDR is not configured. Copy $EXAMPLE to $HOST_ENV or pass CIDR as the first argument." >&2
    exit 1
  fi
fi

# Validate before persisting or modifying firewall state.
GITHUB_ACTIONS=true MGC_VM_FIREWALL_CONTRACT_ONLY=1 MGC_VM_ALLOWED_CIDR="$current" \
  "$ROOT/scripts/host-firewall-preflight.sh" --contract-only
set_host_env "$current"

chmod +x "$ROOT/scripts/apply-vm-firewall.sh" "$ROOT/scripts/host-firewall-preflight.sh" 2>/dev/null || true
"$ROOT/scripts/apply-vm-firewall.sh"

if command -v systemctl >/dev/null 2>&1 && [[ -d /etc/systemd/system ]]; then
  unit=/etc/systemd/system/mgc-vm-firewall.service
  cat > "$unit" <<EOF
[Unit]
Description=MGC temporary VM Docker ingress firewall
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart="$ROOT/scripts/apply-vm-firewall.sh"

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable mgc-vm-firewall.service >/dev/null
  echo '[GO] Installed persistent systemd firewall re-apply service: mgc-vm-firewall.service'
else
  echo '[WARN] systemd was not detected. Firewall rules are active now but IT must arrange re-application after reboot.' >&2
fi

MGC_VM_ALLOWED_CIDR="$current" "$ROOT/scripts/host-firewall-preflight.sh"
echo "[GO] Linux VM host firewall configuration is complete."
