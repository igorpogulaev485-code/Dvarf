# Live seed waves for D&D 2024 (P24-01+)

Идемпотентный сид читает **только** JSON из этой папки (`edition_2024_catalog_seed.py`).

Сырой дамп `../catalog.json` **не** является источником истины и этой пачкой не активируется.

Эталонные списки: `docs/edition-2024/sources/` (P24-00).

## Волны

| Файл | Пачка | Содержание |
|------|-------|------------|
| `species_srd.json` | P24-C01 | 9 видов SRD (`kind=race`, `rules_edition=2024`) |
| `backgrounds_srd.json` | P24-C01 | 4 предыстории SRD |

## Схема карточек (контракт)

- оружие: поле `data.mastery` отдельно, не в `properties`
- вид (`race`): `ability_bonuses` пустой объект; без языков с вида; наследия в `lineages`
- предыстория: `data.asi` (три характеристики), `data.origin_feat` (id + имя; карточки черт — C02)
- черта: `data.category`
- `source` вида `srd-5.2` → `content_layer: srd`

Не сидить: Culture, Engineering, пустые заглушки классов/видов/предысторий, книжный контент сверх SRD.
