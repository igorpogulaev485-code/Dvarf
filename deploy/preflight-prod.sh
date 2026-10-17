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

require "frontend/src/pages/ClassicSheetPage.tsx" "classic 2014"
require "frontend/src/features/classicSheet/ClassicPrintSheet.tsx" "classic sheet UI"

require "backend/app/api/routers/catalog.py" "справочник API"

require "frontend/src/features/lobby/StartCombatDialog.tsx" "бой: старт инициативы"
require "frontend/src/features/lobby/EnemyCard.tsx" "бой: карточка противника"
require "frontend/src/features/lobby/AwardXpDialog.tsx" "бой: раздача XP"
require "frontend/src/features/lobby/AwardLootDialog.tsx" "бой: лут на стол"
require "frontend/src/features/characters/TransferDialog.tsx" "P2P передать"
require "frontend/src/features/lobby/EncounterTemplatesDialog.tsx" "шаблоны энкаунтеров"
require "frontend/src/features/lobby/EncounterGenerateDialog.tsx" "генератор боя B8"
require "backend/app/dnd/encounter_compose.py" "генератор боя (backend)"

require "frontend/src/pages/SettingDetailPage.tsx" "вики сеттинга UI"
require "frontend/src/pages/SettingWikiPreviewPage.tsx" "вики preview"
require "backend/app/models/setting_page.py" "вики: страницы"
require "backend/app/models/setting_page_link.py" "вики: связи"
require "backend/app/models/setting_page_template.py" "вики C5: шаблоны"
require "backend/app/dnd/setting_templates.py" "вики C5: системные шаблоны"
require "frontend/src/features/lobby/SettingQuickCreateDialog.tsx" "вики C5: quick create"
require "frontend/src/features/lobby/settingKinds.ts" "вики C5: типы"
require "frontend/src/features/lobby/settingMentions.ts" "вики C6: mentions"
require "frontend/src/features/lobby/SettingMentionBody.tsx" "вики C6: рендер mentions"
require "backend/app/dnd/setting_mentions.py" "вики C6: парсер mentions"
require "backend/alembic/versions/p7q8r9s0t1u2_setting_c7_gm_body.py" "вики C7: gm_body migration"
require "backend/app/dnd/setting_link_presets.py" "вики C8: пресеты связей"
require "frontend/src/features/lobby/settingLinkPresets.ts" "вики C8: пресеты UI"
require "frontend/src/features/lobby/JournalComposer.tsx" "дневник + ссылка на вики"
require "frontend/src/features/lobby/ChatBodyText.tsx" "чат: linkify /settings"

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

Этот tree нельзя заливать на Timeweb: не хватает контуров, которые уже были на проде.
Деплой затёр бы их (sync-and-up заменяет всё /opt/dvarf кроме .env).

Сделай:
  git fetch origin
  git merge origin/<current-prod-tip>   # см. AGENTS.md / .cursor/skills/dvarf-prod-lineage
  # или начни ветку заново от tip

Обход только с явного ok Игоря:
  DVARF_SKIP_PREFLIGHT=1 ./deploy/sync-and-up.sh
EOF
  exit 1
fi

echo "PREFLIGHT OK — tree looks like full prod lineage."
