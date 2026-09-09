#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_ENV="${MGC_VM_HOST_ENV:-$ROOT/.env.vm-host}"

[[ ${EUID:-$(id -u)} -eq 0 ]] || { echo '[NO-GO] apply-vm-firewall.sh must run as root.' >&2; exit 1; }
command -v iptables >/dev/null 2>&1 || { echo '[NO-GO] iptables is required.' >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo '[NO-GO] Docker is required.' >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo '[NO-GO] Docker daemon must be running before firewall rules are applied.' >&2; exit 1; }

read_env_value() {
  local key="$1" value=""
  if [[ -f "$HOST_ENV" ]]; then
    value="$(awk -F= -v k="$key" '$1==k{v=substr($0,index($0,"=")+1)} END{print v}' "$HOST_ENV")"
  fi
  printf '%s' "$value"
}

ALLOWED_CIDR="${MGC_VM_ALLOWED_CIDR:-$(read_env_value MGC_VM_ALLOWED_CIDR)}"
[[ -n "$ALLOWED_CIDR" && "$ALLOWED_CIDR" != CHANGE_ME_* ]] || { echo "[NO-GO] Configure MGC_VM_ALLOWED_CIDR in $HOST_ENV first." >&2; exit 1; }

# Validate CIDR with the same fail-closed policy as the preflight before making
# any firewall change. Contract-only is intentionally unavailable here.
GITHUB_ACTIONS=true MGC_VM_FIREWALL_CONTRACT_ONLY=1 MGC_VM_ALLOWED_CIDR="$ALLOWED_CIDR" \
  "$ROOT/scripts/host-firewall-preflight.sh" --contract-only >/dev/null

iptables -nL DOCKER-USER >/dev/null 2>&1 || { echo '[NO-GO] DOCKER-USER chain is unavailable. Start/restart Docker Engine first.' >&2; exit 1; }

iptables -N MGC-VM-FILTER 2>/dev/null || true
iptables -F MGC-VM-FILTER
iptables -A MGC-VM-FILTER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -A MGC-VM-FILTER -p tcp -s "$ALLOWED_CIDR" -m multiport --dports 3000,8080 -j RETURN
iptables -A MGC-VM-FILTER -p tcp -m multiport --dports 3000,8080 -j DROP
iptables -A MGC-VM-FILTER -j RETURN

while iptables -C DOCKER-USER -j MGC-VM-FILTER >/dev/null 2>&1; do
  iptables -D DOCKER-USER -j MGC-VM-FILTER
done
iptables -I DOCKER-USER 1 -j MGC-VM-FILTER

echo "[GO] Applied Linux Docker firewall: $ALLOWED_CIDR -> TCP 3000,8080; all other sources are dropped for those ports."
