# MAG-01 — блок «Магия» листа персонажа

Ветка: `cursor/ux-mag01-magic-bb39` → PR в `main` (мержит только Игорь).

## Таблица

| Пункт | Статус | Что сделано | Ключевые файлы |
|-------|--------|-------------|----------------|
| 1 Сворачивание кругов | сделано | Клик по заголовку, пустые круги свёрнуты сами, «Свернуть все» / «Развернуть все» | `PlayDeskSpellsCompact.tsx`, `17-death-saves-compact.css` |
| 2 Строка в одну линию | сделано | Тихий второй ряд мета + раскрытие ▾; «Каст» не мельче на 390 | `PlayDeskSpellsCompact.tsx`, `18-spell-compact-cards.css` |
| 3 Фильтры и поиск | сделано | Чипы все / заговоры / ритуалы / конц. / по классу + поиск | `PlayDeskSpellsCompact.tsx` |
| 4 Ритуалы из книги | сделано | Убраны из основного списка, чип «ритуалы из книги» (выкл. по умолчанию) | `PlayDeskSpellsCompact.tsx` |
| 5 Своя прокрутка | сделано | Скролл списка, шапка колонки (профили, квоты, фильтры) на месте; stage-panel overflow не трогали | `PlayDeskSpellsCompact.tsx`, `17-death-saves-compact.css` |
| 6 Плотная шапка | сделано | Строки «Класс · ХАР · Сл N · +M»; квоты по классу/режиму без «изв. 17/5» | `PlayDeskSpellsCompact.tsx`, `castProfiles.ts` |
| 7 Метка класса | сделано | Чип «бард» / «волшебник» на мультиклассе | `castProfiles.ts` (`classSlugChipLabel`), `PlayDeskSpellsCompact.tsx` |
| 8 Очки чародейства | сделано | Дубль под атаками скрыт; счётчик остаётся в хот-панели | `PlayDeskAttacksCompact.tsx` |
| 9 Метамагия | сделано | Выбор у «Каст», все выученные в окне каста (и заговоры), трата SP + смена параметров | `metamagicCast.ts`, `CastSpellDialog.tsx`, `sheetActions4.ts` |
| 10 Окно «Магия» | сделано | На мультиклассе — строки профилей с Сл/атакой | `SpellsSettingsDialog.tsx` |
| 11 «В книге 0» | сделано | Пики книги пишут `class_slug: 'wizard'`; счётчик учитывает legacy без slug | `CreateCharacterPage.tsx`, `SheetDialogsSetup.tsx`, `spells.ts` |
| 12 Волшебник 2 / 3 круг | сделано | Витрина книги: `aloneMaxLevel`, не общие ячейки | `CreateCharacterPage.tsx`, `SheetDialogsSetup.tsx` |
| 13 «изв. 17/5» | сделано | Квоты по классу через `formatNamedClassQuotas` | `castProfiles.ts`, `PlayDeskSpellsCompact.tsx` |
| 14 Одна хар-ка в «Магия» | сделано | См. п. 10 | `SpellsSettingsDialog.tsx` |
| 15 Предок-дракон | сделано | `bridgeOriginPicks` пишет `dragon_ancestor` | `pack04SorcererWarlock.ts`, `CreateCharacterPage.tsx`, `pipelineApply.ts` |
| 16 Лимит паладина | сделано | `prepareCapForSpell` всегда со `scopeSlug`; гримуар выровнен | `spells.ts`, `GrimoireDialog.tsx` |
| 17 Покровитель с первого раза | сделано | `commitSubclassSetup` резолвит устаревший `classEntryId` | `CreateCharacterPage.tsx` |

## Миграции

нет

Одна голова Alembic: `onb03usr9c2e1` (проверка: `python -m alembic heads`).

## Что не сломалось

- Шапка листа не менялась (разметка/стили/отступы).
- Хот-панель каркас без изменений (очки чародейства только там, без дубля под атаками).
- Сцены, левая панель, «Бой» / кара / действия хода (#402) не переписывались.
- Кнопка «D&D 2024» не возвращалась.
- Старая `SpellsPanel` не включалась вместо компактной колонки.

## Скрины

Артефакты в `/opt/cursor/artifacts/` (и в PR-вложениях):

**Волшебник 20:** `wiz20-collapsed-1440`, `wiz20-expanded-1440`, `wiz20-collapse-all-1440`, `wiz20-ritual-filter-1440`, `wiz20-search-1440`, `wiz20-cast-1440`, `wiz20-collapsed-390`, `wiz20-expanded-390`

**Чародей 20:** `sorc20-header-1440`, `sorc20-metamagic-row-1440`, `sorc20-cast-metamagic-1440`, `sorc20-points-1440`, `sorc20-ancestor-1440`, `sorc20-cast-metamagic-390`, `sorc20-points-390`

**Б/Ж/В 2:** `multi3-header-1440`, `multi3-class-labels-1440`, `multi3-empty-circles-1440`, `multi3-settings-1440`, `multi3-wizard2-picks-1440`, `multi3-header-390`, `multi3-class-labels-390`

**Паладин/колдун:** `pk-prepare-1440`, `pk-pact-1440`, `pk-prepare-390`

**Жрец 5:** `cleric5-desk-1440`, `cleric5-desk-390`

**Без магии:** `noncaster-combat-1440`, `noncaster-combat-390`

**Мастер / контроль:** `wizard-book-count`, `warlock-patron-first`, `hdr-pair-1440/390`, `scene-block-pair-1440`, `combat-pair-1440`

## Selfcheck

`npm run selfcheck:mag01-magic` (+ `castProfiles`, `desk-split`, `magic-sources`, `spells-settings-slots`, `hot-bar-scroll`, `PrepareSpellsDialog`).

Сиды: `backend/scripts/seed_mag01_chars.py` (логин `uikit03@example.com` / `uikit03-dev`).

## Вопросы по правилам

Нет открытых: неоднозначных мест 2014 в этом слайсе не встретили (сочетания метамагии — только Усиленное/Ищущее со второй, как в PHB/TCE).
