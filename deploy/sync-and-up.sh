#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DVARF_HOST:-201.34.132.252}"
KEY="${DVARF_SSH_KEY:-$HOME/.ssh/dvarf_timeweb}"
REMOTE_DIR="${DVARF_REMOTE_DIR:-/opt/dvarf}"

# Anti-overwrite: refuse to ship a thin branch that would wipe prod contours.
# See AGENTS.md and .cursor/skills/dvarf-prod-lineage/SKILL.md
bash "$ROOT/deploy/preflight-prod.sh"

# One shared key for all Cloud Agents: Cursor secret DVARF_SSH_PRIVATE_KEY.
# Accepts full OpenSSH PEM OR raw base64 body of openssh-key-v1 (without headers).
if [[ ! -f "$KEY" && -n "${DVARF_SSH_PRIVATE_KEY:-}" ]]; then
  mkdir -p "$(dirname "$KEY")"
  chmod 700 "$(dirname "$KEY")"
  python3 - "$KEY" <<'PY'
import os, sys, base64, pathlib
raw = os.environ.get("DVARF_SSH_PRIVATE_KEY", "").strip().strip('"').strip("'")
path = pathlib.Path(sys.argv[1])
if "BEGIN" in raw:
    text = raw if raw.endswith("\n") else raw + "\n"
else:
    body = "".join(raw.split())
    pad = (-len(body)) % 4
    decoded = base64.b64decode(body + ("=" * pad))
    if not decoded.startswith(b"openssh-key-v1"):
        raise SystemExit("DVARF_SSH_PRIVATE_KEY is not an OpenSSH private key")
    b64 = base64.encodebytes(decoded).decode("ascii")
    text = (
        "-----BEGIN OPENSSH PRIVATE KEY-----\n"
        + b64
        + "-----END OPENSSH PRIVATE KEY-----\n"
    )
path.write_text(text)
path.chmod(0o600)
PY
fi

if [[ ! -f "$KEY" ]]; then
  echo "SSH key not found: $KEY" >&2
  echo "Set Cursor secret DVARF_SSH_PRIVATE_KEY or file DVARF_SSH_KEY." >&2
  exit 1
fi

# Live tip ancestry + alembic vs prod DB — before we wipe the server tree.
bash "$ROOT/deploy/preflight-live.sh"

# Prebuild SPA on the agent (good network/CPU). VPS only packs nginx+dist.
# Skip with DVARF_SKIP_FRONTEND_BUILD=1 if frontend/dist is already fresh.
# Emergency full in-Docker build on VPS: DVARF_FRONTEND_DOCKERFILE=Dockerfile.full
prebuild_frontend() {
  if [[ "${DVARF_FRONTEND_DOCKERFILE:-Dockerfile}" == "Dockerfile.full" ]]; then
    echo "prebuild: skipped (Dockerfile.full — build on VPS)"
    return 0
  fi
  if [[ "${DVARF_SKIP_FRONTEND_BUILD:-}" == "1" ]]; then
    if [[ ! -f "$ROOT/frontend/dist/index.html" ]]; then
      echo "DVARF_SKIP_FRONTEND_BUILD=1 but frontend/dist/index.html missing" >&2
      exit 1
    fi
    echo "prebuild: using existing frontend/dist"
    return 0
  fi
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found — cannot prebuild frontend. Install Node or set DVARF_FRONTEND_DOCKERFILE=Dockerfile.full" >&2
    exit 1
  fi
  echo "prebuild: npm ci + npm run build (frontend)"
  (
    cd "$ROOT/frontend"
    npm ci
    npm run build
  )
  [[ -f "$ROOT/frontend/dist/index.html" ]] || {
    echo "frontend build produced no dist/index.html" >&2
    exit 1
  }
}

prebuild_frontend

SSH=(ssh -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
SCP=(scp -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)

TMP_TGZ="$(mktemp /tmp/dvarf-deploy.XXXXXX.tgz)"
cleanup() { rm -f "$TMP_TGZ"; }
trap cleanup EXIT

# Include frontend/dist (prebuilt). Still exclude node_modules / .git / local .env.
tar czf "$TMP_TGZ" -C "$ROOT" \
  --exclude='.git' \
  --exclude='frontend/node_modules' \
  --exclude='backend/.venv' \
  --exclude='.env' \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  .

"${SCP[@]}" "$TMP_TGZ" "root@${HOST}:/tmp/dvarf-deploy.tgz"

REMOTE_ENV=(
  "DVARF_REMOTE_DIR=${REMOTE_DIR}"
  "DVARF_BUILD_TIMEOUT=${DVARF_BUILD_TIMEOUT:-480}"
  "DVARF_FRONTEND_DOCKERFILE=${DVARF_FRONTEND_DOCKERFILE:-Dockerfile}"
)

"${SSH[@]}" "root@${HOST}" env "${REMOTE_ENV[@]}" bash -s <<EOF
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
chmod +x ${REMOTE_DIR}/deploy/*.sh
bash ${REMOTE_DIR}/deploy/remote-up.sh
EOF

echo "Deployed: http://${HOST}/"
