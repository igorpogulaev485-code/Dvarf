# Live seed waves for D&D 2024 (P24-01+)

Идемпотентный сид читает **только** JSON из этой папки (`edition_2024_catalog_seed.py`).

Сырой дамп `../catalog.json` **не** является источником истины и этой пачкой не активируется.

Эталонные списки: `docs/edition-2024/sources/` (P24-00).

## Волны

| Файл | Пачка | Содержание |
|------|-------|------------|
| `species_srd.json` | P24-C01 | 9 видов SRD (`kind=race`, `rules_edition=2024`) |
| `backgrounds_srd.json` | P24-C01 | 4 предыстории SRD |
| `feats_srd.json` | P24-C02 | 17 черт SRD (`kind=feat`) |
| `weapons_srd.json` | P24-C03 | 38 оружий SRD (`kind=weapon`, `data.mastery`) |
| `armor_srd.json` | P24-C03 | 12 доспехов + щит (`kind=armor`) |
| `equipment_srd.json` | P24-C03 | снаряжение / инструменты / наборы / боеприпасы / фокусы (`kind=item`) |
| `weapon_mastery_srd.json` | P24-C03 | словарь 8 свойств мастерства (не `catalog_entries`) |

## Схема карточек (контракт)

- оружие: поле `data.mastery` отдельно, не в `properties`; категория simple/martial, melee/ranged
- доспех: `armor_kind`, `base_ac`, `dex_bonus`, Strength, Stealth, don/doff
- снаряжение (`item`): `equipment_group`, опционально `utilize_ru` (данные, без автоматики боя)
- вид (`race`): `ability_bonuses` пустой объект; без языков с вида; наследия в `lineages`
- предыстория: `data.asi` (три характеристики), `data.origin_feat` (id + имя → карточка черты C02)
- черта: `data.category` (`origin` / `general` / `fighting_style` / `epic_boon`), `prerequisites`, `repeatable`, `ability_score_increase`, короткое `summary_ru` / `traits_text`
- `source` вида `srd-5.2` → `content_layer: srd`

Не сидить: Culture, Engineering, пустые заглушки классов/видов/предысторий, книжный контент сверх SRD (в т.ч. FRHoF из `equipment.csv`).
