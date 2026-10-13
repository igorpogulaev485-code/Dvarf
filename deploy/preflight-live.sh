#!/usr/bin/env bash
# Live guards before wiping /opt/dvarf.
# 1) HEAD must contain the tip that is ON THE SERVER (not a stale AGENTS copy).
# 2) Prod DB alembic revision must exist in this tree (else API dies on upgrade).
# 3) Refuse to downgrade away from fast remote-up if live already has it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DVARF_HOST:-201.34.132.252}"
KEY="${DVARF_SSH_KEY:-$HOME/.ssh/dvarf_timeweb}"
REMOTE_DIR="${DVARF_REMOTE_DIR:-/opt/dvarf}"

if [[ "${DVARF_SKIP_PREFLIGHT:-}" == "1" ]]; then
  echo "preflight-live: SKIPPED (DVARF_SKIP_PREFLIGHT=1)" >&2
  exit 0
fi
if [[ "${DVARF_SKIP_LIVE_PREFLIGHT:-}" == "1" ]]; then
  echo "preflight-live: SKIPPED (DVARF_SKIP_LIVE_PREFLIGHT=1) — only with explicit Игорь ok" >&2
  exit 0
fi

if [[ ! -f "$KEY" ]]; then
  echo "preflight-live: SSH key missing: $KEY" >&2
  exit 1
fi

SSH=(ssh -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20)

echo "=== Dvarf LIVE preflight (tip ancestry + alembic) ==="
echo "host: $HOST"
echo

LIVE_BLOB="$("${SSH[@]}" "root@${HOST}" bash -s <<EOF
set -euo pipefail
TIP=""
if [[ -f ${REMOTE_DIR}/AGENTS.md ]]; then
  TIP=\$(sed -n 's/.*Prod tip (сейчас)[[:space:]]*|[[:space:]]*\`\\([^\`]*\\)\`.*/\\1/p' ${REMOTE_DIR}/AGENTS.md | head -1)
fi
if [[ -z "\$TIP" && -f ${REMOTE_DIR}/PRODUCT_STATUS.md ]]; then
  TIP=\$(sed -n 's/.*Prod tip (ветка линии прода):\*\*[[:space:]]*\`\\([^\`]*\\)\`.*/\\1/p' ${REMOTE_DIR}/PRODUCT_STATUS.md | head -1)
fi
DB_REV=""
if docker exec dvarf-api alembic current >/tmp/dvarf-alembic-current.txt 2>/tmp/dvarf-alembic-current.err; then
  DB_REV=\$(awk '/^[a-zA-Z0-9_]+/ {print \$1; exit}' /tmp/dvarf-alembic-current.txt)
fi
if [[ -z "\$DB_REV" ]]; then
  DB_REV=\$(docker exec dvarf-db psql -U "\${POSTGRES_USER:-dvarf}" -d "\${POSTGRES_DB:-dvarf}" -tAc 'select version_num from alembic_version' 2>/dev/null | tr -d '[:space:]' || true)
fi
HAS_REMOTE_UP=0
[[ -f ${REMOTE_DIR}/deploy/remote-up.sh ]] && HAS_REMOTE_UP=1
HAS_NODE_DOCKERFILE=0
if [[ -f ${REMOTE_DIR}/frontend/Dockerfile ]] && head -n 5 ${REMOTE_DIR}/frontend/Dockerfile | grep -qiE 'FROM[[:space:]]+node'; then
  HAS_NODE_DOCKERFILE=1
fi
printf 'TIP=%s\n' "\$TIP"
printf 'DB_REV=%s\n' "\$DB_REV"
printf 'HAS_REMOTE_UP=%s\n' "\$HAS_REMOTE_UP"
printf 'HAS_NODE_DOCKERFILE=%s\n' "\$HAS_NODE_DOCKERFILE"
EOF
)"

LIVE_TIP="$(printf '%s\n' "$LIVE_BLOB" | sed -n 's/^TIP=//p' | head -1)"
DB_REV="$(printf '%s\n' "$LIVE_BLOB" | sed -n 's/^DB_REV=//p' | head -1)"
HAS_REMOTE_UP="$(printf '%s\n' "$LIVE_BLOB" | sed -n 's/^HAS_REMOTE_UP=//p' | head -1)"
HAS_NODE_DOCKERFILE="$(printf '%s\n' "$LIVE_BLOB" | sed -n 's/^HAS_NODE_DOCKERFILE=//p' | head -1)"

echo "live tip: ${LIVE_TIP:-<empty>}"
echo "live alembic: ${DB_REV:-<empty>}"
echo "live has remote-up: ${HAS_REMOTE_UP:-0}"

FAILED=0

# --- Tip ancestry (git) ---
if [[ -z "${LIVE_TIP}" ]]; then
  echo "WARN: could not read live Prod tip from server AGENTS.md — ancestry check skipped" >&2
else
  if [[ ! -d "$ROOT/.git" ]]; then
    echo "WARN: no .git in tree — cannot verify ancestry vs live tip ${LIVE_TIP}" >&2
  else
    git -C "$ROOT" fetch origin "$LIVE_TIP" 2>/dev/null || git -C "$ROOT" fetch origin "refs/heads/${LIVE_TIP}:refs/remotes/origin/${LIVE_TIP}" 2>/dev/null || true
    if git -C "$ROOT" rev-parse --verify "origin/${LIVE_TIP}" >/dev/null 2>&1; then
      if git -C "$ROOT" merge-base --is-ancestor "origin/${LIVE_TIP}" HEAD; then
        echo "ok: origin/${LIVE_TIP} is ancestor of HEAD"
      else
        MB="$(git -C "$ROOT" merge-base "origin/${LIVE_TIP}" HEAD 2>/dev/null || true)"
        echo "FAIL: live tip origin/${LIVE_TIP} is NOT an ancestor of HEAD (merge-base='${MB:-empty}')." >&2
        echo "       Истории оторваны / orphan / cherry-pick сшивка. Деплой запрещён." >&2
        echo "       Сделай: git fetch origin && git merge origin/${LIVE_TIP}" >&2
        echo "       НЕ собирай deploy-ветку cherry-pick'ами мимо tip." >&2
        FAILED=1
      fi
    else
      echo "WARN: origin/${LIVE_TIP} not fetchable — ancestry check skipped" >&2
    fi
  fi
fi

# --- Alembic: DB revision must exist in this tree ---
if [[ -z "${DB_REV}" ]]; then
  echo "WARN: could not read alembic_version from live DB — migration guard skipped" >&2
else
  if grep -RhoE '^revision[[:space:]]*(:[[:space:]]*str)?[[:space:]]*=[[:space:]]*[\"'"'"'][a-zA-Z0-9_]+[\"'"'"']' \
      "$ROOT/backend/alembic/versions" 2>/dev/null \
    | grep -qE "[\"'"'"']${DB_REV}[\"'"'"']"; then
    echo "ok: live DB revision ${DB_REV} exists in backend/alembic/versions"
  else
    echo "FAIL: live DB alembic=${DB_REV}, but this tree has no such revision." >&2
    echo "       API упадёт на старте (alembic upgrade). Подтяни миграцию с tip / из ветки, где она есть:" >&2
    echo "       git fetch origin && git checkout origin/<tip> -- backend/alembic/versions/*${DB_REV}*" >&2
    FAILED=1
  fi
fi

# --- Do not drop fast path if we already restored it; always require local remote-up ---
if [[ ! -f "$ROOT/deploy/remote-up.sh" ]]; then
  echo "FAIL: deploy/remote-up.sh missing in tree — slow/hanging VPS builds will return" >&2
  FAILED=1
fi

# If live still on node Dockerfile and we also ship node Dockerfile — warn loudly
if [[ "${HAS_NODE_DOCKERFILE}" == "1" ]] && head -n 5 "$ROOT/frontend/Dockerfile" | grep -qiE 'FROM[[:space:]]+node'; then
  echo "FAIL: both live and local frontend/Dockerfile use node on VPS — hour-long releases." >&2
  FAILED=1
fi

if [[ "$FAILED" -ne 0 ]]; then
  cat >&2 <<'EOF'

LIVE PREFLIGHT FAILED — деплой остановлен до затирания /opt/dvarf.

Типичный антипаттерн из провальных релизов:
  • пустой merge-base с tip → агент час cherry-pick'ает
  • в БД alembic X, в залитой ветке X нет → API падает
  • docker compose --build на VPS → Hub/BuildKit висит 27+ минут

Обход только с явного ok Игоря:
  DVARF_SKIP_LIVE_PREFLIGHT=1 ./deploy/sync-and-up.sh
EOF
  exit 1
fi

echo
echo "LIVE PREFLIGHT OK"
