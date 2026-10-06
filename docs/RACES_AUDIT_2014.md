# Аудит рас PHB 2014 (ttg.club / dnd.su → каталог → попап → apply/revoke → прод)

Источник правды: [ttg.club / 5e14](https://5e14.ttg.club/races) · зеркало [dnd.su](https://dnd.su/race/).  
Прод tip: `cursor/race-setup-grants-f10e` · http://201.34.132.252/

| Раса | ttg/dnd.su разновидности | В каталоге | Попап forks | Prod verify | Заметки |
|------|--------------------------|------------|-------------|-------------|---------|
| Дварф | 6: горный/холмовой PHB, дуэргар MTF, щитовой/золотой SCAG, метка опеки ERLW | ✅ 6 | ✅ `subrace_required` | ✅ | Smoke 2026-10-06 |
| Эльф | PHB высший/лесной/дроу + MToF эладрин/морской/шадар-кай | ✅ 6 | ✅ | ✅ | alembic `a4b5`; астральный — отдельная раса на ttg; метка тени/бледный — вне среза |
| Полурослик | PHB легконогий/коренастый + SCAG призрачный + ERLW исцеление/гостеприимство | ✅ 5 | ⏳ | ⏳ | EGW лотосденский — вне среза (как EGW у эльфа) |
| Гном | PHB лесной/скальный + глубинный + ERLW метка письма | ✅ 4 | ⏳ | ⏳ | |
| Человек | base + variant (+ ERLW метки) | 1 child | — | — | Метки ERLW — gap |
| Драконорождённый | ancestry choice | 0 subrace | — | — | FTD/EGW варианты — gap |
| Полуэльф | PHB + SCAG Фаэрун + ERLW метки | 0 | — | — | SCAG heritages — gap |
| Полуорк | PHB + ERLW метка поиска | 0 | — | — | |
| Тифлинг | PHB + SCAG Фаэрун + MTF bloodlines | 0 | — | — | SCAG/MTF — gap |

## Чеклист на расу

1. Список разновидностей на ttg (или dnd.su как зеркало).
2. Строки в `backend/data/races/phb2014_race_catalog_spec.json` + alembic upsert.
3. В попапе: только корни в combobox; forks внутри Dialog с меткой source.
4. Apply/revoke ASI + ledger (`race_grant`).
5. Deploy + DB/UI: число children, `subrace_required`.
