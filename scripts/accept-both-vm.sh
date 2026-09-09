#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"

fail() { echo "[NO-GO] $*" >&2; exit 1; }

[[ -f "$ROOT/scripts/host-firewall-preflight.sh" ]] || fail "Host firewall preflight is missing."
[[ -f "$ROOT/scripts/status-both-vm.sh" ]] || fail "Shared VM status gate is missing."
[[ -f "$ROOT/scripts/write-vm-acceptance-receipt.sh" ]] || fail "Acceptance evidence writer is missing."
[[ -f "$ROOT/.env.vm" ]] || fail "Okno .env.vm is missing. Start the VM profile first."
[[ -f "$LANG_ROOT/.env.vm" ]] || fail "MGC Languages .env.vm is missing. Start the VM profile first."
command -v docker >/dev/null 2>&1 || fail "Docker is not installed or not in PATH."
docker info >/dev/null 2>&1 || fail "Docker daemon is not running."

container_env_value() {
  local cid="$1" key="$2"
  docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$cid" 2>/dev/null |
    awk -F= -v k="$key" '$1==k{v=substr($0,index($0,"=")+1)} END{print v}'
}

echo "=== 1/4 Host firewall acceptance ==="
if [[ "${GITHUB_ACTIONS:-}" == "true" && -n "${GITHUB_RUN_ID:-}" ]]; then
  MGC_VM_ALLOWED_CIDR="${MGC_VM_ALLOWED_CIDR:-10.250.0.0/24}" \
  MGC_VM_FIREWALL_CONTRACT_ONLY=1 \
    bash "$ROOT/scripts/host-firewall-preflight.sh" --contract-only
else
  bash "$ROOT/scripts/host-firewall-preflight.sh"
fi

echo ""
echo "=== 2/4 Runtime readiness + ingress isolation ==="
MGC_LANGUAGES_PATH="$LANG_ROOT" bash "$ROOT/scripts/status-both-vm.sh"

echo ""
echo "=== 3/4 CPU-only / no-AI runtime contract ==="
OKNO_CID="$(cd "$ROOT" && docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml ps -q china-auto-radar)"
LANG_CID="$(cd "$LANG_ROOT" && docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml ps -q app)"
[[ -n "$OKNO_CID" ]] || fail "Okno application container is not running."
[[ -n "$LANG_CID" ]] || fail "MGC Languages application container is not running."

rag_url="$(container_env_value "$OKNO_CID" RAG_API_URL)"
rag_model="$(container_env_value "$OKNO_CID" RAG_MODEL)"
rag_key="$(container_env_value "$OKNO_CID" RAG_API_KEY)"
tts_enabled="$(container_env_value "$LANG_CID" TTS_ENABLED)"
tts_cache="$(container_env_value "$LANG_CID" TTS_DISK_CACHE_ENABLED)"

[[ -z "$rag_url" ]] || fail "Okno RAG_API_URL must be empty in the temporary CPU-only pilot."
[[ -z "$rag_model" ]] || fail "Okno RAG_MODEL must be empty in the temporary CPU-only pilot."
[[ -z "$rag_key" ]] || fail "Okno RAG_API_KEY must be empty in the temporary CPU-only pilot."
[[ "$tts_enabled" == "false" ]] || fail "MGC Languages TTS_ENABLED must be false in the temporary CPU-only pilot."
[[ "$tts_cache" == "false" ]] || fail "MGC Languages TTS_DISK_CACHE_ENABLED must be false in the temporary CPU-only pilot."
echo "[GO] No-AI runtime contract is active for both services."

echo ""
echo "=== 4/4 Acceptance evidence ==="
MGC_LANGUAGES_PATH="$LANG_ROOT" bash "$ROOT/scripts/write-vm-acceptance-receipt.sh"

echo ""
echo "[GO] VM PILOT ACCEPTANCE PASSED."
echo "     Host firewall: restricted corporate CIDR only"
echo "     Okno v Kitai: readiness + hardened ingress + generative RAG disabled"
echo "     MGC Languages: readiness + hardened nginx ingress + server TTS disabled"
echo "     Ports: TCP 3000 and 8080 only through the configured host boundary"
echo "     Evidence: timestamped acceptance.json + SHA-256 receipt was written"
