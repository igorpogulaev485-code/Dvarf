# Аудит рас PHB 2014 (ttg.club / dnd.su → каталог → попап → apply/revoke → прод)

Источник правды: [ttg.club / 5e14](https://5e14.ttg.club/races) · зеркало [dnd.su](https://dnd.su/race/).  
Прод tip: `cursor/race-dragonborn-ftd-f10e` · http://201.34.132.252/

| Раса | ttg/dnd.su разновидности | В каталоге | Попап forks | Prod verify | Заметки |
|------|--------------------------|------------|-------------|-------------|---------|
| Дварф | 6: горный/холмовой PHB, дуэргар MTF, щитовой/золотой SCAG, метка опеки ERLW | ✅ 6 | ✅ `subrace_required` | ✅ | |
| Эльф | PHB 3 + MToF 3 + метка тени ERLW + бледный EGW + астральный AAG | ✅ 9 | ✅ | ⏳ | `a0b1` |
| Полурослик | PHB 2 + SCAG + ERLW 2 + лотосден EGW | ✅ 6 | ✅ | ⏳ | `a0b1` |
| Гном | PHB 2 + глубинный + метка письма | ✅ 4 | ✅ | ✅ | |
| Человек | PHB + variant + 5 меток ERLW | ✅ 6 | ✅ optional | ✅ | |
| Драконорождённый | PHB + 3 FTD | ✅ 3 | ✅ optional | ✅ | |
| Полуэльф | PHB + SCAG 4 + ERLW 2 | ✅ 6 | ✅ optional | ✅ | |
| Полуорк | PHB + метка поиска | ✅ 1 | ✅ optional | ✅ | |
| Тифлинг | PHB + MToF 8 + SCAG feral | ✅ 9 | ✅ optional | ✅ | |

## Чеклист на расу

1. Список разновидностей на ttg (или dnd.su как зеркало).
2. Строки в `backend/data/races/phb2014_race_catalog_spec.json` + alembic upsert.
3. В попапе: только корни в combobox; forks внутри Dialog с меткой source.
4. Apply/revoke ASI + ledger (`race_grant`).
5. Deploy + DB/UI: число children, `subrace_required`.

## Инфра-заметка

Актуальный tip head: `f9a0b1c2d3e4` (драконорождённый FTD). Новые миграции: `down_revision = f9a0b1c2d3e4`.
