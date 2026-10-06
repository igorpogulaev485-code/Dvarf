# Аудит рас PHB 2014 (ttg.club → каталог → попап → apply/revoke → прод)

Источник правды: [ttg.club / 5e14](https://5e14.ttg.club/races).  
Прод tip: `cursor/race-setup-grants-f10e` · http://201.34.132.252/

| Раса | ttg разновидности | В каталоге | Попап forks | Prod verify | Заметки |
|------|-------------------|------------|-------------|-------------|---------|
| Дварф | 6: горный/холмовой PHB, дуэргар MTF, щитовой/золотой SCAG, метка опеки ERLW | ✅ 6 | ✅ `subrace_required` | ✅ | Smoke 2026-10-06 |
| Эльф | PHB высший/лесной/дроу + MToF эладрин/морской/шадар-кай | ✅ 6 | ⏳ после деплоя | ⏳ | Астральный на ttg — отдельная раса, не fork; метка тени/бледный — вне текущего среза |
| Полурослик | lightfoot / stout (+ gaps?) | 2 | — | — | Далее |
| Человек | base + variant (optional) | 1 child | — | — | Далее |
| Драконорождённый | ancestry choice, no subrace | 0 | — | — | Далее |
| Гном | forest / rock (+ deep?) | 2 | — | — | Deep gnome — gap vs ttg |
| Полуэльф | heritages? | 0 | — | — | SCAG heritages — gap |
| Полуорк | — | 0 | — | — | Далее |
| Тифлинг | SCAG variants? | 0 | — | — | SCAG — gap |

## Чеклист на расу

1. Список разновидностей на ttg (или dnd.su как зеркало).
2. Строки в `backend/data/races/phb2014_race_catalog_spec.json` + alembic upsert.
3. В попапе: только корни в combobox; forks внутри Dialog с меткой source.
4. Apply/revoke ASI + ledger (`race_grant`).
5. Deploy + `curl`/UI: число children, `subrace_required`.
