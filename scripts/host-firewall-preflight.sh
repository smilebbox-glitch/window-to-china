#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_ENV="${MGC_VM_HOST_ENV:-$ROOT/.env.vm-host}"
CONTRACT_ONLY=0
[[ "${1:-}" == "--contract-only" ]] && CONTRACT_ONLY=1

fail() { echo "[NO-GO] $*" >&2; exit 1; }

read_env_value() {
  local key="$1" file="$2" value=""
  if [[ -f "$file" ]]; then
    value="$(awk -F= -v k="$key" '$1==k{v=substr($0,index($0,"=")+1)} END{print v}' "$file")"
  fi
  printf '%s' "$value"
}

validate_cidr() {
  local cidr="$1" ip prefix
  [[ "$cidr" == */* ]] || fail "MGC_VM_ALLOWED_CIDR must be an IPv4 CIDR, for example 10.20.30.0/24."
  ip="${cidr%/*}"
  prefix="${cidr#*/}"
  [[ "$prefix" =~ ^[0-9]+$ ]] || fail "CIDR prefix is invalid: $cidr"
  (( prefix >= 8 && prefix <= 32 )) || fail "CIDR must be /8 or narrower; public-wide ranges are rejected: $cidr"

  local IFS='.' octets=() octet
  read -r -a octets <<< "$ip"
  [[ ${#octets[@]} -eq 4 ]] || fail "IPv4 address is invalid: $cidr"
  for octet in "${octets[@]}"; do
    [[ "$octet" =~ ^[0-9]+$ ]] || fail "IPv4 address is invalid: $cidr"
    (( octet >= 0 && octet <= 255 )) || fail "IPv4 address is invalid: $cidr"
  done

  local remaining="$prefix" bits mask idx network_octet
  for idx in 0 1 2 3; do
    if (( remaining >= 8 )); then bits=8
    elif (( remaining > 0 )); then bits=$remaining
    else bits=0
    fi
    if (( bits == 0 )); then mask=0
    else mask=$((256 - (1 << (8 - bits))))
    fi
    network_octet=$(( octets[idx] & mask ))
    (( network_octet == octets[idx] )) || fail "CIDR must use the canonical network address (host bits must be zero): $cidr"
    remaining=$(( remaining - 8 ))
  done

  # Temporary corporate VM policy: private/CGNAT IPv4 only. This prevents a
  # typo from authorising a publicly routed Internet range.
  local a=${octets[0]} b=${octets[1]}
  if (( a == 10 )); then return 0; fi
  if (( a == 172 && b >= 16 && b <= 31 )); then return 0; fi
  if (( a == 192 && b == 168 )); then return 0; fi
  if (( a == 100 && b >= 64 && b <= 127 )); then return 0; fi
  fail "Allowed CIDR must be RFC1918 or CGNAT private space for this temporary pilot: $cidr"
}

ALLOWED_CIDR="${MGC_VM_ALLOWED_CIDR:-$(read_env_value MGC_VM_ALLOWED_CIDR "$HOST_ENV")}"
[[ -n "$ALLOWED_CIDR" ]] || fail "Missing $HOST_ENV. Copy .env.vm-host.example to .env.vm-host and set MGC_VM_ALLOWED_CIDR."
[[ "$ALLOWED_CIDR" != CHANGE_ME_* ]] || fail "MGC_VM_ALLOWED_CIDR is still a placeholder in $HOST_ENV."
validate_cidr "$ALLOWED_CIDR"

if (( CONTRACT_ONLY )); then
  [[ "${GITHUB_ACTIONS:-}" == "true" && "${MGC_VM_FIREWALL_CONTRACT_ONLY:-}" == "1" ]] || fail "--contract-only is reserved for the GitHub Actions verification job."
  echo "[GO] Host firewall contract is syntactically valid for CI: $ALLOWED_CIDR -> TCP 3000,8080."
  exit 0
fi

command -v docker >/dev/null 2>&1 || fail "Docker is required for the Linux host firewall preflight."
docker info >/dev/null 2>&1 || fail "Docker daemon is not running."
command -v iptables >/dev/null 2>&1 || fail "iptables is required to validate Docker DOCKER-USER ingress filtering."

if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
  IPT=(iptables)
else
  command -v sudo >/dev/null 2>&1 || fail "sudo is required to inspect the Linux Docker firewall. Run as root or configure sudo."
  if [[ -t 0 && -t 1 ]]; then
    sudo -v || fail "Unable to obtain root access for firewall preflight."
    IPT=(sudo iptables)
  else
    sudo -n true >/dev/null 2>&1 || fail "Non-interactive firewall preflight needs passwordless sudo. Run the start command interactively or configure sudo for the check."
    IPT=(sudo -n iptables)
  fi
fi

"${IPT[@]}" -nL DOCKER-USER >/dev/null 2>&1 || fail "Docker DOCKER-USER chain is missing. Run CONFIGURE_VM_FIREWALL before START_BOTH_VM."
"${IPT[@]}" -nL MGC-VM-FILTER >/dev/null 2>&1 || fail "MGC-VM-FILTER chain is missing. Run CONFIGURE_VM_FIREWALL before START_BOTH_VM."
"${IPT[@]}" -C DOCKER-USER -j MGC-VM-FILTER >/dev/null 2>&1 || fail "DOCKER-USER does not jump to MGC-VM-FILTER."

first_rule="$("${IPT[@]}" -S DOCKER-USER | awk '$1=="-A"{print; exit}')"
[[ "$first_rule" == '-A DOCKER-USER -j MGC-VM-FILTER' ]] || fail "MGC-VM-FILTER must be the first DOCKER-USER rule so earlier rules cannot bypass the pilot boundary."

"${IPT[@]}" -C MGC-VM-FILTER -p tcp -s "$ALLOWED_CIDR" -m multiport --dports 3000,8080 -j RETURN >/dev/null 2>&1 || fail "Allow rule for $ALLOWED_CIDR -> TCP 3000,8080 is missing."
"${IPT[@]}" -C MGC-VM-FILTER -p tcp -m multiport --dports 3000,8080 -j DROP >/dev/null 2>&1 || fail "Default DROP rule for all other TCP 3000,8080 traffic is missing."

rules="$("${IPT[@]}" -S MGC-VM-FILTER)"
allow_line="$(printf '%s\n' "$rules" | grep -nF -- "-s $ALLOWED_CIDR " | head -n1 | cut -d: -f1 || true)"
drop_line="$(printf '%s\n' "$rules" | grep -nF -- '-m multiport --dports 3000,8080 -j DROP' | head -n1 | cut -d: -f1 || true)"
[[ -n "$allow_line" && -n "$drop_line" && "$allow_line" -lt "$drop_line" ]] || fail "Firewall rule order is invalid; allowed corporate traffic must be evaluated before the DROP rule."

# Reject any explicit ACCEPT rule for these pilot ports inside the MGC chain.
if printf '%s\n' "$rules" | grep -E -- '--dports? (3000|8080|3000,8080).* -j ACCEPT' >/dev/null; then
  fail "Broad ACCEPT rule detected for pilot ports in MGC-VM-FILTER."
fi

echo "[GO] Linux Docker host firewall is fail-closed: only $ALLOWED_CIDR may reach TCP 3000 and 8080."
