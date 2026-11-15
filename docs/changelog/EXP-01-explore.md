# EXP-01 — сцена «Исследование» (инвентарь)

Ветка: `cursor/ux-exp01-explore-95b9` · база `main` (`42518bc7`) · PR #405 · **не мержить** без Игоря.

Параллельно с SOC-01 / COMP-01 / MAG-01 (#403): их файлы не трогали.

## Статус

Сделано: взгляд инвентаря, ноша/кошелёк/настроенные, набор view→edit→свернуть, гидратация веса, кадры 1440/390.

**Доправка (тот же PR):** на 390 ноша без обрезки (вес+полоска сверху, чипы второй строкой переносом, короткие «Передать» / «Настр.»); строка вещи в один этаж; справа везде вес · × · ★ · значок · ›; в сводке «вещи N фнт · монеты N фнт».

## Ключевые файлы

- `frontend/src/features/characters/InventoryPanel.tsx` — UI сцены
- `frontend/src/features/characters/inventoryPacks.ts` — `hydrateItemWeightFromCatalog`
- `frontend/src/shared/dnd/startingGearWeights.ts` — таблица весов PHB + алиасы
- `frontend/src/shared/dnd/classGrants.ts`, `backgroundGrants.ts`, `backgroundEffects.ts`, `classEffects.ts` — вес в выдаче
- `frontend/src/styles/04-combobox-inventory.css`, `05-inventory-gear.css` — только под `.inventory-panel`
- `frontend/src/features/characters/inventoryExplore.selfcheck.ts` + расширение `inventoryPacks.selfcheck.ts`
- `frontend/scripts/exp01-capture.mjs`, `backend/scripts/seed_exp01_chars.py`

## Таблица кадров

| Пункт | Кадр | Что видно |
|-------|------|-----------|
| Первая сцена | `explore-first-{1440,390}` (+ `before-*`) | Абзаца нет; «вещи … фнт · монеты … фнт · итог»; на 390 вес+полоска, чипы ниже без обрезки |
| Строка вещи | `explore-row-{1440,390}` | Одна строка; справа вес · × · ★ · значок · › |
| Фильтр «Надето» | `explore-filter-equipped-{1440,390}` | Доспех + плащ, значок «надет» |
| Набор взгляд 390 | `explore-pack-view-390` | Содержимое без полей/Удалить |
| Набор взгляд/правка/свёрт (полные) | `explore-pack-{view,edit,collapsed}-{1440,390}` | view → edit → одна строка |
| Кошелёк / передача / вес | `explore-wallet-*`, `explore-transfer-coins-1440`, `explore-weight-*` | как в первом прогоне |
| Шапка / сцены | `hdr-pair-{1440,390}`, `scene-block-pair-1440` (+ `before-*`) | **Δ 0×0 px** |

## Миграции

нет

## Что не сломалось

- Шапка: 0 px
- Хот-панель, сцены, левая панель, «Бой» / кара / действия хода — не трогали
- «Общение» / «Напарники» — правки только под `.inventory-panel`
- Кнопка D&D 2024 не вернулась
- Кошелёк шапки через `onOpenCoins` сохранён

## Вещи без веса

| Вещь | Почему |
|------|--------|
| **Магический фокус** (плейсхолдер) | «—» на экране; в «вес неполный» не входит (подтверждено доправкой) |

## Вопросы

1. Веса свёрнутых наборов в выдаче — суммы из каталога содержимого (учёный 10, …). В PHB отдельной цифры нет; ок ли так?

## Проверки

- `npm run build` — ок
- `selfcheck:inventory-packs` / `selfcheck:inventory-explore` — ок
- `pytest` — 372 passed (раньше)
- Миграций нет
