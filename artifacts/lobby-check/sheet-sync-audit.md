# Аудит sync лобби ↔ лист персонажа (`cursor/lobby-fix-298b` vs `origin/main`)

Дата: 2026-11-15. Ветка: `cursor/lobby-fix-298b` @ `6cad8f33`. Режим: только чтение кода.

## Вердикт

Пути **записи** HP/урона/лечения/temp HP/состояний/XP/инвентаря/отдыха **сохранены** (тела `award_xp` / `award_loot` / `grant_inventory` / `transfer_inventory` / `start_party_rest` / `_mutate_sheet_combat` идентичны `origin/main`).  
PR меняет в основном **чтение/отображение** (fallback колонок из листа) и реакцию/инициативу/CR.

**Блокеры sync листа: нет.**  
Есть один **major** риск рассинхрона UI↔write при пустых колонках HP.

---

## 1. Diff: что трогает sync

| Область | Изменено в PR? | Факт |
|---|---|---|
| Урон/лечение/temp HP → лист | почти нет | В `patch_seat_combat` добавлены только `session.combat.reaction_character_id` / `reaction_hint` (`lobby.py:4540-4543`). Запись HP не менялась. |
| Conditions/effects writeback | нет | Тело записи идентично main. |
| XP award writeback | нет | `award_xp` IDENTICAL. |
| Inventory/loot transfer | нет | `award_loot` / `grant_inventory` / `transfer_inventory` IDENTICAL. |
| Short/long rest restore | нет | `start_party_rest` IDENTICAL; restore по-прежнему на листе. |
| Concurrent sheet PATCH vs lobby | нет | `CharacterService.update` + `sheet_version` не в diff (кроме `to_summary`). |
| Read fallback HP/класс/уровень | **да** | `to_summary`, `extract_summary_from_sheet`, `_session_detail` seats. |

Файлы backend в diff sync-релевантные:  
`backend/app/services/character.py`, `character_sheet.py`, `lobby.py`, `schemas/lobby.py` (+ тест инициативы/CR).

---

## 2. Destinations записи (HEAD)

### HP / урон / лечение / temp HP

`patch_seat_combat` (`lobby.py:4387+`):

- читает базу из **колонок** `character.hp_max` / `character.hp_current` (`4502-4503`);
- temp HP: `sheet.combat.hp_temp` (`4504-4507`, `4523`);
- урон/лечение (отрицательный `damage`):  
  - колонка `character.hp_current` (`4522`);  
  - `sheet.combat.hp_current` (`4524`);  
  - `sheet.combat.hp_temp` (`4523`);  
  - при ≤0: `sheet.combat.is_dying` / death saves (`4525-4530`);
- bump: `character.sheet_version` через `_mutate_sheet_combat` (`4379-4384`).

Тот же dual-write колонка+`sheet.combat` в атаке/typed damage: `6756-6758`, `7206-7208`.

**Не пишет:** `character.hp_max`, `sheet.combat.hp_max` при уроне со стола.

### Conditions / effects

- `sheet.combat.conditions` — `lobby.py:4416-4438`
- `sheet.combat.effects` — `lobby.py:4440-4468`
- концентрация: `sheet.combat.concentration` — `4470-4478`

### XP

- XP-режим: `rewards.apply_xp_to_identity` → `sheet.identity.experience` (`session_rewards.py:398-412`, вызов `lobby.py:8161-8166`)
- Вехи: `bump_character_level` → `sheet.identity.level` (+ `sheet.classes[0].level`) (`session_rewards.py:423-440`, вызов `lobby.py:8082-8087`)
- **Не пишет** колонку `character.level` / `character.hp_*`

### Inventory / loot

- `award_loot`: `sheet.inventory.coins` + `sheet.inventory.items` (+ artifact apply) — `lobby.py:8421-8491`
- `grant_inventory`: то же — `9363-9424`
- `transfer_inventory`: `sender/receiver sheet.inventory` — `9157-9263`

### Rest

- `start_party_rest` (`9463-9541`): только `SessionEvent` + WS `party_rest`; **ресурсов листа не трогает**
- restore: игрок на Play Desk → `CharacterService.update` → `sheet` (+ колонки HP из `extract_summary_from_sheet` при save, `character.py:289-295`)

### Concurrent PATCH

- Лобби: всегда `sheet_version += 1` без optimistic check (`4384`)
- Лист: `payload.sheet_version != character.sheet_version` → `409 sheet_version_conflict` (`character.py:232-236`)
- Поведение относительно main: **сохранено**

---

## 3. Видимость HP героя (мастер vs игрок)

**PR не менял логику.**

- Backend seats всегда отдают числа (`lobby.py:3566-3568`); редукция death saves по `hidden_death_saves` / `can_see_hidden` (`3544-3558`) — без изменений смысла в diff (только fallback входных HP).
- Frontend: `SessionTableCard` — `revealAll` (мастер) → `hpMode='active'`; иначе `visibility.fields.health.hp` = `active|color_only|off` (`SessionTableCard.tsx:331-363`).
- Diff `SessionTableCard`: только подпись `HP` → `Хиты`.
- `visibilityProfile.ts` в diff отсутствует. `VisibilitySettingsPanel`: только опциональный `footer`.

---

## 4. `to_summary` / `extract_summary_from_sheet`

### `extract_summary_from_sheet` (`character_sheet.py:117-141`)

Читает:

- HP: `sheet.combat.hp_current` / `hp_max`
- класс/уровень: `sheet.classes[]`
- раса: `sheet.identity.race_name|race` или `sheet.race_name`

### `to_summary` (`character.py:38-61`) — **только response, не пишет БД**

- HP из листа **только если** колонка `hp_max` или `hp_current` is `None`
- при заполненных колонках лист **не маскирует** колоночные HP
- уровень: если колонка `1` (или пусто) и на листе сумма классов выше — в summary подставляется уровень листа (display)

### `_session_detail` seats (`lobby.py:3522-3533`)

Тот же fallback: колонки `None` → числа из `sheet.combat`.

### Риск (не overwrite через summary)

Summary **не перезаписывает** реальные колоночные HP при расхождении.  
Overwrite возможен только через write-пути урона/save листа.

---

## 5. Находки (severity + факты)

### [major] UI fallback HP без sync write-базы

- **Факт:** seats/`to_summary` показывают `sheet.combat.hp_*`, если колонки `None` (`lobby.py:3524-3533`, `character.py:47-53`).
- **Факт:** урон всё ещё считает от `character.hp_max or 1` / `character.hp_current` (`4502-4503`, `7198-7201`).
- **Следствие:** при пустых колонках и живом `sheet.combat` (напр. 45/45) стол показывает 45/45, а урон стартует от max=1 → порча HP и запись в колонку+combat.
- **PR:** усиливает видимость проблемы (раньше UI тоже показывал пустые колонки).

### [minor] Fallback `hp_current` при ключе `None`

- `from_sheet.get("hp_current", from_sheet.get("hp_max"))` (`character.py:53`): если ключ есть и значение `None`, fallback на `hp_max` не срабатывает.

### [info] Write-пути sync сохранены

- `award_xp`, `award_loot`, `grant_inventory`, `transfer_inventory`, `start_party_rest`, `_mutate_sheet_combat` — IDENTICAL vs main.
- `patch_seat_combat`: +3 строки reaction metadata; destinations HP/conditions без изменений.

### [info] Visibility HP мастер/игрок

- Без изменений логики; только копирайт «Хиты».

### [info] Rest

- Лобби по-прежнему только сигнал; restore через PATCH листа — не затронут PR (кроме `AppHeader` вне sync-ядра).

### [info] Concurrent sheet vs lobby

- Конфликт по `sheet_version` сохранён; лобби без CAS — как на main.

---

## Блокеры для sheet sync

1. *(пусто)* — ломающих writeback-путей PR не внёс.

**Не блокер, но смотреть перед мержем:** major asymmetry read(sheet) vs write(columns) при `character.hp_* is None`.
