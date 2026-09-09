#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANG_ROOT="${MGC_LANGUAGES_PATH:-$ROOT/../mgc-languages}"
rc=0

need_docker() {
  command -v docker >/dev/null 2>&1 || { echo "[NO-GO] Docker is not installed or not in PATH." >&2; exit 1; }
  docker info >/dev/null 2>&1 || { echo "[NO-GO] Docker daemon is not running." >&2; exit 1; }
  docker compose version >/dev/null 2>&1 || { echo "[NO-GO] Docker Compose v2 is required." >&2; exit 1; }
}

env_value() {
  local file="$1" key="$2" default="$3" value=""
  if [[ -f "$file" ]]; then
    value="$(awk -F= -v k="$key" '$1==k{v=substr($0,index($0,"=")+1)} END{print v}' "$file")"
  fi
  printf '%s' "${value:-$default}"
}

container_health() {
  local cid="$1"
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || true
}

no_published_ports() {
  local cid="$1"
  [[ -n "$cid" ]] && [[ -z "$(docker port "$cid" 2>/dev/null || true)" ]]
}

need_docker

echo "=== Okno v Kitai VM ==="
if [[ ! -d "$ROOT" || ! -f "$ROOT/compose.yaml" || ! -f "$ROOT/compose.vm.yaml" ]]; then
  echo "[NO-GO] Okno VM files are missing: $ROOT"
  rc=1
elif [[ ! -f "$ROOT/.env.vm" ]]; then
  echo "[NO-GO] .env.vm is missing. Run START_BOTH_VM first."
  rc=1
else
  okno_port="$(env_value "$ROOT/.env.vm" APP_PORT 3000)"
  okno_cid="$(cd "$ROOT" && docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml ps -q china-auto-radar 2>/dev/null || true)"
  (cd "$ROOT" && docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml ps) || true
  if [[ -n "$okno_cid" ]]; then
    okno_health="$(container_health "$okno_cid")"
  else
    okno_health="not-running"
  fi
  if [[ "$okno_health" == "healthy" ]] && curl -fsS --max-time 5 "http://127.0.0.1:${okno_port}/api/ready" >/dev/null 2>&1; then
    echo "[GO] Okno v Kitai: healthy — http://127.0.0.1:${okno_port}"
  else
    echo "[NO-GO] Okno v Kitai: ${okno_health:-unknown}"
    rc=1
  fi
fi

echo ""
echo "=== MGC Languages VM ==="
if [[ ! -d "$LANG_ROOT" || ! -f "$LANG_ROOT/docker-compose.lan.yml" || ! -f "$LANG_ROOT/docker-compose.vm.yml" ]]; then
  echo "[NO-GO] MGC Languages was not found at: $LANG_ROOT"
  rc=1
elif [[ ! -f "$LANG_ROOT/.env.vm" ]]; then
  echo "[NO-GO] MGC Languages .env.vm is missing. Run START_BOTH_VM first."
  rc=1
else
  lang_port="$(env_value "$LANG_ROOT/.env.vm" MGC_PORT 8080)"
  lang_cid="$(cd "$LANG_ROOT" && docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml ps -q app 2>/dev/null || true)"
  lang_db_cid="$(cd "$LANG_ROOT" && docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml ps -q db 2>/dev/null || true)"
  lang_nginx_cid="$(cd "$LANG_ROOT" && docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml ps -q nginx 2>/dev/null || true)"
  (cd "$LANG_ROOT" && docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml ps) || true
  if [[ -n "$lang_cid" ]]; then
    lang_health="$(container_health "$lang_cid")"
  else
    lang_health="not-running"
  fi
  if [[ "$lang_health" == "healthy" ]] && curl -fsS --max-time 5 "http://127.0.0.1:${lang_port}/health/ready" >/dev/null 2>&1; then
    echo "[GO] MGC Languages: healthy — http://127.0.0.1:${lang_port}"
  else
    echo "[NO-GO] MGC Languages: ${lang_health:-unknown}"
    rc=1
  fi

  # The temporary LAN profile must expose only the hardened nginx edge.
  # The application and PostgreSQL remain reachable only on Docker networks.
  if [[ -z "$lang_db_cid" || -z "$lang_nginx_cid" ]]; then
    echo "[NO-GO] MGC Languages ingress isolation: app/db/nginx container set is incomplete."
    rc=1
  else
    nginx_readonly="$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$lang_nginx_cid" 2>/dev/null || true)"
    nginx_security="$(docker inspect --format '{{json .HostConfig.SecurityOpt}}' "$lang_nginx_cid" 2>/dev/null || true)"
    nginx_drop="$(docker inspect --format '{{json .HostConfig.CapDrop}}' "$lang_nginx_cid" 2>/dev/null || true)"
    nginx_add="$(docker inspect --format '{{json .HostConfig.CapAdd}}' "$lang_nginx_cid" 2>/dev/null || true)"
    nginx_ports="$(docker port "$lang_nginx_cid" 8080/tcp 2>/dev/null || true)"

    gateway_ok=1
    no_published_ports "$lang_cid" || gateway_ok=0
    no_published_ports "$lang_db_cid" || gateway_ok=0
    [[ "$nginx_readonly" == "true" ]] || gateway_ok=0
    [[ "$nginx_security" == *"no-new-privileges"* ]] || gateway_ok=0
    [[ "$nginx_drop" == *"ALL"* ]] || gateway_ok=0
    for capability in CHOWN SETGID SETUID; do
      [[ "$nginx_add" == *"$capability"* ]] || gateway_ok=0
    done
    if [[ "$nginx_add" =~ SYS_ADMIN|NET_ADMIN|SYS_PTRACE|DAC_OVERRIDE ]]; then gateway_ok=0; fi
    [[ "$nginx_ports" == *":${lang_port}"* ]] || gateway_ok=0

    if [[ "$gateway_ok" -eq 1 ]]; then
      echo "[GO] MGC Languages ingress isolation: only hardened nginx publishes LAN port ${lang_port}."
    else
      echo "[NO-GO] MGC Languages ingress isolation does not match the hardened VM contract."
      rc=1
    fi
  fi
fi

echo ""
if [[ "$rc" -eq 0 ]]; then
  echo "[GO] Both VM services are ready and ingress isolation is valid."
else
  echo "[NO-GO] At least one VM service needs attention."
fi
exit "$rc"
