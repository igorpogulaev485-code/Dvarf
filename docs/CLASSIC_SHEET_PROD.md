# Классический лист ↔ продукт (контракт)

Classic — не отдельное приложение. Это **второй UI того же `CharacterDetail` / `sheet`**, что и Play Desk.  
Деплой classic без Play Desk / лобби / кабинета = снова overwrite.  
Связано: [`INCIDENT_OVERWRITE_2026-10-17.md`](INCIDENT_OVERWRITE_2026-10-17.md).

---

## Связь с продуктом (проверено на tip restore)

| Узел | Как связано | Файлы / маркеры |
|------|-------------|-----------------|
| Маршрут | `/characters/:characterId/classic` | `App.tsx`, `LazyClassicSheetPage` |
| Вход с цифрового листа | ссылки «классический бланк» | `CharacterDetailPage.tsx` |
| Данные | тот же `getCharacter` / `updateCharacter` | `ClassicSheetPage.tsx` → `shared/api/characters` |
| Документ sheet | правки через `ClassicPatch` → `sheet` | `classicSheet/fromApi.ts` |
| Синхронизация вкладок | BroadcastChannel с Play Desk | `shared/sync/characterSheetChannel` — `sheet-saved` |
| Макет 2014 / 2024 | `sheet.ui.classic_sheet_layout` | `classicSheetLayout.ts`, `ClassicPrint2024.tsx` |
| Паритет атак / оружия | те же поля, что digital | `classicWeapons.ts` |
| КД / инициатива / скорость | Play Desk считает live; `combat.ac`/`initiative` = override (null→auto). Classic показывает то же | `classicDerivedCombat.ts` (2014+2024) |
| Спеллы / карточки | sheet spells + карточки | `classicSpells.ts`, `classicSpellCards.ts` |
| Заметки / текст-блоки | `text_blocks` + classic mirrors | `fromApi.mergeClassicTextBlocks`, `classicNotes.ts` |
| Состояния / attunement | `combat.conditions`, `sheet.attunements` | `classicConditions.ts`, `classicAttunement.ts` |
| Фон бланка | picker → sheet | `ClassicBackgroundPicker.tsx` |
| Превью без персонажа | sample character | `ClassicSheetPreviewPage` + `sampleClassicCharacter.ts` |

**Не меняет** `rules_edition` персонажа: переключатель 2014/2024 — только макет бланка.

---

## Что обязательно на том же tip

Classic **нельзя** деплоить без:

1. Play Desk: `PlayDeskHeader`, `PlayDeskHotBar`, `MinimalSheetEditor`
2. API персонажа + кабинет/аватар/лобби (общий prod lineage)
3. Полный каталог `classicSheet/` (≥10 файлов; на live сейчас 17)
4. `ClassicPrint2024` + `classicSheetLayout` + weapons/spell cards

Иначе preflight / live-count должны **упасть** (см. `deploy/preflight-prod.sh`, `preflight-live.sh`).

---

## Чеклист «classic не оторван от прода»

Перед merge / деплоем:

- [ ] `rg "path=\"/characters/:characterId/classic\"" frontend/src/App.tsx`
- [ ] Ссылки на `/classic` в `CharacterDetailPage` живы
- [ ] `ClassicPrintSheet` умеет ветку 2024 → `ClassicPrint2024`
- [ ] `createSheetSyncChannel` / `publishSheetSync` в `ClassicSheetPage`
- [ ] `fromApi` пишет в тот же `sheet`, что Play Desk
- [ ] counts: `classicSheet` ≥ 10, `characters` ≥ 80
- [ ] live tip — ancestor вашей ветки; сеттинг-маркеры не выкинуты

После деплоя:

```bash
curl -fsS http://201.34.132.252/health
ssh … 'test -f /opt/dvarf/frontend/src/features/classicSheet/ClassicPrint2024.tsx'
ssh … 'test -f /opt/dvarf/frontend/src/features/characters/PlayDeskHotBar.tsx'
# в UI: персонаж → «классический» → правки → вернуться на digital → данные те же
```

---

## Типичные ошибки (не повторять)

1. Залить «только classic» с тонкой ветки → пропадает Play Desk.
2. Залить сеттинг мимо tip с classic → classic снова 3 файла.
3. Считать наличие `ClassicPrintSheet.tsx` достаточным — без 2024/parity это тонкий stub.
4. Ломать `characterSheetChannel` / `sheet_version` — classic и digital разъедутся.
5. Показывать пользователю `<!-- dvarf-bg-* -->` из гранта предыстории — UI обязан звать `stripDvarfInternalMarkers` (Play Desk + classic).
