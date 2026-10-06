# Аудит рас PHB 2014 (ttg.club / dnd.su → каталог → попап → apply/revoke → прод)

Источник правды: [ttg.club / 5e14](https://5e14.ttg.club/races) · зеркало [dnd.su](https://dnd.su/race/).  
Прод tip: `cursor/race-setup-grants-f10e` · http://201.34.132.252/

| Раса | ttg/dnd.su разновидности | В каталоге | Попап forks | Prod verify | Заметки |
|------|--------------------------|------------|-------------|-------------|---------|
| Дварф | 6: горный/холмовой PHB, дуэргар MTF, щитовой/золотой SCAG, метка опеки ERLW | ✅ 6 | ✅ `subrace_required` | ✅ | Smoke 2026-10-06 |
| Эльф | PHB высший/лесной/дроу + MToF эладрин/морской/шадар-кай | ✅ 6 | ✅ | ✅ | alembic `a4b5`; астральный — отдельная раса; метка тени/бледный — вне среза |
| Полурослик | PHB + SCAG призрачный + ERLW исцеление/гостеприимство | ✅ 5 | ✅ | ✅ | EGW лотосденский — вне среза; `b5c6` |
| Гном | PHB + глубинный + ERLW метка письма | ✅ 4 | ✅ | ✅ | `b5c6` |
| Человек | base + variant (+ ERLW метки) | 1 child | — | — | Метки ERLW — gap |
| Драконорождённый | ancestry choice | 0 subrace | — | — | FTD/EGW — gap |
| Полуэльф | PHB + SCAG наследия + ERLW метки | ✅ 6 children | ✅ optional | ✅ | optional forks; `c6d7` |
| Полуорк | PHB + ERLW метка поиска | 0 | — | — | gap |
| Тифлинг | PHB base + MTF bloodlines + SCAG feral | ✅ 9 children | ✅ optional | ✅ | optional forks; `c6d7` |

## Чеклист на расу

1. Список разновидностей на ttg (или dnd.su как зеркало).
2. Строки в `backend/data/races/phb2014_race_catalog_spec.json` + alembic upsert.
3. В попапе: только корни в combobox; forks внутри Dialog с меткой source.
4. Apply/revoke ASI + ledger (`race_grant`).
5. Deploy + DB/UI: число children, `subrace_required`.

## Инфра-заметка

2026-10-06: чужой stamp `c0nd1t10nru1` на проде ломал alembic после sync (файла нет в tip). Лечение: `UPDATE alembic_version` на известный head tip → `alembic upgrade head`.
