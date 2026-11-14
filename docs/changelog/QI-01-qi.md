# QI-01 — «ки» → «ци» + метка «в руках» у безоружного удара монаха

Ветка: `cursor/ux-QI01-qi-6218` · база `main` · **не мержить** без Игоря.

## Что сделано

### 1. Термин «ки» → «ци» в пользовательских текстах

Монашеский ресурс (Ki, PHB 2014) везде, где его видит игрок, назван **«ци»**.

| Файл | Замен |
|------|------:|
| `frontend/src/shared/dnd/data/monk_2014.json` | 80 |
| `backend/data/classes/features/monk_2014.json` | 74 |
| `frontend/src/features/characters/KiSpendDialog.tsx` | 10 |
| `frontend/src/features/characters/Pack09FeatureExtras.tsx` | 6 |
| `frontend/src/shared/dnd/monkElementalDisciplines.ts` | 5 |
| `frontend/src/shared/dnd/monkKiSpend.ts` | 3 |
| `frontend/src/features/characters/castWithoutSlots.ts` | 2 |
| `frontend/src/features/characters/PlayDeskAttacksCompact.tsx` | 2 |
| `frontend/src/features/characters/minimalSheet/sheetActions4.ts` | 2* |
| `backend/scripts/inject_tcoe_optional_features.py` | 2 |
| `frontend/src/shared/dnd/featureResources.ts` | 1 (+маппинг match) |
| `frontend/src/features/characters/ClassFeaturesPanel.tsx` | 1 |
| `frontend/src/features/characters/restSummary.selfcheck.ts` | 1 |
| `frontend/src/features/characters/minimalSheet/SheetDialogsResources.tsx` | 1 |
| **Итого текстовых замен** | **190** |

\* `isKiResource` принимает и legacy «Ки», и «Ци».

Дополнительно (не счётчик замен слова):

- `displayResourceLabel()` в `frontend/src/shared/dnd/rest.ts` — **один** маппинг отображения: сохранённое имя «Ки»/«ки»/«КИ» → «Ци»/«ци»/«ЦИ» без переписи данных листа.
- Hot-bar (`PlayDeskHotBar`) и `KiSpendDialog` показывают лицо через этот маппинг.
- `normalizeResourceName` считает «ки» и «ци» одним пулом при absorb/match.
- Selfcheck: `displayResourceLabel.selfcheck.ts`.

Английские ключи (`ki`, `ki_points`, `:ki:`, `pool_id: "ki"`) **не** переименовывались. Миграций нет.

### 2. Чип «в руках» у безоружного удара

В `PlayDeskAttacksCompact` чип «в руках» больше не рисуется для безоружных атак:

`attack.held && !kitComputed && !unarmed`

где `unarmed = isMonkUnarmedAttack || isKitUnarmedAttack`. Переключатель «в руках» у безоружного и так не был (нет `inventory_item_id`). Остальное оружие без изменений. Selfcheck CMB-01 обновлён.

## Что не трогали (спорные / исключения)

| Место | Почему |
|-------|--------|
| `хар-ки` (аббр. «характеристики») | не ресурс монаха |
| `Ки-рин` / `ки–рин` в bestiary | имя существа |
| Имена в каталогах (Кира, Кирилл, Киви…) | не ресурс |
| `кинжал`, `Кираса`, `Кислота` | другие слова |
| English ids `ki` / `feat:…:ki:…` | контракт данных |
| `docs/bugs.md`, buffs-audit | не UI продукта |
| Сохранённые JSON листов в БД | только display-маппинг |

Оставшиеся вхождения отдельного «ки» в `frontend/src` / `backend` — только в коде маппинга, комментариях QI-01 и selfcheck/seed (legacy fixture «Ки»).

## Проверка

- `npm run build` (tsc + vite) — ok
- `cmb01Combat` / `displayResourceLabel` / `PlayDeskHotBar` / `restSummary` / `martialArts` / `kitCombatAttacks` selfcheck — ok
- `pytest` — 371 passed, 1 skipped
- `alembic heads` — одна голова `onb03usr9c2e1`
- Grep: 0 пользовательских «ки» после FP-фильтра (см. исключения выше)

## Скрины (VM)

`/opt/cursor/artifacts/`:

| Файл | Что видно |
|------|-----------|
| `combat-monk-1440.png` / `combat-monk-390.png` | «Безоружный удар» · тег «класс» · **без** «в руках»; ресурс «Ци»; «Атака на ци» |
| `hot-monk-1440.png` / `hot-monk-390.png` | карточка хот-панели «Ци» |
| `feature-monk-qi-1440.png` | умение «Ци»: «Очки ци…», «Сл ци…» |
| `hdr-pair-1440.png` vs `main-hdr-pair-1440.png` | **0 px** различий (`qi01-hdr-diff.json`) |
| `qi01-capture-report.json` | probes: `hasHeldChip=false`, `hasQiHot=true`, `hasKiHot=false` |

Скрипт: `frontend/scripts/qi01-capture.mjs` · seed: `backend/scripts/seed_qi01_monk.py` (лист с legacy `"name": "Ки"` для проверки маппинга).

## Что не сделано / ограничения

- Шапка / хот-раскладка / сцены / тулбар / левая панель визуально не менялись (только тексты «ки»→«ци»).
- Логика расчётов, API-контракты, миграции БД — без изменений.
- `AttacksPanel` / настройки атак (не сцена «Бой») — чип «в руках» у безоружного не трогали; ТЗ указывало `PlayDeskAttacksCompact`.
