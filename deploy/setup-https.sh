#!/usr/bin/env bash
# One-shot HTTPS for creed20.tech on Timeweb VPS.
# Prerequisites: DNS A → this host; repo at /opt/dvarf with ports 127.0.0.1:8080:80.
# Run as root on the VPS.
set -euo pipefail

DOMAIN_APEX="${DVARF_DOMAIN:-creed20.tech}"
DOMAIN_WWW="www.${DOMAIN_APEX}"
EMAIL="${DVARF_CERT_EMAIL:-info@creed20.tech}"
ROOT_DIR="${DVARF_ROOT:-/opt/dvarf}"
CONF_SRC="${ROOT_DIR}/deploy/host-nginx-creed20.conf"
SITE_AVAIL="/etc/nginx/sites-available/creed20"
SITE_EN="/etc/nginx/sites-enabled/creed20"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

rm -f /etc/nginx/sites-enabled/default

if [[ ! -f "$CONF_SRC" ]]; then
  echo "missing $CONF_SRC — sync deploy tree first" >&2
  exit 1
fi

cat >/etc/nginx/conf.d/dvarf-upgrade-map.conf <<'EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
EOF

cp "$CONF_SRC" "$SITE_AVAIL"
ln -sfn "$SITE_AVAIL" "$SITE_EN"

# Ensure docker web is on loopback :8080 (not public :80)
cd "$ROOT_DIR"
if grep -qE '^\s*-\s*"80:80"' docker-compose.prod.yml 2>/dev/null; then
  echo "FAIL: docker-compose still publishes 80:80 — deploy tip with 127.0.0.1:8080:80 first" >&2
  exit 1
fi

# If something else still owns :80 (old container), free it
if ss -tlnp | grep -q ':80 '; then
  if docker ps --format '{{.Names}} {{.Ports}}' | grep -q 'dvarf-web.*0.0.0.0:80'; then
    docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate --no-deps web
    sleep 2
  fi
fi

nginx -t
systemctl enable --now nginx
systemctl reload nginx

# Quick proxy smoke before certbot
curl -fsS -o /dev/null "http://127.0.0.1/health" || {
  echo "host nginx → :8080 health failed" >&2
  exit 1
}

certbot --nginx \
  -d "$DOMAIN_APEX" \
  -d "$DOMAIN_WWW" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL" \
  --redirect \
  --keep-until-expiring

nginx -t
systemctl reload nginx

# Point app URL / CORS at HTTPS (keep IP for old bookmarks)
ENV_FILE="${ROOT_DIR}/.env"
if [[ -f "$ENV_FILE" ]]; then
  touch "${ENV_FILE}.bak.https"
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
curl -sS -o /dev/null -w "https_health:%{http_code}\n" "https://${DOMAIN_APEX}/health" || true
curl -sS -o /dev/null -w "http_apex:%{http_code} redirect=%{redirect_url}\n" "http://${DOMAIN_APEX}/" || true
