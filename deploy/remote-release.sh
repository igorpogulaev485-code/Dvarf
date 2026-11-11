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

echo "remote-release: перезапуск"
DVARF_REMOTE_DIR="$REMOTE_DIR" bash deploy/remote-up.sh
