#!/usr/bin/env bash
# На VPS после rsync. Каталог, .env и тома Docker не удаляет.
# Сборка → миграция (старый API ещё отвечает) → перезапуск → /health внутри remote-up.
set -euo pipefail

REMOTE_DIR="${DVARF_REMOTE_DIR:-/opt/dvarf}"
if [[ "$REMOTE_DIR" == *..* || ! "$REMOTE_DIR" =~ ^/opt/[A-Za-z0-9_-]+$ ]]; then
  echo "DVARF_REMOTE_DIR отклонён: ${REMOTE_DIR}" >&2
  exit 1
fi

cd "$REMOTE_DIR"

if [[ ! -s .env ]]; then
  echo "ERROR: ${REMOTE_DIR}/.env отсутствует или пуст. Остановка до сборки и перезапуска." >&2
  exit 1
fi
if [[ ! -f deploy/remote-up.sh || ! -f docker-compose.prod.yml ]]; then
  echo "ERROR: в ${REMOTE_DIR} нет deploy/remote-up.sh или docker-compose.prod.yml" >&2
  exit 1
fi

echo "remote-release: сборка образов, контейнеры пока старые"
DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_BUILD_ONLY=1 bash deploy/remote-up.sh

COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env)

echo "remote-release: база для миграции"
"${COMPOSE[@]}" up -d --pull never --no-deps db

healthy=""
for _ in $(seq 1 30); do
  healthy="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' dvarf-db 2>/dev/null || true)"
  if [[ "$healthy" == "healthy" ]]; then
    break
  fi
  sleep 2
done
if [[ "$healthy" != "healthy" ]]; then
  echo "ERROR: dvarf-db не healthy (${healthy:-нет контейнера}). Стек не перезапускался." >&2
  exit 1
fi

echo "remote-release: alembic upgrade head"
"${COMPOSE[@]}" run --rm --no-deps api alembic upgrade head

# Ниже — best-effort. Код выкладки по-прежнему равен коду перезапуска.
# Обрыв ssh это не затрагивает: скрипт уже в сессии remote-release-ctl.
apply_vpn_mtu() {
  local script="${REMOTE_DIR}/deploy/apply-vpn-mtu.sh"
  if [[ ! -f "$script" ]]; then
    echo "WARN: нет ${script}, кламп MSS пропущен. Деплой продолжается."
    return 0
  fi
  local -a runner
  if [[ "$(id -u)" -eq 0 ]]; then
    runner=(bash "$script")
  elif command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    runner=(sudo -n bash "$script")
  else
    echo "WARN: нет прав root и passwordless sudo, кламп MSS пропущен. Деплой продолжается."
    return 0
  fi
  if ! "${runner[@]}"; then
    echo "WARN: apply-vpn-mtu.sh завершился с ошибкой, деплой продолжается."
  fi
  return 0
}

run_diagnose() {
  local script="${REMOTE_DIR}/deploy/diagnose-network.sh"
  if [[ ! -f "$script" ]]; then
    echo "WARN: нет ${script}"
    return 0
  fi
  if [[ "$(id -u)" -eq 0 ]]; then
    bash "$script" || true
  elif command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    sudo -n bash "$script" || true
  else
    echo "WARN: диагностика без root — iptables и ufw могут быть недоступны"
    bash "$script" || true
  fi
  return 0
}

echo "remote-release: MTU для VPN"
apply_vpn_mtu

echo "remote-release: перезапуск"
set +e
DVARF_REMOTE_DIR="$REMOTE_DIR" bash deploy/remote-up.sh
up_code=$?
set -e

echo "remote-release: диагностика сети"
run_diagnose

if [[ "$up_code" -ne 0 ]]; then
  echo "remote-release: перезапуск завершился с кодом ${up_code}" >&2
  exit "$up_code"
fi
