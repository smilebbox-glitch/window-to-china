#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE=.env.vm
ENV_EXAMPLE=.env.vm.example
COMPOSE="docker compose --env-file $ENV_FILE -f compose.yaml -f compose.vm.yaml"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[NO-GO] Required command not found: $1" >&2; exit 1; }
}

random_hex() {
  od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
}

set_env() {
  key="$1"
  value="$2"
  tmp="${ENV_FILE}.tmp.$$"
  awk -v k="$key" -v v="$value" 'BEGIN{done=0} index($0,k"=")==1 {print k"="v; done=1; next} {print} END{if(!done) print k"="v}' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

need docker

docker info >/dev/null 2>&1 || { echo "[NO-GO] Docker daemon is not running." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "[NO-GO] Docker Compose v2 is required." >&2; exit 1; }

if [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  set_env ADMIN_API_TOKEN "$(random_hex)"
  set_env SCHEDULER_TOKEN "$(random_hex)"
  set_env USER_DATA_HMAC_KEY "$(random_hex)"
  set_env AUDIT_HMAC_KEY "$(random_hex)"
  chmod 600 "$ENV_FILE" 2>/dev/null || true
  echo "Created $ENV_FILE with generated local secrets."
fi

echo "Validating CPU-only / no-AI VM configuration..."
$COMPOSE config >/dev/null

echo "Building Okno v Kitai..."
$COMPOSE build

echo "Starting Okno v Kitai..."
$COMPOSE up -d

CID="$($COMPOSE ps -q china-auto-radar)"
[ -n "$CID" ] || { echo "[NO-GO] Web container was not created." >&2; exit 1; }

i=0
while [ "$i" -lt 90 ]; do
  STATUS="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CID" 2>/dev/null || true)"
  [ "$STATUS" = healthy ] && break
  case "$STATUS" in exited|dead) $COMPOSE logs --tail=120 china-auto-radar; exit 1;; esac
  i=$((i+1))
  sleep 2
done

[ "${STATUS:-}" = healthy ] || { $COMPOSE logs --tail=120 china-auto-radar; echo "[NO-GO] Application did not become healthy." >&2; exit 1; }

PORT="$(awk -F= '$1=="APP_PORT"{v=$2} END{print v}' "$ENV_FILE")"
[ -n "$PORT" ] || PORT=3000
IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"

echo ""
echo "[GO] Okno v Kitai VM is ready (CPU-only, generative AI disabled)."
echo "Local: http://127.0.0.1:$PORT"
[ -n "$IP" ] && echo "LAN:   http://$IP:$PORT"
echo "Stop:  docker compose --env-file $ENV_FILE -f compose.yaml -f compose.vm.yaml down"
