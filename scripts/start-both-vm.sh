#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"

if [ ! -f "$ROOT/scripts/start-vm.sh" ]; then
  echo "[NO-GO] Okno v Kitai VM launcher not found." >&2
  exit 1
fi
if [ ! -f "$LANG_ROOT/scripts/start-vm.sh" ]; then
  echo "[NO-GO] MGC Languages was not found at: $LANG_ROOT" >&2
  echo "Clone smilebbox-glitch/mgc-languages next to window-to-china or set MGC_LANGUAGES_PATH." >&2
  exit 1
fi
if [ ! -f "$ROOT/scripts/status-both-vm.sh" ]; then
  echo "[NO-GO] Shared VM status/security gate not found." >&2
  exit 1
fi
if [ ! -f "$ROOT/scripts/host-firewall-preflight.sh" ]; then
  echo "[NO-GO] Host firewall preflight is missing." >&2
  exit 1
fi

# GitHub Contents API and Windows-originated archives may not preserve Unix
# executable bits. The first shared start repairs all Linux VM operator commands.
chmod +x \
  "$ROOT/scripts/start-vm.sh" \
  "$ROOT/scripts/start-both-vm.sh" \
  "$ROOT/scripts/status-both-vm.sh" \
  "$ROOT/scripts/accept-both-vm.sh" \
  "$ROOT/scripts/host-firewall-preflight.sh" \
  "$ROOT/scripts/configure-vm-firewall.sh" \
  "$ROOT/scripts/apply-vm-firewall.sh" \
  "$ROOT/scripts/backup-both-vm.sh" \
  "$ROOT/scripts/restore-both-vm.sh" \
  "$ROOT/scripts/diagnostics-both-vm.sh" \
  "$ROOT/scripts/update-both-vm.sh" \
  "$ROOT/scripts/stop-both-vm.sh" \
  "$ROOT/scripts/vm-control.sh" \
  "$LANG_ROOT/scripts/start-vm.sh" \
  2>/dev/null || true

echo "=== Host firewall preflight ==="
# GitHub-hosted runners cannot safely mutate their host firewall. An actual
# GitHub Actions run receives a private test CIDR and validates only the
# firewall contract. Normal VM starts always inspect the real host firewall.
if [ "${GITHUB_ACTIONS:-}" = "true" ] && [ -n "${GITHUB_RUN_ID:-}" ]; then
  MGC_VM_ALLOWED_CIDR="${MGC_VM_ALLOWED_CIDR:-10.250.0.0/24}" \
  MGC_VM_FIREWALL_CONTRACT_ONLY=1 \
    "$ROOT/scripts/host-firewall-preflight.sh" --contract-only
else
  "$ROOT/scripts/host-firewall-preflight.sh"
fi

echo ""
echo "=== Starting Okno v Kitai ==="
"$ROOT/scripts/start-vm.sh"

echo ""
echo "=== Starting MGC Languages ==="
(
  cd "$LANG_ROOT"
  ./scripts/start-vm.sh
)

echo ""
echo "=== Final readiness + ingress isolation gate ==="
MGC_LANGUAGES_PATH="$LANG_ROOT" "$ROOT/scripts/status-both-vm.sh"

echo ""
echo "[GO] Both MGC test services passed host firewall, readiness and ingress isolation checks."
echo "Okno v Kitai:  http://127.0.0.1:3000"
echo "MGC Languages:  http://127.0.0.1:8080"
echo "Use the VM IP instead of 127.0.0.1 only from the configured corporate CIDR."
