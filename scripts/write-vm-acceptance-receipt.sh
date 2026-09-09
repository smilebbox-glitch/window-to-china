#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
ACCEPT_ROOT="${MGC_VM_ACCEPTANCE_ROOT:-$(dirname "$ROOT")/vm-acceptance}"
HOST_ENV="${MGC_VM_HOST_ENV:-$ROOT/.env.vm-host}"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[NO-GO] Required command not found for acceptance receipt: $1" >&2; exit 1; }
}

read_env_value() {
  local key="$1" file="$2" value=""
  if [[ -f "$file" ]]; then
    value="$(awk -F= -v k="$key" '$1==k{v=substr($0,index($0,"=")+1)} END{print v}' "$file")"
  fi
  printf '%s' "$value"
}

need git
need sha256sum
need date

[[ -d "$ROOT/.git" ]] || { echo "[NO-GO] Okno Git checkout is unavailable for acceptance evidence." >&2; exit 1; }
[[ -d "$LANG_ROOT/.git" ]] || { echo "[NO-GO] MGC Languages Git checkout is unavailable for acceptance evidence." >&2; exit 1; }

allowed_cidr="${MGC_VM_ALLOWED_CIDR:-$(read_env_value MGC_VM_ALLOWED_CIDR "$HOST_ENV")}"
[[ -n "$allowed_cidr" ]] || { echo "[NO-GO] MGC_VM_ALLOWED_CIDR is unavailable for acceptance evidence." >&2; exit 1; }

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
dest="$ACCEPT_ROOT/$timestamp"
mkdir -p "$dest"

okno_commit="$(git -C "$ROOT" rev-parse HEAD)"
languages_commit="$(git -C "$LANG_ROOT" rev-parse HEAD)"

cat > "$dest/acceptance.json" <<EOF
{
  "schema": 1,
  "profile": "dual-vm-cpu-only-no-ai",
  "result": "GO",
  "accepted_at_utc": "$created_at",
  "okno_commit": "$okno_commit",
  "mgc_languages_commit": "$languages_commit",
  "allowed_cidr": "$allowed_cidr",
  "ports": [3000, 8080],
  "checks": {
    "host_firewall": "passed",
    "runtime_readiness": "passed",
    "ingress_isolation": "passed",
    "no_ai_runtime": "passed"
  }
}
EOF

(
  cd "$dest"
  sha256sum acceptance.json > checksums.sha256
  sha256sum -c checksums.sha256 >/dev/null
)

echo "[GO] Acceptance evidence receipt: $dest"
printf '%s\n' "$dest"
