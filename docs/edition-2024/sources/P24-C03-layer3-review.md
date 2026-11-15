# P24-C03 — файл для ручной сверки (слой 3)

Агент, собравший данные, **не принимает** слой 3. Сверяет Игорь / отдельный проверяющий / Илья.

## Источники

| Что | С чем сверять |
|-----|----------------|
| Состав оружия (38) + mastery | SRD 5.2.1 PDF / Equipment → Weapons; `weapons.csv` (`srd=true`) |
| Доспехи (13) | SRD 5.2.1 Armor table; `armor.csv` |
| Снаряжение / инструменты / наборы / боеприпасы / фокусы | SRD 5.2.1 Tools + Adventuring Gear; `equipment.csv` (`srd=true`) |
| Русские имена | next.dnd.su + `discrepancies.md` («Предложено» → `name_ru_pending`) |
| Словарь mastery (8) | SRD 5.2.1 Mastery Properties; `weapon_mastery_srd.json` |

## Выборка (приоритет)

1. **Доспехи** — раньше почти все `srd=false`; теперь все 13 `true` (включая Plate / Padded).
2. **Musket / Pistol** — в SRD 5.2.1; mastery Slow / Vex.
3. **Кинжал / скимитар** — mastery Nick; properties без токена mastery.
4. **Щит** — `armor_kind=shield`, `base_ac=+2`, без don/doff доспеха.
5. **Thieves' Tools / Healer's Kit / Ball Bearings** — поле `utilize_ru` данными, без автоматики.
6. **Burglar's Pack** — был пропуском эталона; добавлен и засижен.
7. **FRHoF** (`bandore`, грибные плащи…) — **не** в живом сиде.
8. **Potion of Healing / Spell Scroll** — не в C03 (см. `gaps.md` → magic_items).

## Ожидаемые количества

| Тип | Active 2024 (SRD) |
|-----|-------------------|
| weapon | 38 |
| armor | 13 |
| item (equipment) | 134 |
| mastery dictionary | 8 |

## Карточки продукта

- `backend/data/srd/2024/live/weapons_srd.json`
- `backend/data/srd/2024/live/armor_srd.json`
- `backend/data/srd/2024/live/equipment_srd.json`
- `backend/data/srd/2024/live/weapon_mastery_srd.json`
