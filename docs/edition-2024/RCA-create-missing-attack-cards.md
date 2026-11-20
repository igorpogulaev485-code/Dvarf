# RCA: 2024 create — inventory weapons without attack cards

**Date:** 2026-11-20  
**Branch:** `cursor/investigate-2024-fighter-equipment-7ca3`  
**Symptom (prod):** newly created D&D 2024 Fighter (Human, Noble, Tough, Defense) shows only **Безоружный удар** and **Импровизированное оружие** on Play Desk Attacks — no class starting weapons.

## Verdict

**Bug — not expected gold-vs-package behavior.**

Starting equipment **is** applied to `sheet.inventory.items` when the player picks a class package (`a` / `b`). Attack cards in `sheet.weapons` are **never** materialized on the 2024 create path. The desk attack list is driven by `sheet.weapons` + kit rows (unarmed / improvised), so the UI shows only the kit.

Noble background, Tough (species origin feat), and Defense fighting style do **not** strip weapons.

## Repro (local validate, no DB)

```text
class_equipment = "a"  # Fighter package A
→ inventory: chain-mail, greatsword, flail, javelin×8, dungeoneer's pack, …
→ sheet.weapons = []
```

Same empty `weapons[]` for barbarian / rogue / wizard / cleric creates. Systemic to P24 create, not Fighter-only.

## Flow map

### 1. Frontend payload

| Piece | Path |
|---|---|
| Wizard | `frontend/src/pages/CreateCharacter2024Page.tsx` → `createCharacter2024(payload)` |
| Payload builder | `frontend/src/features/createPipeline2024/createPipeline2024Types.ts` → `toCreate2024Request` |
| Fields | `class_equipment: state.classEquipment` (default `'a'`), `background_equipment: state.backgroundEquipment` (default `'pack'`) |
| Class pack UI | `Create2024Picks.tsx` — chip group «Снаряжение класса» (`a` / `b` / `gold`) |
| API | `frontend/src/shared/api/characters.ts` → `POST /characters/create-2024` |

Payload correctly sends the chosen pack id. Preview inventory (`create2024SheetPreview.ts`) lists pack items; it never builds attack cards either (preview-only).

### 2. Backend create / persist

| Piece | Path |
|---|---|
| Router | `backend/app/api/routers/characters.py` → `create_character_2024` |
| Service | `backend/app/services/character.py` → `CharacterService.create_2024` |
| Sheet build | `backend/app/dnd/edition_2024_create.py` → `validate_create_2024` → `_build_sheet` |
| Equipment validate | `_validate_equipment` (requires pack id in class `starting_equipment`) |
| Inventory fill | `_build_sheet` `_push_item` from `class_pack["items"]` + background pack/gold |

`_build_sheet` starts from `empty_character_sheet()` (`weapons: []`). It fills inventory (and copies `damage` / `weapon_grip` onto rows — comment: «Weapon damage for attack cards») but **never assigns `sheet["weapons"]`**.

Persisted sheet therefore has gear in inventory and an empty weapons array.

### 3. Fighter 2024 starting equipment (SRD live)

From `backend/data/srd/2024/live/classes_srd.json` entry `fighter`:

| id | Contents |
|---|---|
| `a` | Chain mail, greatsword, flail, 8 javelins, dungeoneer's pack, 4 gp |
| `b` | Studded leather, scimitar, shortsword, longbow, arrows, quiver, pack, 11 gp |
| `gold` | 155 gp, **no items** |

Catalog ids resolve (`greatsword`, `flail`, …). Package path is fine.

### 4. How desk attacks are derived

| Piece | Path |
|---|---|
| Load | `minimalSheet/draft.ts` → `readWeapons(sheet)` ← **only** `sheet.weapons` |
| Held sync | `attacksInventorySync.ts` → `syncAttacksHeldFromInventory` — updates/prunes **existing** linked cards; **does not create** cards from inventory |
| Desk list | `kitCombatAttacks.ts` → `listDeskCombatAttacks` = persisted weapons + kit unarmed + kit improvised |

2014 create builds attack cards via `buildStartingWeaponAttacks` (`startingGearAttacks.ts`) from class/background/catalog gear. That path is **not** called from 2024 `_build_sheet`.

Equipping a starting inventory weapon on the desk only runs `syncAttacksHeldFromInventory` — still no new cards. Workaround today: add the weapon again from the catalog (`gearFromCatalog.ts` creates attacks).

### 5. Noble / Defense / Tough

| Factor | Effect on weapons |
|---|---|
| Noble pack | Gaming set, fine clothes, perfume, 29 gp — **no weapons**; does not remove class pack |
| Noble origin feat | Skilled (not Tough) |
| Human + Tough | Species origin feat choice; unrelated to gear |
| Defense style | AC feature; does not touch inventory/weapons |

If the player chose **class gold** instead of package A/B, class weapons are intentionally absent from inventory (155 gp). Noble still adds no weapons → attacks list is still only kit rows. That gold case is expected for *class* gear, but the reported Fighter-with-package case is still broken because even with items in inventory, `weapons[]` stays empty.

## Root cause (one sentence)

**P24 `_build_sheet` materializes starting gear into inventory but omits creating `sheet.weapons` attack cards; the Play Desk never invents those cards from inventory.**

## Suggested fix (parent implements; do not touch 2014)

1. In `edition_2024_create._build_sheet` (or a helper next to `_push_item`), after inventory items are built, for each inventory row that is a weapon (`kind == "weapon"` / has damage + grip), append a `sheet["weapons"]` card mirroring the 2014/frontend contract:
   - `id` (stable, e.g. `start-eq:{inventory_id}`)
   - `name` (RU)
   - `catalog_id` / slug link if available
   - `source_kind: "weapon"`
   - `ability`, `damage`, `damage_type`, `is_proficient: true`
   - `qty` when stack &gt; 1 (javelins)
   - `inventory_item_id` = inventory row id
   - `held: false` (carried; draw separately)
2. Prefer reusing the same rules as `frontend/.../startingGearAttacks.ts` / weapon presets (finesse → dex option, etc.) so desk parity holds.
3. Tests in `backend/tests/test_p24_m03_create.py`:
   - Fighter package `a` → `weapons` includes greatsword, flail, javelin (qty 8), each linked to inventory ids.
   - Fighter `gold` → no class weapon cards; gp = 155.
   - Assert inventory still present (regression).
4. Optional cleanup: set `catalog_slug` on pushed items (wizard spellbook path already expects it); noble `pack_summary_ru` parse currently yields a truncated «ду» line for «духи» — separate low-priority bug.

**Out of scope:** 2014 create/pipeline, deploy, UI kit visuals.

## Evidence commands

```bash
cd backend && PYTHONPATH=. python3 -c "
from app.dnd import edition_2024_create as c
from tests.test_p24_m03_create import build_valid_payload
sheet = c.validate_create_2024(c.payload_from_dict(build_valid_payload('fighter'))).sheet
print(len(sheet['weapons']), [i['name'] for i in sheet['inventory']['items'] if i.get('damage')])
"
# → 0 ['Двуручный меч', 'Цеп', 'Метательное копьё', ...]
```
