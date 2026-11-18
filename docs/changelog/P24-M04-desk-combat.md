# P24-M04 — Стол и лист в бою (2024)

Дата: 2026-11-18. Ветка `cursor/edition-p24-m04-desk-combat` (поверх tip M02B-rogue). **Не открывает** 2024 игрокам. Вливать после #517 и всей принятой M02B-цепочки (#518–#528).

## Что сделано

- Героическое вдохновение: переброс пишет в ленту сессии; **продуктовый** `tryGrantHeroicInspiration` → `openHeroicTransfer` при втором гранте (лимит 1) + союзники со стола (`deskHeroicAllies` из seats); передача через `patchSeatCombat` + строка ленты; чип «героич.» (не бардовское).
- Отдых 2024: подсказка на диалоге; все кости через `applyLongRest`; пауза 16 ч через `lastLongRestFinishedAt`.
- Неожиданность 2024: `StartCombatDialog` / `InitiativeRollDialog` — помеха к инициативе; **SessionDetailPage** передаёт `rulesEdition={session.rules_edition}`; бэкенд не ставит L-21 lock в лобби 2024; 2014 L-21 сохранён.
- Посадка: пикер всегда фильтрует по редакции; отказ `lobby_rules_edition_mismatch` без ack.
- Генератор / бестиарий / AddCombatant / **CombatPageEditor** / **AddStoryCompanionDialog** читают `lobby`/`session.rules_edition` (зашивка `edition="2014"` убрана).
- Мастерство оружия: held sync через `inventory.equipped`; панель с выбором Попадание/Промах (Graze); `postSheetRollToSession` → строка «Мастерство · …» в ленте.
- `SessionDetail.rules_edition`; `createLobby(..., { isPreview: true })` для e2e; AddCombatant показывает редакцию лобби.
- Приёмка: live e2e с API без soft-skip и без else-shot mastery; честные кадры 1440+390 — heroic reroll chip/лента, mastery apply+лента, bestiary/add combatant. Preview — только smoke.
- `RULES_EDITION_2024_OPEN` по-прежнему выкл.

## 2014

Регресс md5 полный набор 5+6 в `artifacts/p24-m04/regression-2014/` (до = после). Шапку листа / LV не трогали.
