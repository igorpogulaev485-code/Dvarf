#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DVARF_HOST:-201.34.132.252}"
KEY="${DVARF_SSH_KEY:-$HOME/.ssh/dvarf_timeweb}"
REMOTE_DIR="${DVARF_REMOTE_DIR:-/opt/dvarf}"

# Anti-overwrite: refuse to ship a thin branch that would wipe prod contours.
# See AGENTS.md and .cursor/skills/dvarf-prod-lineage/SKILL.md
bash "$ROOT/deploy/preflight-prod.sh"

# One shared key for all Cloud Agents: put private key in Cursor secret
# DVARF_SSH_PRIVATE_KEY (full PEM). Matching pubkey stays on the VPS.
if [[ ! -f "$KEY" && -n "${DVARF_SSH_PRIVATE_KEY:-}" ]]; then
  mkdir -p "$(dirname "$KEY")"
  chmod 700 "$(dirname "$KEY")"
  printf '%s\n' "$DVARF_SSH_PRIVATE_KEY" > "$KEY"
  chmod 600 "$KEY"
fi

if [[ ! -f "$KEY" ]]; then
  echo "SSH key not found: $KEY" >&2
  echo "Set Cursor secret DVARF_SSH_PRIVATE_KEY or file DVARF_SSH_KEY." >&2
  exit 1
fi

SSH=(ssh -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
SCP=(scp -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)

TMP_TGZ="$(mktemp /tmp/dvarf-deploy.XXXXXX.tgz)"
cleanup() { rm -f "$TMP_TGZ"; }
trap cleanup EXIT

tar czf "$TMP_TGZ" -C "$ROOT" \
  --exclude='.git' \
  --exclude='frontend/node_modules' \
  --exclude='frontend/dist' \
  --exclude='backend/.venv' \
  --exclude='.env' \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  .

"${SCP[@]}" "$TMP_TGZ" "root@${HOST}:/tmp/dvarf-deploy.tgz"

"${SSH[@]}" "root@${HOST}" bash -s <<EOF
set -euo pipefail
mkdir -p ${REMOTE_DIR}
if [[ -f ${REMOTE_DIR}/.env ]]; then
  cp ${REMOTE_DIR}/.env /tmp/dvarf.env.bak
fi
# Replace tree but keep .env
find ${REMOTE_DIR} -mindepth 1 -maxdepth 1 ! -name '.env' -exec rm -rf {} +
tar xzf /tmp/dvarf-deploy.tgz -C ${REMOTE_DIR}
if [[ -f /tmp/dvarf.env.bak ]]; then
  mv /tmp/dvarf.env.bak ${REMOTE_DIR}/.env
  chmod 600 ${REMOTE_DIR}/.env
fi
cd ${REMOTE_DIR}
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
# nginx/api may need a moment after recreate
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1/health; then
    echo
    exit 0
  fi
  sleep 2
done
echo "health check failed" >&2
exit 1
EOF

echo "Deployed: http://${HOST}/"
