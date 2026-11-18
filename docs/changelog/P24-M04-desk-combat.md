# P24-M04 — Стол и лист в бою (2024)

Дата: 2026-11-18. Ветка `cursor/edition-p24-m04-desk-combat` (поверх tip M02B-rogue). **Не открывает** 2024 игрокам. Вливать после #517 и всей принятой M02B-цепочки (#518–#528).

## Что сделано

- Героическое вдохновение: переброс пишет в ленту сессии; передача союзнику через `patchSeatCombat` + строка ленты; чип «героич.» на столе (не бардовское, не преимущество 2014).
- Отдых 2024: подсказка на диалоге; все кости через `applyLongRest`; пауза 16 ч через `lastLongRestFinishedAt`.
- Неожиданность 2024: `StartCombatDialog` / `InitiativeRollDialog` — помеха к инициативе; бэкенд не ставит L-21 lock в лобби 2024; 2014 L-21 сохранён.
- Посадка: пикер всегда фильтрует по редакции; отказ `lobby_rules_edition_mismatch` без ack.
- Генератор / бестиарий / AddCombatant читают `lobby.rules_edition` (зашивка `edition="2014"` убрана).
- Мастерство оружия: `onFeedLine` на живом столе; запись в ленту через `postSheetRollToSession`.
- `SessionDetail.rules_edition`; `createLobby(..., { isPreview: true })` для e2e.
- `RULES_EDITION_2024_OPEN` по-прежнему выкл.

## 2014

Регресс md5 полный набор 5+6 в `artifacts/p24-m04/regression-2014/` (до = после). Шапку листа / LV не трогали.
