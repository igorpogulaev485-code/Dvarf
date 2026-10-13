#!/usr/bin/env bash
# Refuse to deploy a tree that is missing contours already on Timeweb prod.
# Prevents sync-and-up.sh from wiping lobby / cabinet / sheet / classic again.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${DVARF_SKIP_PREFLIGHT:-}" == "1" ]]; then
  echo "preflight: SKIPPED (DVARF_SKIP_PREFLIGHT=1) — only with explicit Игорь ok" >&2
  exit 0
fi

MISSING=0
require() {
  local path="$1"
  local why="$2"
  if [[ ! -e "$ROOT/$path" ]]; then
    echo "MISSING: $path  ($why)" >&2
    MISSING=1
  else
    echo "ok: $path"
  fi
}

fail() {
  echo "FAIL: $*" >&2
  MISSING=1
}

echo "=== Dvarf prod preflight (anti-overwrite) ==="
echo "tree: $ROOT"
echo

require "PRODUCT_STATUS.md" "статус продукта"
require "AGENTS.md" "контракт агентов"

require "backend/app/api/routers/lobbies.py" "лобби API"
require "frontend/src/pages/JoinLobbyPage.tsx" "лобби join UI"
require "frontend/src/pages/LobbyDetailPage.tsx" "лобби detail UI"

require "backend/app/services/mail.py" "SMTP / кабинет"
require "frontend/src/features/cabinet/SessionsPanel.tsx" "сессии устройств"
require "frontend/src/features/cabinet/AvatarEditor.tsx" "загрузка аватара"
require "backend/app/services/avatar.py" "avatar service"
require "frontend/src/pages/VerifyEmailPage.tsx" "verify email"

require "frontend/src/features/characters/raceEffects.ts" "лист P6 раса"
require "frontend/src/features/characters/LevelUpDialog.tsx" "лист P5 мультикласс"
require "frontend/src/shared/dnd/casterProgression.ts" "лист P2 слоты"
require "frontend/src/shared/dnd/armor.ts" "лист P3 КД"
require "frontend/src/features/characters/LanguagesToolsPanel.tsx" "лист P4"
require "frontend/src/shared/dnd/concentration.ts" "лист P1 концентрация"
require "frontend/src/features/characters/CastSpellDialog.tsx" "каст / upcast"
require "frontend/src/shared/dnd/backgroundGrants.ts" "предыстории: гранты"
require "frontend/src/features/characters/BackgroundSetupDialog.tsx" "предыстории: попап"
require "backend/data/backgrounds/phb2014_background_catalog_spec.json" "предыстории: каталог"

require "frontend/src/pages/ClassicSheetPage.tsx" "classic 2014"
require "frontend/src/features/classicSheet/ClassicPrintSheet.tsx" "classic sheet UI"
require "frontend/src/features/classicSheet/ClassicBackgroundPicker.tsx" "classic: предыстории"

require "backend/app/api/routers/catalog.py" "справочник API"

# Fast release path — must not be dropped by tip-orphan deploys.
require "deploy/remote-up.sh" "быстрый remote-up (не docker compose --build на VPS)"
require "deploy/preflight-live.sh" "live tip + alembic guard"
require "frontend/Dockerfile.full" "fallback full frontend Dockerfile"

# Spot-check: digital sheet must not still say multiclass is backlog-only
if grep -q 'Мультикласс — в backlog; пока один класс' \
  frontend/src/features/characters/MinimalSheetEditor.tsx 2>/dev/null; then
  fail "MinimalSheetEditor still has multiclass backlog hint — merge sheet P5 tip"
else
  echo "ok: multiclass backlog hint absent"
fi

# Frontend Dockerfile must be nginx+dist (prebuilt), not node build on VPS.
if [[ "${DVARF_FRONTEND_DOCKERFILE:-Dockerfile}" == "Dockerfile" ]]; then
  if head -n 5 frontend/Dockerfile | grep -qiE 'FROM[[:space:]]+node'; then
    fail "frontend/Dockerfile starts with node — releases will hang on VPS. Use nginx+dist prebuild (see deploy/README.md)"
  elif grep -q 'COPY dist/' frontend/Dockerfile && grep -qiE 'FROM[[:space:]]+nginx' frontend/Dockerfile; then
    echo "ok: frontend/Dockerfile is nginx+dist prebuild"
  else
    fail "frontend/Dockerfile must COPY dist/ into nginx (prebuild path)"
  fi
fi

# sync-and-up must call remote-up, not bare compose --build
if grep -q 'deploy/remote-up.sh' deploy/sync-and-up.sh \
  && ! grep -qE 'docker compose .*up -d --build' deploy/sync-and-up.sh; then
  echo "ok: sync-and-up uses remote-up (not bare --build)"
else
  fail "deploy/sync-and-up.sh must call remote-up.sh and must not run 'docker compose … up -d --build'"
fi

# Local alembic revisions must parse (supports `revision =` and `revision: str =`).
REV_COUNT="$(
  grep -RhoE '^revision[[:space:]]*(:[[:space:]]*str)?[[:space:]]*=[[:space:]]*[\"'"'"'][a-zA-Z0-9_]+[\"'"'"']' \
    backend/alembic/versions 2>/dev/null | wc -l | tr -d ' '
)"
if [[ "${REV_COUNT:-0}" -lt 1 ]]; then
  fail "no alembic revision ids found under backend/alembic/versions"
else
  echo "ok: alembic revisions on disk ($REV_COUNT ids)"
fi

echo
if [[ "$MISSING" -ne 0 ]]; then
  cat >&2 <<'EOF'
PREFLIGHT FAILED.

Этот tree нельзя заливать на Timeweb: не хватает контуров / сломан deploy-path.
Деплой затёр бы прод или снова ушёл в часовой docker build.

Сделай:
  git fetch origin
  # LIVE tip — с сервера / AGENTS.md на tip-ветке, не из своей устаревшей копии
  git merge origin/<live-prod-tip>
  # или начни ветку заново от tip
  # НЕ сшивай orphan cherry-pick'ами «на глаз»

Обход только с явного ok Игоря:
  DVARF_SKIP_PREFLIGHT=1 ./deploy/sync-and-up.sh
EOF
  exit 1
fi

echo "PREFLIGHT OK — tree looks like full prod lineage."
