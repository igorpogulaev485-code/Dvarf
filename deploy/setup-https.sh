#!/usr/bin/env bash
# Finish HTTPS after tip with Caddy `edge` is deployed.
# (Caddy obtains Let’s Encrypt itself — no host apt/nginx.)
set -euo pipefail

DOMAIN_APEX="${DVARF_DOMAIN:-creed20.tech}"
ROOT_DIR="${DVARF_ROOT:-/opt/dvarf}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ ! -f deploy/Caddyfile ]]; then
  echo "missing deploy/Caddyfile" >&2
  exit 1
fi

docker compose -f docker-compose.prod.yml --env-file .env up -d edge

# Wait for Caddy to finish ACME (first boot can take ~30–90s)
ok=0
for _ in $(seq 1 40); do
  if curl -fsSk -o /dev/null "https://${DOMAIN_APEX}/health"; then
    ok=1
    break
  fi
  sleep 3
done

if [[ "$ok" -ne 1 ]]; then
  echo "HTTPS not ready yet — check: docker logs dvarf-edge" >&2
  docker logs dvarf-edge 2>&1 | tail -40 >&2 || true
  exit 1
fi

ENV_FILE="${ROOT_DIR}/.env"
if [[ -f "$ENV_FILE" ]]; then
  cp -a "$ENV_FILE" "${ENV_FILE}.bak.https"
  if grep -q '^APP_PUBLIC_URL=' "$ENV_FILE"; then
    sed -i "s|^APP_PUBLIC_URL=.*|APP_PUBLIC_URL=https://${DOMAIN_APEX}|" "$ENV_FILE"
  else
    echo "APP_PUBLIC_URL=https://${DOMAIN_APEX}" >>"$ENV_FILE"
  fi
  if grep -q '^CORS_ORIGINS=' "$ENV_FILE"; then
    sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=https://${DOMAIN_APEX},http://${DOMAIN_APEX},http://201.34.132.252|" "$ENV_FILE"
  else
    echo "CORS_ORIGINS=https://${DOMAIN_APEX},http://${DOMAIN_APEX},http://201.34.132.252" >>"$ENV_FILE"
  fi
  docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate --no-deps api
fi

echo "HTTPS ok — https://${DOMAIN_APEX}/"
curl -sS -o /dev/null -w "https_health:%{http_code}\n" "https://${DOMAIN_APEX}/health"
curl -sS -o /dev/null -w "http_redirect:%{http_code}\n" "http://${DOMAIN_APEX}/health" || true
