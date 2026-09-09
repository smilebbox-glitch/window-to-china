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

# GitHub Contents API and Windows-originated archives may not preserve Unix
# executable bits. The first shared start repairs all Linux VM operator commands.
chmod +x \
  "$ROOT/scripts/start-vm.sh" \
  "$ROOT/scripts/start-both-vm.sh" \
  "$ROOT/scripts/status-both-vm.sh" \
  "$ROOT/scripts/backup-both-vm.sh" \
  "$ROOT/scripts/restore-both-vm.sh" \
  "$ROOT/scripts/diagnostics-both-vm.sh" \
  "$ROOT/scripts/update-both-vm.sh" \
  "$ROOT/scripts/stop-both-vm.sh" \
  "$LANG_ROOT/scripts/start-vm.sh" \
  2>/dev/null || true

echo "=== Starting Okno v Kitai ==="
"$ROOT/scripts/start-vm.sh"

echo ""
echo "=== Starting MGC Languages ==="
(
  cd "$LANG_ROOT"
  ./scripts/start-vm.sh
)

echo ""
echo "[GO] Both MGC test services are running on this VM."
echo "Okno v Kitai:  http://127.0.0.1:3000"
echo "MGC Languages:  http://127.0.0.1:8080"
echo "Use the VM IP instead of 127.0.0.1 from other approved LAN PCs."
