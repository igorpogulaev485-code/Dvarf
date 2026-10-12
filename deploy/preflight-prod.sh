#!/usr/bin/env bash
# Refuse to deploy a tree that is missing contours already on Timeweb prod,
# or that is not a descendant of the declared prod tip (anti-overwrite).
# Prevents sync-and-up.sh from wiping lobby / cabinet / sheet / classic / mobile
# / desktop catch-up again.
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

require_grep() {
  local path="$1"
  local pattern="$2"
  local why="$3"
  if [[ ! -f "$ROOT/$path" ]]; then
    echo "MISSING: $path  ($why)" >&2
    MISSING=1
    return
  fi
  if ! grep -qE "$pattern" "$ROOT/$path"; then
    echo "FAIL: $path missing /$pattern/  ($why)" >&2
    MISSING=1
  else
    echo "ok: $path ~ $pattern"
  fi
}

echo "=== Dvarf prod preflight (anti-overwrite) ==="
echo "tree: $ROOT"
echo

# ---------------------------------------------------------------------------
# 0) Tip ancestry — MUST contain current prod tip (hard gate)
# ---------------------------------------------------------------------------
TIP_FILE="$ROOT/deploy/prod-tip"
if [[ ! -f "$TIP_FILE" ]]; then
  echo "MISSING: deploy/prod-tip (declared prod tip branch)" >&2
  MISSING=1
else
  TIP_BRANCH="$(grep -vE '^\s*(#|$)' "$TIP_FILE" | head -n1 | tr -d '[:space:]')"
  echo "declared prod tip: $TIP_BRANCH"
  if [[ -z "$TIP_BRANCH" ]]; then
    echo "FAIL: deploy/prod-tip is empty" >&2
    MISSING=1
  elif [[ ! -d "$ROOT/.git" ]]; then
    echo "WARN: no .git in tree — tip ancestry check skipped (markers still required)" >&2
  else
    TIP_REF=""
    for cand in "origin/$TIP_BRANCH" "$TIP_BRANCH"; do
      if git rev-parse --verify "$cand" >/dev/null 2>&1; then
        TIP_REF="$cand"
        break
      fi
    done
    if [[ -z "$TIP_REF" ]]; then
      echo "FAIL: tip ref not found locally: $TIP_BRANCH (or origin/$TIP_BRANCH)" >&2
      echo "      run: git fetch origin $TIP_BRANCH" >&2
      MISSING=1
    else
      TIP_SHA="$(git rev-parse "$TIP_REF")"
      HEAD_SHA="$(git rev-parse HEAD)"
      echo "tip:  $TIP_REF ($TIP_SHA)"
      echo "HEAD: $HEAD_SHA ($(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached))"
      if git merge-base --is-ancestor "$TIP_SHA" "$HEAD_SHA"; then
        echo "ok: HEAD is descendant of (or equal to) prod tip"
      else
        echo "FAIL: HEAD does NOT contain prod tip $TIP_BRANCH" >&2
        echo "      Deploying this tree would overwrite tip features on Timeweb." >&2
        echo "      Merge tip first:" >&2
        echo "        git fetch origin $TIP_BRANCH" >&2
        echo "        git merge origin/$TIP_BRANCH" >&2
        echo "      Do NOT deploy an older parallel lineage (this already wiped mobile)." >&2
        MISSING=1
      fi
    fi
  fi
fi
echo

require "PRODUCT_STATUS.md" "статус продукта"
require "AGENTS.md" "контракт агентов"
require "deploy/prod-tip" "объявленный prod tip"

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

# Mobile play-desk tip (phone density + boot) — must survive every deploy
require "frontend/src/features/characters/CombatStickyHeader.tsx" "mobile sticky header"
require_grep "frontend/index.html" 'id="boot"' "mobile anti-blank boot splash"
require_grep "frontend/src/features/characters/MinimalSheetEditor.tsx" 'play-desk__body--mobile' "mobile one-panel body"
require_grep "frontend/src/index.css" 'spell-card__combat' "mobile spell density"
require_grep "frontend/src/index.css" 'attack-card__combat' "mobile attack density"
require_grep "frontend/src/index.css" 'inventory-card__combat' "mobile inventory density"

# Desktop play-desk catch-up — must not be wiped by a mobile-only tip deploy
require "frontend/src/features/characters/PlayDeskHeader.tsx" "desktop desk header"
require "frontend/src/features/characters/PlayDeskHotBar.tsx" "desktop hot bar"
require "frontend/src/features/characters/PlayDeskAttacksCompact.tsx" "desktop attacks compact"
require "frontend/src/features/characters/deskRolls.ts" "desktop native rolls"
require_grep "frontend/src/features/characters/playDeskUi.ts" 'desk_split|deskSplit' "desktop split ui key"
require_grep "frontend/src/features/characters/MinimalSheetEditor.tsx" 'PlayDeskHotBar' "desktop hot bar wired"

# Spot-check: digital sheet must not still say multiclass is backlog-only
if grep -q 'Мультикласс — в backlog; пока один класс' \
  frontend/src/features/characters/MinimalSheetEditor.tsx 2>/dev/null; then
  echo "FAIL: MinimalSheetEditor still has multiclass backlog hint — merge sheet P5 tip" >&2
  MISSING=1
else
  echo "ok: multiclass backlog hint absent"
fi

echo
if [[ "$MISSING" -ne 0 ]]; then
  cat >&2 <<'EOF'
PREFLIGHT FAILED.

Этот tree нельзя заливать на Timeweb: не хватает контуров tip и/или HEAD не содержит
объявленный prod tip. Деплой затёр бы их (sync-and-up заменяет всё /opt/dvarf кроме .env).

Обязательно:
  1) git fetch origin <prod-tip>     # tip в deploy/prod-tip и AGENTS.md
  2) git merge origin/<prod-tip>     # НЕ параллельная «тонкая» ветка
  3) разрешить конфликты, сохранив И mobile, И desktop catch-up
  4) снова ./deploy/preflight-prod.sh

Обход только с явного ok Игоря:
  DVARF_SKIP_PREFLIGHT=1 ./deploy/sync-and-up.sh
EOF
  exit 1
fi

echo "PREFLIGHT OK — tree contains prod tip + full lineage markers."
