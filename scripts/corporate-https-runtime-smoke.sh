#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for tool in docker openssl curl python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "ERROR: required tool is missing: $tool" >&2; exit 1; }
done
docker compose version >/dev/null

RUNTIME_DIR="$ROOT/.ci-runtime"
TLS_DIR="$RUNTIME_DIR/tls"
ENV_FILE="$RUNTIME_DIR/env.corporate"
OVERRIDE_FILE="$RUNTIME_DIR/compose.corporate.runtime-smoke.yaml"
HOST="china-ci.local"
HTTP_PORT="18080"
HTTPS_PORT="18443"
TLS_CERT="$TLS_DIR/tls.crt"
TLS_KEY="$TLS_DIR/tls.key"

rm -rf "$RUNTIME_DIR"
mkdir -p "$TLS_DIR"

compose() {
  docker compose --env-file "$ENV_FILE" -f compose.corporate.yaml -f "$OVERRIDE_FILE" "$@"
}

cleanup() {
  status=$?
  set +e
  if [[ -f "$ENV_FILE" && -f "$OVERRIDE_FILE" ]]; then
    if [[ $status -ne 0 ]]; then
      echo "--- corporate runtime smoke diagnostics ---" >&2
      compose ps >&2 || true
      compose logs --no-color --tail=200 china-auto-radar oauth2-proxy nginx >&2 || true
    fi
    compose down -v --remove-orphans >/dev/null 2>&1 || true
  fi
  rm -rf "$RUNTIME_DIR"
  trap - EXIT
  exit "$status"
}
trap cleanup EXIT

openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 1 \
  -keyout "$TLS_KEY" \
  -out "$TLS_CERT" \
  -subj "/CN=$HOST" \
  -addext "subjectAltName=DNS:$HOST" >/dev/null 2>&1
chmod 0600 "$TLS_KEY"
chmod 0644 "$TLS_CERT"

hex_secret() { openssl rand -hex 32; }
oidc_secret="$(hex_secret)"
auth_proxy_secret="$(hex_secret)"
audit_hmac_key="$(hex_secret)"
scheduler_token="$(hex_secret)"
user_data_hmac_key="$(hex_secret)"
metrics_token="$(hex_secret)"
oauth_cookie_secret="$(openssl rand -base64 32 | tr -d '\n')"

cat > "$ENV_FILE" <<EOF
APP_VERSION=1.7.9-pilot
CORPORATE_HOST=$HOST
CORPORATE_BIND_ADDRESS=127.0.0.1
CORPORATE_HTTP_PORT=$HTTP_PORT
CORPORATE_HTTPS_PORT=$HTTPS_PORT
TLS_CERT_FILE=$TLS_CERT
TLS_KEY_FILE=$TLS_KEY
OIDC_ISSUER_URL=https://oidc-ci.invalid
OIDC_CLIENT_ID=ci-client
OIDC_CLIENT_SECRET=${oidc_secret}
OIDC_SCOPE=openid profile email groups
OIDC_GROUPS_CLAIM=groups
SSO_ALLOWED_GROUP=okno-china-users
OAUTH2_PROXY_COOKIE_SECRET=${oauth_cookie_secret}
AUTH_PROXY_SECRET=${auth_proxy_secret}
AUDIT_HMAC_KEY=${audit_hmac_key}
SCHEDULER_TOKEN=${scheduler_token}
USER_DATA_HMAC_KEY=${user_data_hmac_key}
METRICS_TOKEN=${metrics_token}
AUTH_ADMIN_GROUP=okno-china-admin
AUTH_EDITOR_GROUP=okno-china-editor
RAG_API_URL=
RAG_API_KEY=
RAG_MODEL=
SCHEDULER_INTERVAL_SECONDS=3600
NEWS_SOURCE_CONCURRENCY=1
EOF
chmod 0600 "$ENV_FILE"

# A deterministic local IdP boundary for CI. Production still uses the pinned
# oauth2-proxy image and the real corporate OIDC provider; static security tests
# verify that contract. This mock lets CI exercise nginx auth_request, trusted
# identity-header rewriting, TLS termination and the application itself without
# sending CI traffic or credentials to an external identity provider.
cat > "$OVERRIDE_FILE" <<'EOF'
services:
  oauth2-proxy:
    image: python:3.12-alpine
    environment:
      PYTHONDONTWRITEBYTECODE: "1"
    entrypoint: ["python", "-u", "-c"]
    command:
      - |
        from http.server import BaseHTTPRequestHandler, HTTPServer

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, fmt, *args):
                return

            def do_GET(self):
                if self.path.startswith('/oauth2/ping'):
                    self.send_response(200)
                    self.send_header('Content-Length', '0')
                    self.end_headers()
                    return
                if self.path.startswith('/oauth2/auth'):
                    self.send_response(202)
                    self.send_header('X-Auth-Request-User', 'ci-user')
                    self.send_header('X-Auth-Request-Email', 'ci-user@mgc.invalid')
                    self.send_header('X-Auth-Request-Groups', 'okno-china-users,okno-china-admin')
                    self.send_header('Content-Length', '0')
                    self.end_headers()
                    return
                self.send_response(404)
                self.send_header('Content-Length', '0')
                self.end_headers()

        HTTPServer(('0.0.0.0', 4180), Handler).serve_forever()
EOF
chmod 0600 "$OVERRIDE_FILE"

compose config >/dev/null
compose pull nginx oauth2-proxy >/dev/null
compose build china-auto-radar
compose up -d --no-build china-auto-radar oauth2-proxy nginx

nginx_id="$(compose ps -q nginx)"
[[ -n "$nginx_id" ]] || { echo "ERROR: corporate nginx container was not created" >&2; exit 1; }

healthy="false"
for _ in $(seq 1 90); do
  state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$nginx_id" 2>/dev/null || true)"
  if [[ "$state" == "healthy" ]]; then
    healthy="true"
    break
  fi
  if [[ "$state" == "unhealthy" || "$state" == "exited" || "$state" == "dead" ]]; then
    echo "ERROR: corporate nginx entered state: $state" >&2
    exit 1
  fi
  sleep 2
done
[[ "$healthy" == "true" ]] || { echo "ERROR: corporate nginx did not become healthy within 180 seconds" >&2; exit 1; }

https_get() {
  curl --silent --show-error --fail \
    --cacert "$TLS_CERT" \
    --resolve "$HOST:$HTTPS_PORT:127.0.0.1" \
    "https://$HOST:$HTTPS_PORT$1" "${@:2}"
}

ready_json="$(https_get /readyz)"
READY_JSON="$ready_json" python3 -c 'import json, os; d=json.loads(os.environ["READY_JSON"]); assert d["status"] == "ready"; assert d["checks"]["runtimeDataWritable"] is True; assert d["checks"]["sqliteAvailable"] is True; assert d["checks"]["migrationsCurrent"] is True'
echo "PASS: HTTPS readiness reached the live application and SQLite runtime"

session_json="$(https_get /api/session -H 'X-Forwarded-User: attacker' -H 'X-Forwarded-Groups: attacker-admin')"
SESSION_JSON="$session_json" python3 -c 'import json, os; d=json.loads(os.environ["SESSION_JSON"]); assert d["authenticated"] is True; assert d["subject"] == "ci-user"; assert d["role"] == "admin"; assert d["mode"] == "proxy"; assert "okno-china-users" in d["groups"]'
echo "PASS: auth_request identity reached the app and client spoofed identity was overwritten"

metrics_code="$(curl --silent --output /dev/null --write-out '%{http_code}' --cacert "$TLS_CERT" --resolve "$HOST:$HTTPS_PORT:127.0.0.1" "https://$HOST:$HTTPS_PORT/api/metrics")"
[[ "$metrics_code" == "404" ]] || { echo "ERROR: user-facing metrics endpoint returned HTTP $metrics_code" >&2; exit 1; }
echo "PASS: metrics remain hidden from corporate ingress"

http_code="$(curl --silent --output /dev/null --write-out '%{http_code}' --resolve "$HOST:$HTTP_PORT:127.0.0.1" "http://$HOST:$HTTP_PORT/")"
[[ "$http_code" == "308" ]] || { echo "ERROR: HTTP ingress did not redirect to HTTPS (HTTP $http_code)" >&2; exit 1; }
echo "PASS: HTTP ingress redirects to HTTPS"

app_id="$(compose ps -q china-auto-radar)"
[[ -n "$app_id" ]] || { echo "ERROR: application container was not created" >&2; exit 1; }
[[ -z "$(docker port "$app_id" 2>/dev/null)" ]] || { echo "ERROR: application published a direct host port" >&2; exit 1; }

oauth_id="$(compose ps -q oauth2-proxy)"
[[ -n "$oauth_id" ]] || { echo "ERROR: auth boundary container was not created" >&2; exit 1; }
[[ -z "$(docker port "$oauth_id" 2>/dev/null)" ]] || { echo "ERROR: auth boundary published a direct host port" >&2; exit 1; }
echo "PASS: only the hardened nginx ingress is host-reachable"

echo "PASS: corporate HTTPS runtime smoke completed"
