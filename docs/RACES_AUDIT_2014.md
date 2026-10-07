# Аудит рас PHB 2014 (ttg.club / dnd.su → каталог → попап → apply/revoke → прод)

Источник правды: [ttg.club / 5e14](https://5e14.ttg.club/races) · зеркало [dnd.su](https://dnd.su/race/).  
Прод tip: `cursor/race-custom-lineage-f10e` · http://201.34.132.252/  
Гибкий ASI: `preset=tasha_flexible` (+2/+1 **или** три +1).  
Срез forks MPMM: ветка `cursor/race-mpmm-subrace-forks-f10e` · alembic `l1a2b3c4d5e6`.

| Раса | ttg/dnd.su разновидности | В каталоге | Попап forks | Prod verify | Заметки |
|------|--------------------------|------------|-------------|-------------|---------|
| Дварф | 6: горный/холмовой PHB, дуэргар MTF, щитовой/золотой SCAG, метка опеки ERLW | ✅ 6 | ✅ `subrace_required` | ✅ | |
| Эльф | PHB 3 + MToF 3 + метка тени ERLW + бледный EGW + астральный AAG | ✅ 9 | ✅ | ✅ | `a0b1` |
| Полурослик | PHB 2 + SCAG + ERLW 2 + лотосден EGW | ✅ 6 | ✅ | ✅ | `a0b1` |
| Гном | PHB 2 + глубинный + метка письма | ✅ 4 | ✅ | ✅ | |
| Человек | PHB + variant + 5 меток ERLW | ✅ 6 | ✅ optional | ✅ | |
| Драконорождённый | PHB + 3 FTD | ✅ 3 | ✅ optional | ✅ | |
| Полуэльф | PHB + SCAG 4 + ERLW 2 | ✅ 6 | ✅ optional | ✅ | |
| Полуорк | PHB + метка поиска | ✅ 1 | ✅ optional | ✅ | |
| Тифлинг | PHB + MToF 8 + SCAG feral | ✅ 9 | ✅ optional | ✅ | |

## Волна 2 — MPMM (корни combobox)

Спека: `backend/data/races/mpmm_race_catalog_spec.json` (40 строк: 24 корня + forks).  
Без дублей PHB-подрас: дуэргар / эладрин / морской эльф / шадар-кай / глубинный гном — остаются forks у PHB-родителей.

| Раса | В каталоге | Попап forks | Prod verify | Заметки |
|------|------------|-------------|-------------|---------|
| Ааракокра, багбир, … (корни без forks) | ✅ | — | ✅ | flexible ASI + Common+1 |
| Дженази | ✅ parent + 4 | ✅ `subrace_required` | ✅ | воздух / земля / огонь / вода |
| Аасимар | ✅ parent + 3 | ✅ `subrace_required` | ⏳ | Volo: защитник / каратель / падший; размер M/S |
| Шифтер | ✅ parent + 4 | ✅ `subrace_required` | ⏳ | зверошкур / длиннозуб / быстроног / дикий охотник |
| Гит | ✅ parent + 2 | ✅ `subrace_required` | ⏳ | гитъянки / гитцерай (больше не два корня) |
| Кобольд | ✅ parent + 3 | ✅ `subrace_required` | ⏳ | наследия: хитрость / неповиновение / драконье чародейство |

## Волна 3 — setting books (корни combobox)

Спека: `backend/data/races/setting_race_catalog_spec.json` (18 корней).  
Срез с dnd.su минус уже залитые PHB/MPMM; без UA/Plane Shift/homebrew.

| Блок | Расы | Prod verify |
|------|------|-------------|
| SAS/AAG | хадози, плазмоид, три-крин, автогном | ✅ |
| VRGtR | дампир, ведьмакровка, возрождённый | ✅ |
| ERLW | калаштар, кованый | ✅ |
| GGR | локсодон, ведалкен, гибрид Симик | ✅ |
| MOT/SCC | леонин, соволин | ✅ |
| Прочее | грунг, локата, вердан, кендер | ✅ |

## Чеклист на расу

1. Список разновидностей на ttg (или dnd.su как зеркало).
2. Строки в `backend/data/races/phb2014_race_catalog_spec.json` + alembic upsert.
3. В попапе: только корни в combobox; forks внутри Dialog с меткой source.
4. Apply/revoke ASI + ledger (`race_grant`).
5. Deploy + DB/UI: число children, `subrace_required`.

## Инфра-заметка

Prod tip: `cursor/race-custom-lineage-f10e`. Срез forks: `l1a2b3c4d5e6` на `cursor/race-mpmm-subrace-forks-f10e`.
