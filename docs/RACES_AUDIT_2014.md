# Аудит рас PHB 2014 (ttg.club / dnd.su → каталог → попап → apply/revoke → прод)

Источник правды: [ttg.club / 5e14](https://5e14.ttg.club/races) · зеркало [dnd.su](https://dnd.su/race/).  
Прод tip: `cursor/race-setting-wave-f10e` · http://201.34.132.252/ · alembic `c2d3e4f5a6b1`

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

Спека: `backend/data/races/mpmm_race_catalog_spec.json` (29 строк: 25 корней + 4 наследия дженази).  
Без дублей PHB-подрас: дуэргар / эладрин / морской эльф / шадар-кай / глубинный гном — остаются forks у PHB-родителей.

| Раса | В каталоге | Попап forks | Prod verify | Заметки |
|------|------------|-------------|-------------|---------|
| Ааракокра … юань-ти (24 корня без дженази) | ✅ | — (нет children) | ✅ | flexible ASI + Common+1 |
| Дженази | ✅ parent + 4 | ✅ `subrace_required` | ✅ | воздух / земля / огонь / вода |

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

Актуальный tip head: `c2d3e4f5a6b1` (setting wave) на `cursor/race-setting-wave-f10e`.
