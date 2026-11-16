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
| `classes_srd.json` | P24-C04 | 12 классов SRD (`kind=class`, таблица 1–20) |
| `subclasses_srd.json` | P24-C04 | 12 подклассов SRD (`kind=subclass`, по одному на класс) |
| `spells_srd.json` | P24-C05 | 339 заклинаний SRD (`kind=spell`); списки классов/подклассов заполняются здесь |
| `magic_items_srd.json` | P24-C06 | 285 магических предметов SRD (`kind=item`, `equipment_group=magic_item`) |
| `creatures_srd.json` | P24-C07 / C07R | 235 существ SRD Monsters A–Z (`kind=bestiary`; тексты пересобраны в C07R) |
| `animals_srd.json` | P24-C08 / C07R | 95 существ SRD Animals (`kind=bestiary`, `beast_tags`; тексты пересобраны в C07R) |
| `species_ph24.json` | P24-C09 | виды PHB сверх SRD (`kind=race`, `source=ph24`) |
| `backgrounds_ph24.json` | P24-C09 | 12 предысторий PHB сверх 4 SRD (`source=ph24`) |
| `subclasses_ph24.json` | P24-C09 | 36 подклассов PHB сверх 12 SRD (`source=ph24`) |
| `feats_ph24.json` | P24-C10 | 58 черт PHB сверх SRD (`kind=feat`, `source=ph24`) |
| `spells_ph24.json` | P24-C10 | 69 заклинаний PHB сверх SRD (`kind=spell`, `source=ph24`; именные → `data.srd_alias`) |
| `magic_items_dmg24.json` | P24-C11 | 196 магических предметов DMG сверх SRD (`kind=item`, `source=dmg24`; именные → `data.srd_alias`) |
| `creatures_mm24_w1.json` | P24-C13 | 86 существ MM24 сверх SRD, волна 1 до Kuo-toa Archpriest (`kind=bestiary`, `source=mm24`) |
| `creatures_mm24_w2.json` | P24-C14 | 87 существ MM24 сверх SRD, волна 2 от Kuo-toa Archpriest (`kind=bestiary`, `source=mm24`) |
| `classes_efa.json` | P24-C15 | класс артефактора EFA (`kind=class`, `source=efa`) |
| `subclasses_efa.json` | P24-C15 | 5 специальностей артефактора EFA (`source=efa`) |
| `species_efa.json` | P24-C15 | 5 видов EFA (`kind=race`, `source=efa`) |
| `backgrounds_efa.json` | P24-C15 | 17 предысторий EFA (`source=efa`) |
| `feats_efa.json` | P24-C15 | 28 черт EFA, в т.ч. драконьи метки (`source=efa`) |
| `spells_efa.json` | P24-C15 | 1 заклинание EFA — гомункул-слуга (`source=efa`) |
| `magic_items_efa.json` | P24-C15 | 9 магических предметов/реплик EFA (`source=efa`) |

## Схема карточек (контракт)

- оружие: поле `data.mastery` отдельно, не в `properties`; категория simple/martial, melee/ranged
- доспех: `armor_kind`, `base_ac`, `dex_bonus`, Strength, Stealth, don/doff
- снаряжение (`item`): `equipment_group`, опционально `utilize_ru` (данные, без автоматики боя)
- вид (`race`): `ability_bonuses` пустой объект; без языков с вида; наследия в `lineages`
- предыстория: `data.asi` (три характеристики), `data.origin_feat` (id + имя → карточка черты C02)
- черта: `data.category` (`origin` / `general` / `fighting_style` / `epic_boon`), `prerequisites`, `repeatable`, `ability_score_increase`, короткое `summary_ru` / `traits_text`
- класс: `hit_die`, владения, `subclass_level=3`, `feat_levels`, `epic_boon_level=19`, `weapon_mastery`, `starting_equipment` (id → C03), `levels` 1–20; `spell_list` — slug карточек C05 (у не-кастеров пусто)
- подкласс: `parent_class` + `parent_id`, умения по уровням; `spell_list` — домен/круг/клятва/покровитель, если есть в SRD
- заклинание: `level` 0–9, `school`, `casting_time`, `magic_action` (для unit=action), `components` (В/С/М + цена/расход), `classes`, рост заговора / усиление ячейкой; короткое `summary_ru` (без длинного текста SRD); у именных PHB — `srd_alias` на безымянную SRD-карточку
- магический предмет (`item` / `magic_item`): `magic_item_type` (доспех/оружие/палочка/кольцо/зелье/свиток/посох/жезл/чудесный), `rarity`, настройка, заряды, бонусы атаки/КД, `spell_refs` → C05/C10, `base_item_categories` → C03; у DMG сверх SRD — `source=dmg24`, опционально `srd_alias` / `sentient` / `artifact`; короткое `summary_ru`
- бестиарий (`bestiary`, C07 Monsters / C08 Animals / C13 MM24 w1): КД, хиты, скорости, ПО/опыт/БМ, инициатива, характеристики + мод + спас, `gear_refs` → C03, `spell_refs` → C05/C10; у Animals — `beast_tags` (`wild_shape_ok`, `mount`, `has_fly`, `has_swim`); у MM сверх SRD — `source=mm24`; короткое `summary_ru` / `text_ru` (без длинного текста книги и без статов 2014)
- отображаемые строки (`summary_ru`, `traits_text`, `components.m`, `casting_time.condition`, …) — по-русски; словари `spell_materials_ru.json` / `spell_reaction_conditions_ru.json`
- `source` вида `srd-5.2` → `content_layer: srd`
- `source` вида `ph24` / `dmg24` / `mm24` / `efa` → `content_layer: community_ref` (ярлык игроку не показываем)

Не сидить: Culture, Engineering, пустые заглушки. Книжный контент FR/Ravenloft/AU — следующие пачки. Артефактор 2014 (Таша) не трогать. Черты и заклинания PHB сверх SRD — C10; предметы DMG сверх SRD — C11; MM сверх SRD — C13/C14; EFA — C15.
