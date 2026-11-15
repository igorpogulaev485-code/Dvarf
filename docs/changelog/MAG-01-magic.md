# MAG-01 — блок «Магия» листа персонажа

Ветка: `cursor/ux-mag01-magic-bb39` → PR в `main` (мержит только Игорь).

## Таблица

| Пункт | Статус | Что сделано | Ключевые файлы |
|-------|--------|-------------|----------------|
| 1 Сворачивание кругов | сделано | Клик по заголовку, пустые круги свёрнуты сами, «Свернуть все» / «Развернуть все» (scoped aria-label) | `PlayDeskSpellsCompact.tsx`, `18-spell-compact-cards.css` |
| 2 Строка в одну линию | сделано | «Каст» edge-docked (`ui-button--edge-end`); без ▾/select; раскрытие кликом (`aria-expanded`) | `PlayDeskSpellsCompact.tsx`, `01-tokens-base.css`, `Button.tsx` |
| 3 Фильтры и поиск | сделано | Чипы все / заговоры / ритуалы / конц. / по классу + поиск | `PlayDeskSpellsCompact.tsx` |
| 4 Ритуалы из книги | сделано | Убраны из основного списка, чип «ритуалы из книги» (выкл. по умолчанию) | `PlayDeskSpellsCompact.tsx` |
| 5 Своя прокрутка | сделано | Скролл списка, chrome колонки на месте; stage-panel overflow не трогали | `PlayDeskSpellsCompact.tsx`, `18-spell-compact-cards.css` |
| 6 Плотная шапка | сделано | Строки «Класс · ХАР · Сл N · +M»; квоты по классу/режиму без «изв. 17/5» | `PlayDeskSpellsCompact.tsx`, `castProfiles.ts` |
| 7 Метка класса | сделано | Чип «бард» / «волшебник» на мультиклассе | `castProfiles.ts`, `PlayDeskSpellsCompact.tsx` |
| 8 Очки чародейства | сделано | Дубль под атаками скрыт; счётчик в хот-панели | `PlayDeskAttacksCompact.tsx` |
| 9 Метамагия | сделано | Выбор **только в CastSpellDialog**; блок «С метамагией» с временем/дистанцией; подсказка Далёкого — факт. диапазон (`150 → 300 фт.`); трата SP | `metamagicCast.ts`, `CastSpellDialog.tsx` |
| 10 Окно «Магия» | сделано | Профили по классам (в т.ч. паладин+колдун на одной ХАР) | `SpellsSettingsDialog.tsx` |
| 11 «В книге 0» | сделано | Пики книги с `class_slug: 'wizard'` | `CreateCharacterPage.tsx`, `spells.ts` |
| 12 Волшебник 2 / 3 круг | сделано | Витрина: `aloneMaxLevel` | `CreateCharacterPage.tsx` |
| 13 «изв. 17/5» | сделано | Квоты по классу | `castProfiles.ts` |
| 14 Одна хар-ка в «Магия» | сделано | См. п. 10 | `SpellsSettingsDialog.tsx` |
| 15 Предок-дракон | сделано | Мост `dragon_ancestor` + резолв слага «Наследие драконьей крови» | `pack04…`, `classFeatures.ts` |
| 16 Лимит паладина | сделано | `prepareCapForSpell` со `scopeSlug` | `spells.ts`, `GrimoireDialog.tsx` |
| 17 Покровитель с 1-го раза | сделано | Общий `resolveClassEntryIdForSubclassCommit` (колдун / друид / паладин) | `resolveClassEntryIdForSubclass.ts`, `CreateCharacterPage.tsx`, `sheetActions1.ts` |
| 4а Карточка подкласса | сделано | Gate показывает «Выбрано: …»; слага из имени/catalog_id хватает без гранта | `ClassFeaturesPanel.tsx`, `classFeatures.ts`, `useSheetEditorPart1.ts` |
| 4б Тост «Существо не выбрано» | сделано | После confirm не зовём `onClose` (скакун / фамильяр / облик) | `CompanionCreaturePickDialog.tsx`, `FamiliarPickDialog.tsx`, `SpellFormDialog.tsx` |
| Стили | сделано | Стили колонки в `18-…`; профили на токенах `--abil-*`, без хардкода цветов | `18-spell-compact-cards.css`, `08-spells-attacks.css` |

## Миграции

нет

## Что не сломалось

- Шапка листа: `hdr-pair-*-before/after` — top/height delta **0 px** (`mag01-header-measure.json`).
- Хот-панель каркас без изменений.
- Сцены, левая панель, кара / «Действие/Бонусное/Реакция» (#402) не переписывались.
- Кнопка «D&D 2024» не возвращалась; `SpellsPanel` не подменяла компактную колонку.

## Скрины (свои, без копий)

| Пункт | Файл | Что видно |
|-------|------|-----------|
| 1 свёртка 1440 | `wiz20-collapsed-1440`, `wiz20-collapse-all-1440` | Заголовки 1–9 с ячейками, заговоры свёрнуты |
| 1 разворот | `wiz20-expanded-1440`, `wiz20-expanded-390` | Список развёрнут, «Каст» справа |
| 1 390 | `wiz20-collapsed-390` | Свёртка на телефоне |
| 5 прокрутка | `wiz20-scroll-chrome-1440` | Список прокручен, chrome колонки на месте |
| 3–4 фильтры | `wiz20-ritual-filter-1440`, `wiz20-search-1440` | Чип ритуалов / поиск |
| 11 книга | `wizard-book-count`, `wizard-book-count-grimoire` | «в книге 44» |
| 2 список без ▾ | `wiz20-expanded-1440/390`, `sorc20-expanded-1440` | Имя · круг · урон · мета · Каст (без треугольника) |
| 2 Каст у края | `spell-row-cast-1440`, `spell-row-cast-390` | Каст на всю высоту, скругление `--radius-card`, без зазора |
| 2 раскрытие кликом | `spell-open-by-click-1440`, `spell-open-by-click-390` | Строка с `aria-expanded`, мета раскрыта |
| 9 метамагия в окне | `sorc20-cast-metamagic-1440` | «150 → 300 фт.» (не «касание → 30») |
| 9 после каста | `sorc20-cast-metamagic-after-1440` | Тост с Далёким; очки 19/20; ячейка |
| 8 без дубля | `sorc20-points-1440` | Очки в хот-панели, не под атаками |
| 15/4а предок | `sorc20-ancestor-1440` | «Предок-дракон · Красный (огонь)» |
| 6–7 мульти | `multi3-header-1440`, `multi3-class-labels-1440` (+ crop) | Три строки шапки; две «Волшебные руки» бард/волшебник |
| 1 пустые круги | `multi3-empty-circles-1440` | 2–3 свёрнуты с ячейками |
| 10 настройки | `multi3-settings-1440` | Три профиля Сл/атака |
| 12 витрина | `multi3-wizard2-picks-1440` | Уровни 0–1 (без 3-го круга волшебника) |
| 16 подготовка | `pk-prepare-1440` (+ `pk-prepare-quota.txt`) | Колонка: «Паладин подг. 0/4» |
| договор + кара | `pk-pact-1440`, `combat-pair-1440-pk` | Ячейки договора; кара/оружие на месте |
| 4б скакун | `pk-steed-picker-1440`, `pk-steed-after-1440` | Выбор «Боевой конь»; тост успеха, без «не выбрано» |
| 4а друид | `subclass-after-druid-1440` | «Круг луны» на карточке круга |
| 4а паладин | `subclass-after-paladin-1440` | «Священная клятва · Клятва преданности» |
| 17/4а покровитель | `warlock-patron-first` + `warlock-patron-ok.txt` | «Выбрано: Архифея»; без тоста «класс не найден» |
| регрессии | `cleric5-desk-*`, `noncaster-combat-*` | Одноклассник / без магии |
| контроль 0 px | `hdr-pair-*-before/after`, `scene-block-pair-*-*`, `combat-pair-*-*` | Пары main vs ветка |

## Selfcheck

`npm run selfcheck:mag01-magic`

Сиды: `backend/scripts/seed_mag01_chars.py` (+ друид 5, колдун 1).

Съёмка: `frontend/scripts/mag01-capture.mjs` (кнопки только внутри `.play-desk-compact--spells` / `.play-desk-compact__link--settings`).

## Вопросы по правилам

Нет открытых неоднозначностей 2014 в этом слайсе.
