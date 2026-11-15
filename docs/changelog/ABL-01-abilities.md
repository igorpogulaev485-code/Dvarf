# ABL-01 — сцена «Способности»

Ветка: `cursor/ux-abl01-abilities-a12a` · база `main` (`83debe85`) · **не мержить** без Игоря.

Старт после #406 FIX-01 и #407 COMP-01. Шапку листа, хот-панель, сцены, «Бой» / «Магия» / «Исследование» / «Общение» / «Напарники» / окно цели — не трогали.

## Сделано

1. **Благочестие** — блок только если в кампании включён MOT (`allowed_sources` включает `mot`) **или** у персонажа выбран бог. Иначе панели нет.
2. Убран вступительный абзац (`features-panel__lede`).
3. Фильтры ровно 5: **Все / С ресурсом / Нужен выбор / Пассивные / Свои**. Пустые (0 умений) скрыты. Поиск на месте.
4. Порядок карточек: сверху «нужен выбор» (бейдж китовый `Chip`), дальше в группе умения с ресурсом, потом пассивные.
5. **Тёмное зрение** — одна карточка (дубли из trait cards отфильтрованы, если есть `darkvision` prop).
6. Подпись ресурса монаха — **«ци»** (через `displayResourceLabel`, QI-01 уже был; на карточке умений тоже).
7. **Предок-дракон**: выбор из мастера/`subclass_setups` / `choice.id` (`draconic_ancestry`) больше не показывается как «не выбрано» — bridge при загрузке листа + `getFeatureChoicePick`.

## Ключевые файлы

- `frontend/src/features/characters/ClassFeaturesPanel.tsx`
- `frontend/src/features/characters/minimalSheet/PlayDeskScenes.tsx` — гейт `PietyPanel`
- `frontend/src/features/characters/minimalSheet/draft.ts` — bridge `subclass_setups` → feature picks
- `frontend/src/shared/dnd/featurePicks.ts` / `pendingFeatureChoices.ts`
- `frontend/src/features/characters/abl01Abilities.selfcheck.ts`
- `frontend/scripts/abl01-capture.mjs`, `backend/scripts/seed_abl01_chars.py`

## Таблица кадров

| Пункт | Кадр | Что видно |
|-------|------|-----------|
| Обзор | `abl-overview-{1440,390}` | без вступления; фильтры без пустых |
| Фильтры | `abl-filters-{1440,390}` | активен «С ресурсом»; пустые скрыты |
| Нужен выбор | `abl-need-choice-1440` | карточка с `Chip` «нужен выбор» |
| Ресурс | `abl-resource-use-1440` | умение + «Использовать» |
| Благочестие выкл | `abl-piety-off-1440` | блока нет (персонаж без бога) |
| Благочестие вкл | `abl-piety-on-1440` | панель «Благочестие», бог Гелиод |
| Тёмное зрение | `abl-darkvision-1440` | одна карточка «Тёмное зрение 60 фт.» |
| Монах / ци | `abl-monk-ki-1440` | подпись «Ци: …», не «Ки» |
| Предок-дракон | `abl-dragon-ancestor-1440` | выбран «Красный (огонь)», без «не выбрано» |
| Шапка | `hdr-pair-{1440,390}` до/после | **md5 совпадают → 0 px** |

md5: `/opt/cursor/artifacts/abl01-md5s.txt` (пересъём: `node frontend/scripts/abl01-capture.mjs`).

## Миграции

нет

## Что не сломалось

- Шапка листа — не меняли (hdr md5 до = после)
- Хот-панель, переключатель сцен, левая панель, бой / кара / строка хода
- Сцены «Магия», «Исследование», «Общение», «Напарники»
- Кнопка D&D 2024 не вернулась
- `npm run build`, `selfcheck:abl01-abilities`, `selfcheck:mag01-magic` — ok

## Вопросы

1. Гейт благочестия по книге MOT — ок, или нужен отдельный флаг кампании?
2. Фильтр «Свои» скрыт при 0 своих умений (добавление — через «Все»). Ок?
