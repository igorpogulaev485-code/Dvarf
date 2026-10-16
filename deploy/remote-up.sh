#!/usr/bin/env bash
# Runs on the Timeweb VPS after sync-and-up extracts the tree.
# Fast/resilient compose: no Hub refresh on every release, rebuild only when
# fingerprints change, hard time-box, BuildKit → legacy fallback.
set -euo pipefail

REMOTE_DIR="${DVARF_REMOTE_DIR:-/opt/dvarf}"
STATE_DIR="${DVARF_STATE_DIR:-/var/lib/dvarf}"
BUILD_TIMEOUT="${DVARF_BUILD_TIMEOUT:-480}"
COMPOSE_FILE="${REMOTE_DIR}/docker-compose.prod.yml"
ENV_FILE="${REMOTE_DIR}/.env"
FINGERPRINTS="${STATE_DIR}/deploy-fingerprints"
WEB_DOCKERFILE="${DVARF_FRONTEND_DOCKERFILE:-Dockerfile}"

cd "$REMOTE_DIR"
mkdir -p "$STATE_DIR"

COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

fingerprint() {
  tar -C "$REMOTE_DIR" -cf - "$@" 2>/dev/null | sha256sum | awk '{print $1}'
}

load_fp() {
  local key="$1"
  [[ -f "$FINGERPRINTS" ]] || return 0
  awk -F= -v k="$key" '$1==k {print $2; exit}' "$FINGERPRINTS"
}

save_fp() {
  local key="$1" val="$2"
  touch "$FINGERPRINTS"
  if grep -q "^${key}=" "$FINGERPRINTS" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$FINGERPRINTS"
  else
    echo "${key}=${val}" >>"$FINGERPRINTS"
  fi
}

image_exists() {
  docker image inspect "$1" >/dev/null 2>&1
}

ensure_base() {
  local img="$1"
  if image_exists "$img"; then
    echo "base ok: $img"
    return 0
  fi
  echo "pulling base: $img (timeout 180s)"
  if ! timeout 180 docker pull "$img"; then
    echo "ERROR: docker pull timed out/failed for $img" >&2
    return 1
  fi
}

# BuildKit session flakes ("only one connection allowed") leave huge reclaimable
# cache and correlate with multi-minute stalls — trim when oversized.
if docker builder du >/dev/null 2>&1; then
  reclaim_mb="$(
    docker builder du 2>/dev/null | awk '
      /Reclaimable:/ {
        val=$2
        if (val ~ /GB/) { gsub(/[^0-9.]/,"",val); print int(val*1024); exit }
        if (val ~ /MB/) { gsub(/[^0-9.]/,"",val); print int(val); exit }
        print 0; exit
      }'
  )"
  reclaim_mb="${reclaim_mb:-0}"
  if [[ "$reclaim_mb" =~ ^[0-9]+$ ]] && [[ "$reclaim_mb" -gt 2048 ]]; then
    echo "pruning build cache (~${reclaim_mb}MB reclaimable)..."
    docker builder prune -f --filter until=48h >/dev/null || true
  fi
fi

if [[ ! -f "$REMOTE_DIR/frontend/$WEB_DOCKERFILE" ]]; then
  echo "ERROR: frontend/$WEB_DOCKERFILE missing" >&2
  exit 1
fi
if [[ "$WEB_DOCKERFILE" == "Dockerfile" && ! -d "$REMOTE_DIR/frontend/dist" ]]; then
  echo "ERROR: frontend/dist missing — sync-and-up must prebuild the SPA on the agent" >&2
  exit 1
fi

# Temporarily use Dockerfile.full when requested (compose always reads Dockerfile).
restore_web_dockerfile() {
  if [[ -f "$REMOTE_DIR/frontend/Dockerfile.prebuilt.bak" ]]; then
    mv "$REMOTE_DIR/frontend/Dockerfile.prebuilt.bak" "$REMOTE_DIR/frontend/Dockerfile"
  fi
}
trap restore_web_dockerfile EXIT

if [[ "$WEB_DOCKERFILE" != "Dockerfile" ]]; then
  cp "$REMOTE_DIR/frontend/Dockerfile" "$REMOTE_DIR/frontend/Dockerfile.prebuilt.bak"
  cp "$REMOTE_DIR/frontend/$WEB_DOCKERFILE" "$REMOTE_DIR/frontend/Dockerfile"
fi

API_FP="$(fingerprint backend/Dockerfile backend/requirements.txt backend/alembic.ini backend/app backend/alembic backend/data)"
if [[ "$WEB_DOCKERFILE" == "Dockerfile" ]]; then
  WEB_FP="$(fingerprint frontend/Dockerfile frontend/nginx.conf frontend/dist)"
else
  WEB_FP="$(fingerprint frontend/Dockerfile frontend/nginx.conf frontend/package.json frontend/package-lock.json frontend/src frontend/index.html frontend/vite.config.ts frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/public)"
fi
OLD_API="$(load_fp api || true)"
OLD_WEB="$(load_fp web || true)"

BUILD_SERVICES=()
if ! image_exists dvarf-api:latest || [[ "$API_FP" != "$OLD_API" ]]; then
  BUILD_SERVICES+=(api)
else
  echo "skip rebuild api (fingerprint unchanged)"
fi
if ! image_exists dvarf-web:latest || [[ "$WEB_FP" != "$OLD_WEB" ]]; then
  BUILD_SERVICES+=(web)
else
  echo "skip rebuild web (fingerprint unchanged)"
fi

ensure_base postgres:16-alpine
if [[ ${#BUILD_SERVICES[@]} -gt 0 ]]; then
  if [[ " ${BUILD_SERVICES[*]} " == *" api "* ]]; then
    ensure_base python:3.12-slim
  fi
  if [[ " ${BUILD_SERVICES[*]} " == *" web "* ]]; then
    ensure_base nginx:1.27-alpine
    if [[ "$WEB_DOCKERFILE" != "Dockerfile" ]]; then
      ensure_base node:22-alpine
    fi
  fi
fi

compose_build() {
  local bk="$1"
  shift
  timeout "$BUILD_TIMEOUT" env DOCKER_BUILDKIT="$bk" COMPOSE_DOCKER_CLI_BUILD="$bk" \
    "${COMPOSE[@]}" build --pull=false "$@"
}

if [[ ${#BUILD_SERVICES[@]} -gt 0 ]]; then
  echo "building: ${BUILD_SERVICES[*]} (timeout ${BUILD_TIMEOUT}s)"
  # Prefer legacy builder first: BuildKit on this VPS often stalls with
  # "only one connection allowed" / session healthcheck failures (multi-minute hangs).
  if ! compose_build 0 "${BUILD_SERVICES[@]}"; then
    echo "legacy builder failed/timed out — retrying with BuildKit..." >&2
    if ! compose_build 1 "${BUILD_SERVICES[@]}"; then
      echo "ERROR: docker compose build failed for: ${BUILD_SERVICES[*]}" >&2
      exit 1
    fi
  fi
else
  echo "no image rebuild needed"
fi

echo "starting stack (no pull)..."
"${COMPOSE[@]}" up -d --pull never --remove-orphans

save_fp api "$API_FP"
save_fp web "$WEB_FP"

for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -fsS http://127.0.0.1/health; then
    echo
    echo "remote-up: healthy"
    exit 0
  fi
  sleep 2
done

echo "health check failed" >&2
"${COMPOSE[@]}" ps >&2 || true
exit 1
