# Классический лист ↔ продукт (контракт)

Classic — **не второй редактор**. Это **read-only бланк для печати / PDF** того же `CharacterDetail` / `sheet`, что и Play Desk.  
Играть за экраном — в Play Desk. На игры часто приходят с распечаткой.  
Деплой classic без Play Desk / лобби / кабинета = снова overwrite.  
Связано: [`INCIDENT_OVERWRITE_2026-10-17.md`](INCIDENT_OVERWRITE_2026-10-17.md), UI-кит §2r.

---

## Связь с продуктом

| Узел | Как связано | Файлы / маркеры |
|------|-------------|-----------------|
| Маршрут персонажа | `/characters/:characterId/classic` | `App.tsx`, `LazyClassicSheetPage` |
| Пустой бланк | `/classic/blank?layout=2014\|2024` (без API) | `ClassicBlankSheetPage.tsx` |
| Вход с цифрового листа | ссылки «классический бланк» | `CharacterDetailPage.tsx`, `CharacterCard.tsx` |
| Данные | только чтение `getCharacter` / `sheet` | `ClassicSheetPage.tsx` |
| Настройки печати | узкий PATCH **только** `sheet.ui.classic_*` | `classicPrintSettings.ts`, `classicSheetLayout.ts`, `classicBlockFonts.ts` |
| Документ sheet (игровые поля) | **не пишется** с бланка | Play Desk → `updateCharacter` |
| Синхронизация вкладок | на classic **нет** BroadcastChannel | Play Desk остаётся источником правды |
| Макет 2014 / 2024 | `sheet.ui.classic_sheet_layout` | печатная форма, не `rules_edition` |
| Карандаш / доп. заметки | `classic_pencil_blanks`, `classic_extra_note_pages` | панель `no-print` |
| Типографика печати | `classic_block_fonts`, `classic_text_style`, `classic_block_sizes`, `classic_global_font_scale` | «Правка печати» |
| Холст | **A4** 210×297 mm, `@page { size: A4 }` | `classicPrint.css`, `classicPageSize.ts` |
| Напарники | страница(и) по 6 слотов, overflow → ещё страница | `classicCompanions.ts`, `classicOverflow.ts` |
| Переполнение текста/списков | доп. страницы-продолжения, не `overflow: hidden` | `classicOverflow.ts` |

**Разрешённые записи с classic** (и только они):

- `sheet.ui.classic_sheet_layout`
- `sheet.ui.classic_block_fonts`
- `sheet.ui.classic_pencil_blanks`
- `sheet.ui.classic_extra_note_pages`
- `sheet.ui.classic_text_style`
- `sheet.ui.classic_block_sizes`
- `sheet.ui.classic_global_font_scale`

**Не меняет** `rules_edition` персонажа: переключатель 2014/2024 — только макет бланка.

---

## Что обязательно на том же tip

Classic **нельзя** деплоить без:

1. Play Desk: `PlayDeskHeader`, `PlayDeskHotBar`, `MinimalSheetEditor`
2. API персонажа + кабинет/аватар/лобби (общий prod lineage)
3. Полный каталог `classicSheet/` (≥10 файлов)
4. `ClassicPrint2024` + `classicSheetLayout` + weapons/spell cards + A4 print CSS

Иначе preflight / live-count должны **упасть** (см. `deploy/preflight-prod.sh`, `preflight-live.sh`).

---

## Чеклист «classic не оторван от прода»

Перед merge / деплоем:

- [ ] `rg "path=\"/characters/:characterId/classic\"" frontend/src/App.tsx`
- [ ] `rg "path=\"/classic/blank\"" frontend/src/App.tsx`
- [ ] Ссылки на `/classic` в `CharacterDetailPage` / `CharacterCard` живы
- [ ] `ClassicPrintSheet` умеет ветку 2024 → `ClassicPrint2024`
- [ ] `ClassicSheetPage` **не** публикует BroadcastChannel и не пишет игровые поля
- [ ] `@page` / `.classic-sheet` — A4, не Letter
- [ ] counts: `classicSheet` ≥ 10, `characters` ≥ 80

После деплоя:

```bash
curl -fsS http://201.34.132.252/health
# в UI: персонаж → «классический» → подпись «Только для печати» → Печать/PDF (A4)
# настройки печати меняют только sheet.ui.classic_*; Play Desk данные те же
```

---

## Типичные ошибки (не повторять)

1. Залить «только classic» с тонкой ветки → пропадает Play Desk.
2. Вернуть запись имени/хитов/заклинаний с бланка — нарушает §2r / CL-01.
3. Считать `/dev/classic-sheet-preview` пустым бланком — для пустого есть `/classic/blank`.
4. Letter 8.5×11 вместо A4.
5. Обрезать длинные списки/`overflow: hidden` вместо страниц-продолжений.
6. Показывать пользователю `<!-- dvarf-bg-* -->` — UI обязан звать `stripDvarfInternalMarkers`.
7. Не класть `.character-card*` в `classicPrint.css` — lazy CSS classic отравляет список персонажей.
