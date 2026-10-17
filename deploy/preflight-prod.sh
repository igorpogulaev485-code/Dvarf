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
require "frontend/src/features/classicSheet/ClassicPrint2024.tsx" "classic 2024/LSS макет — 2026-10-17 overwrite"
require "frontend/src/features/classicSheet/classicSheetLayout.ts" "переключатель макета 2014/2024"
require "frontend/src/features/classicSheet/classicBlockFonts.ts" "шрифт блоков classic"
require "frontend/src/features/classicSheet/classicWeapons.ts" "parity атак classic↔digital"
require "frontend/src/features/classicSheet/classicSpellCards.ts" "карточки заклинаний"

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

require "backend/app/models/setting_artifact.py" "артефакты сеттинга"
require "frontend/src/features/lobby/SettingArtifactsPanel.tsx" "UI библиотеки артефактов"
require "backend/app/services/artifact_apply.py" "применение способностей артефакта"

require "frontend/src/features/characters/PlayDeskHeader.tsx" "Play Desk шапка стола (планшет)"
require "frontend/src/features/characters/PlayDeskHotBar.tsx" "Play Desk hot-панель — 2026-10-17 overwrite"
require "frontend/src/features/characters/AbilitySkillsColumn.tsx" "Play Desk рельс характеристик"
require "frontend/src/features/characters/IdentityDialog.tsx" "Wave A identity"
require "frontend/src/features/createPipeline/CreatePipelineShell.tsx" "create pipeline"

# Сеттинг ↔ стол (T1–T5) — нельзя деплоить «только вики» без мостов, и наоборот
require "frontend/src/features/lobby/SettingTableHandoffDialog.tsx" "T1 handoff стол→вики"
require "frontend/src/features/lobby/SettingTableRevealDialog.tsx" "T2 reveal mid-session"
require "frontend/src/features/lobby/SessionLorePanel.tsx" "T3 лор на столе"
require "frontend/src/features/lobby/SessionQuestStatusDialog.tsx" "T4 квест↔дневник"
require "frontend/src/features/lobby/journalTableBridge.ts" "T5 дневник→стол"

# Hard floor: интерактивный лист не должен снова сжаться до «тонкой» ветки
CHAR_COUNT="$(find frontend/src/features/characters -maxdepth 1 -type f -name '*.tsx' 2>/dev/null | wc -l | tr -d ' ')"
CLASSIC_COUNT="$(find frontend/src/features/classicSheet -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')"
if [[ "${CHAR_COUNT:-0}" -lt 80 ]]; then
  echo "FAIL: frontend/src/features/characters имеет только ${CHAR_COUNT} tsx (нужно ≥80). Похоже на тонкую ветку без Play Desk." >&2
  MISSING=1
else
  echo "ok: characters tsx count=${CHAR_COUNT}"
fi
if [[ "${CLASSIC_COUNT:-0}" -lt 10 ]]; then
  echo "FAIL: classicSheet имеет только ${CLASSIC_COUNT} файлов (нужно ≥10). Полный classic затёрт." >&2
  MISSING=1
else
  echo "ok: classicSheet file count=${CLASSIC_COUNT}"
fi
require "frontend/src/features/cabinet/AppearancePanel.tsx" "кабинет: тема аккаунта"
require "frontend/src/shared/theme/accountAppearance.ts" "токены темы аккаунта"
require "frontend/src/shared/theme/AccountAppearanceSync.tsx" "синк темы с /auth/me"

# Schema must expose theme fields — without them PATCH is dropped and /auth/me
# resets the UI to Листва after every thin-branch deploy (2026-10-16 regression).
require_py_theme() {
  local pattern="$1"
  local why="$2"
  if ! grep -qE "$pattern" backend/app/schemas/user.py 2>/dev/null; then
    echo "MISSING: backend/app/schemas/user.py /$pattern/  ($why)" >&2
    MISSING=1
  else
    echo "ok schema: $pattern"
  fi
}
require_py_theme 'theme_id: ThemeId = "wis"' "UserResponse.theme_id"
require_py_theme 'ability_colors: AbilityColorsMode = "identity"' "UserResponse.ability_colors"
require_py_theme 'theme_id: ThemeId \| None = None' "UserUpdateRequest.theme_id"
require_py_theme 'ability_colors: AbilityColorsMode \| None = None' "UserUpdateRequest.ability_colors"
require "frontend/src/shared/dnd/abilityScoreCaps.ts" "потолок характеристик PHB 20"
require "frontend/src/features/characters/WildShapeDialog.tsx" "дикий облик друида"
require "frontend/src/shared/dnd/jumpDistance.ts" "прыжки на столе"
require "frontend/src/shared/dnd/wizardSpellbook.ts" "книга волшебника"
require "frontend/src/features/characters/SpellbookManageDialog.tsx" "UI книги заклинаний"
require "deploy/preflight-live.sh" "live tip ancestry guard"
require "deploy/prod-tip" "единый файл tip"
require "deploy/remote-up.sh" "fast remote-up path"
require "backend/data/classes/features/wizard_2014.json" "сид умений волшебника"
require "backend/data/classes/features/druid_2014.json" "сид умений друида"
require "backend/data/feats/phb2014_feat_catalog_spec.json" "сид черт PHB"
require "backend/data/races/phb2014_race_catalog_spec.json" "сид рас PHB"
require "backend/alembic/archive_forms_adapt_versions/README.md" "архив миграций forms-adapt"

# Spot-check: digital sheet must not still say multiclass is backlog-only
if grep -q 'Мультикласс — в backlog; пока один класс' \
  frontend/src/features/characters/MinimalSheetEditor.tsx 2>/dev/null; then
  echo "FAIL: MinimalSheetEditor still has multiclass backlog hint — merge sheet P5 tip" >&2
  MISSING=1
else
  echo "ok: multiclass backlog hint absent"
fi

# UI Kit LOCK — CSS markers (forms-adapt overwrite wiped lobby hub 2026-10-16)
require_css() {
  local pattern="$1"
  local why="$2"
  if ! grep -qE "$pattern" frontend/src/index.css 2>/dev/null; then
    echo "MISSING CSS: /$pattern/ in frontend/src/index.css  ($why)" >&2
    MISSING=1
  else
    echo "ok css: $pattern"
  fi
}

echo
echo "=== UI Kit LOCK (index.css markers) ==="
require_css 'UI KIT LOCK — Lobby Hub' "маркер хвоста A1→D1 — не checkout index.css с другой ветки"
require_css '\.lobby-member-grid' "сетка состава лобби"
require_css '\.lobby-hub-tab\.is-active' "активный таб хаба = accent"
require_css '\.lobby-member-card__hp--ok' "полоска HP на карточке состава"
require_css '\.session-table-card' "карточки стола сессии"
require_css '\.journal-feed' "дневник кампании"
require_css '\.chat-layout' "чаты лобби"
require_css '\.notes-feed' "заметки лобби"
require_css '\.setting-wiki' "вики сеттинга"
require_css '\.setting-artifact-list' "библиотека артефактов D1"
require_css '\.session-combat-track' "трек боя на сессии"

require "docs/ui-kit/README.md" "UI kit контракт"
require "frontend/src/features/lobby/LobbyMemberMiniCard.tsx" "карточка состава"
require "frontend/src/features/lobby/LobbyHubTabs.tsx" "табы хаба лобби"

echo
if [[ "$MISSING" -ne 0 ]]; then
  cat >&2 <<'EOF'
PREFLIGHT FAILED.

Этот tree нельзя заливать на Timeweb: не хватает контуров, которые уже были на проде.
Деплой затёр бы их (sync-and-up заменяет всё /opt/dvarf кроме .env).

Частый провал после 2026-10-16: checkout/restore frontend/src/index.css с forms-adapt
без хвоста «UI KIT LOCK — Lobby Hub» — состав лобби снова без сетки/карточек.

Сделай:
  git fetch origin
  git merge origin/<current-prod-tip>   # см. AGENTS.md / .cursor/skills/dvarf-prod-lineage
  # или начни ветку заново от tip
  # CSS мержить, НЕ git checkout <other> -- frontend/src/index.css

Обход только с явного ok Игоря:
  DVARF_SKIP_PREFLIGHT=1 ./deploy/sync-and-up.sh
EOF
  exit 1
fi

echo "PREFLIGHT OK — tree looks like full prod lineage."
