#!/usr/bin/env bash
# Доставка дерева на Timeweb из GitHub Actions.
# Не печатает секреты, не удаляет /opt/dvarf целиком, не затирает .env и данные.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Пустой секрет ${name}. Как завести: docs/deploy.md" >&2
    exit 1
  fi
}

require_var DEPLOY_HOST
require_var DEPLOY_USER
require_var DEPLOY_SSH_KEY
require_var DEPLOY_PATH
require_var DEPLOY_KNOWN_HOSTS

if [[ ! "$DEPLOY_HOST" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "DEPLOY_HOST: допустимы буквы, цифры, точка, _ и -" >&2
  exit 1
fi
if [[ ! "$DEPLOY_USER" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]]; then
  echo "DEPLOY_USER: ожидается имя SSH-пользователя (например root)" >&2
  exit 1
fi

path="${DEPLOY_PATH%/}"
if [[ "$path" == *..* || ! "$path" =~ ^/opt/[A-Za-z0-9_-]+$ ]]; then
  echo "DEPLOY_PATH должен быть каталогом вида /opt/dvarf" >&2
  exit 1
fi

if [[ ! -f "$ROOT/frontend/dist/index.html" ]]; then
  echo "Нет frontend/dist/index.html — в выкладку не попала сборка фронтенда" >&2
  exit 1
fi
if [[ ! -f "$ROOT/deploy/rsync-filter.txt" ]]; then
  echo "Нет deploy/rsync-filter.txt" >&2
  exit 1
fi

tmp="$(mktemp -d)"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT
chmod 700 "$tmp"

printf '%s\n' "$DEPLOY_SSH_KEY" | tr -d '\r' >"$tmp/id"
chmod 600 "$tmp/id"
if ! ssh-keygen -y -f "$tmp/id" >/dev/null; then
  echo "DEPLOY_SSH_KEY не читается как приватный ключ OpenSSH без passphrase" >&2
  exit 1
fi

printf '%s\n' "$DEPLOY_KNOWN_HOSTS" | tr -d '\r' >"$tmp/known_hosts"
chmod 644 "$tmp/known_hosts"
if ! ssh-keygen -F "$DEPLOY_HOST" -f "$tmp/known_hosts" >/dev/null; then
  echo "В DEPLOY_KNOWN_HOSTS нет строки для ${DEPLOY_HOST}." >&2
  echo "Первое поле строки host key должно совпадать с DEPLOY_HOST." >&2
  exit 1
fi

ssh_base=(
  ssh
  -i "$tmp/id"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=${tmp}/known_hosts"
  -o ConnectTimeout=20
)

echo "rsync → ${DEPLOY_USER}@${DEPLOY_HOST}:${path}/"
rsync -az --delete \
  --filter "merge ${ROOT}/deploy/rsync-filter.txt" \
  -e "${ssh_base[*]}" \
  "${ROOT}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${path}/"

quoted_path="$(printf '%q' "$path")"
echo "alembic, затем перезапуск"
"${ssh_base[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "DVARF_REMOTE_DIR=${quoted_path} bash ${quoted_path}/deploy/remote-release.sh"

echo "ci-release: серверные шаги завершились"
