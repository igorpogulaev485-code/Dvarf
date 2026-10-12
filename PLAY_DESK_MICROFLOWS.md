# Dvarf — микро-флоу цифрового листа / play desk

Инвентарь **конкретных UI-действий** на листе персонажа. Источники: `git show` / `git grep` по tip-веткам (код **не** на `main`).

| Ветка | Роль | Дата tip (commit) |
|-------|------|-------------------|
| `origin/cursor/mobile-play-desk-2c91` | Линия **mobile play-desk** (режимы + плотность панелей на телефоне; manual save) | 2026-10-12 |
| `origin/cursor/play-desk-layout-e788` | Предок mobile; desktop режимы Бой·Исслед.·Общение·Напарники + panel select | 2026-10-11 |
| `origin/cursor/wave-a-listva-a73e` | **Wave A** desk (шапка vitals, compact-сцены, autosave, Отдых/HpPad) | 2026-10-12 |
| `origin/cursor/desk-vitals-wave-a73e` | Vitals/header Wave A; в своих docs заявляет себя prod tip | 2026-10-12 |

**Важно:** `mobile-play-desk-2c91` **не** содержит Wave A (`PlayDeskHeader`, `RestDialog`, `HpPadDialog`, compact-панели). Wave A **не** ancestor mobile. Ниже помечено **[MOB]** / **[WAVE]** / **[оба]**.

Общий вход: `/characters/:id` → `CharacterDetailPage` → `MinimalSheetEditor`.

---

## 1. Entry points & modes

### 1.1 Вход на лист `[оба]`

1. Список `/characters` → открыть карточку → `/characters/:id`.
2. После create 2014/2024 → navigate на лист; optional `location.state`: `toast`, `createGuide` (`background-first` | `class-first`), `startingLevel`.
3. Topbar: **«← К списку персонажей»** · **«Классический лист 2014»** · **«В лобби»**.
4. Баннер remote save: «Лист сохранён в другой вкладке (vN)…» → **«Позже»** / **«Обновить»**.

**Файлы:** `frontend/src/pages/CharacterDetailPage.tsx`, `frontend/src/features/characters/MinimalSheetEditor.tsx`

### 1.2 Desktop vs mobile breakpoint `[оба]`

- `matchMedia('(min-width: 960px)')` → `isPlayDesk`.
- **≥960px:** широкий стол (левая колонка характеристик + сцена).
- **&lt;960px:** мобильный layout (см. ниже).

### 1.3 Режимы стола — MOB / layout

Режимы (`desk_mode` в `sheet.ui`): **«Бой»** · **«Исследование»** · **«Общение»** · **«Напарники»**.

| Режим | Панель по умолчанию |
|-------|---------------------|
| Бой | Атаки |
| Исследование | Снаряжение |
| Общение | Тексты и заметки |
| Напарники | Напарники |

Дополнительно **select «Панель»** с опциями:

- Атаки · Характеристики · Способности · Заклинания · Снаряжение · Настройка · Напарники · Тексты и заметки · Состояния и ресурсы · Основное · Владения

На телефоне: одна активная панель (`stageHidden`); панель **«Характеристики»** доступна только через select (на desk — в left rail).

Кнопка left rail: **«Владения и языки»** (drawer).

**Файлы:** `playDeskUi.ts`, `MinimalSheetEditor.tsx`, `CombatStickyHeader.tsx`

### 1.4 Режимы стола — WAVE A

Режимы: **«Бой»** · **«Исследование»** · **«Общение»** · **«Напарники»** · **«Способности»** · **«ЕЩЁ»**.

Подсказки (`MODE_HINT`):

- Бой: «Бой: атаки + заклинания рядом»
- Исследование: «Исследование: снаряжение + заклинания рядом»
- Общение: «Общение: тексты + заклинания рядом»
- Напарники: «Напарники: свита и призывы»
- Способности: «Способности: умения и ресурсы класса»
- ЕЩЁ: «ЕЩЁ: основное, состояния, настройка, владения — потом разберём»

| Режим | Primary | Split (заклинания справа) |
|-------|---------|---------------------------|
| Бой | Атаки | да (default `desk_split` on) |
| Исследование | Снаряжение | да |
| Общение | Тексты | да |
| Напарники | Напарники | нет |
| Способности | Способности | нет |
| ЕЩЁ | tabs: Состояния и ресурсы · Основное · Настройка · Владения | нет |

Chrome на desk:

- Roll mode: **«норм»** / **«преим.»** / **«помеха»**
- Toggle: **«Заклинания»** ↔ **«без заклинаний»**
- Hot bar: **«Состояния: …»**, **«Концентрация: … / Снять»**, ресурс-пипы
- Skill strip по режиму (клик → toast-бросок)
- Compact-панели + ссылка **«полностью»** → full editor; бар **«← компактно»**
- Dock **«Напарники»** (клик → режим Напарники)

На **mobile WAVE** (&lt;960px): `CombatStickyHeader` вместо `PlayDeskHeader`; mode chrome скрыт; `stageHidden` = false → **все панели стеком** (WIP относительно MOB one-panel).

**Файлы:** `playDeskUi.ts`, `MinimalSheetEditor.tsx`, `PlayDeskHeader.tsx`, `PlayDeskHotBar.tsx`, `PlayDeskSkillStrip.tsx`, `PlayDesk*Compact.tsx`

---

## 2. Combat header / vitals

### 2.1 [MOB] `CombatStickyHeader` — aria «Боевой статус»

Показ: имя (или **«Без имени»**), подзаголовок раса—класс / **«Черновик»**, уровень.

| Действие | UI |
|----------|-----|
| Вдохновение | чип **«Вдохновение»** — toggle |
| Истощение | чип (правка в «Состояния и ресурсы») |
| Death saves | при `isDying` / HP≤0: пипы **«Успехи»** / **«Провалы»** |
| Концентрация | имя + снять |
| КД | override или auto; title hint; сброс вручную |
| Скорость | number |
| Текущие HP | tap → `NumberPadDialog` **«Текущие HP»**: **«Вылечить»** / **«Урон»** |
| Макс HP | tap → **«Макс. HP по уровням»** → **«Применить»** |
| Инициатива | override / auto от ЛОВ + черты |

**Файлы:** `CombatStickyHeader.tsx`, `MaxHpByLevelsDialog.tsx`, `ui` NumberPadDialog

### 2.2 [WAVE] `PlayDeskHeader` — aria «Шапка стола»

| Действие | UI |
|----------|-----|
| Имя / раса / alignment | клик alignment → режим **ЕЩЁ** → **Основное** |
| Классы | chips уровней |
| XP | клик → pad: **«Начислить»** / **«Убавить»**, reason «бой, квест, награда…», **«История (N)»** / **«Скрыть историю»** |
| Скор. | walk + alt **лаз./плав./полёт** |
| Инициатива | клик → toast броска |
| БМ | read-only |
| Вдохновение | **да** / **—** toggle |
| Истощение | цикл 0→6→0; stage label |
| Монеты | → `CoinPadDialog` **«Монеты»** (З/С/М/П/Э): взять/отдать, `З=0`… |
| **«Отдых»** | → `RestDialog` |
| Хиты | → `HpPadDialog` **«Хиты»**: цифры → **«Временные»** / **«Лечение»** / **«Урон»**; **«Максимум…»**; кости; death **«При смерти»** + пипы |
| Death row | skull toggle + **Успехи** / **Провалы** |
| Урон при концентрации | dialog **«Концентрация»**: **«Удержал»** / **«Сорвалось»** (Сл max(10,⌊dmg/2⌋)) |

Hot bar **[WAVE]:** **«Состояния: нет|…»** → `HotConditionsDialog` title **«Состояния»**, primary **«Готово»**: уровень истощения, поиск «Найти состояние…», теги, **«Снять»**.

**Файлы:** `PlayDeskHeader.tsx`, `HpPadDialog.tsx`, `CoinPadDialog.tsx`, `HotConditionsDialog.tsx`, `RestDialog.tsx`, `PlayDeskHotBar.tsx`

### 2.3 [оба] Панель состояний

- **[MOB]** `PlayPanel` title **«Состояния и ресурсы»**: temp HP, кости, short/long rest inline, death saves, conditions.
- **[WAVE]** `PlayPanel` title **«Состояния»**: только conditions; hint: хиты/кости/смерть — в pad; отдых — кнопка **«Отдых»**.

---

## 3. Abilities / skills / saves / passives `[оба]`

Left rail (desk) или панель **«Характеристики»** (mobile MOB):

1. Перетащить порядок характеристик (⋮⋮).
2. Свернуть/развернуть навыки у характеристики.
3. Править базовый score; effective с gear — buffed.
4. Клик модификатора — проверка (toast на WAVE skill strip / roll mode).
5. Клик спасброска — toggle владения.
6. Клик навыка: цикл **нет → владение → Эксп. → нет**.

Пассивы (всегда видны): **«Внимательность»** · **«Анализ»** · **«Проницательность»**.

Подпись колонки: «название ▾ · ⋮⋮ порядок · клик по навыку: владение / экспертиза».

Метки: СИЛ/ЛОВ/ТЕЛ/ИНТ/МУД/ХАР; навыки — Акробатика, Атлетика, Скрытность, … (см. `SKILL_DEFS`).

**[WAVE]** skill strips:

- Бой: Атлетика, Акробатика, Скрытность, Внимательность, Анализ, Медицина
- Исследование: Внимательность, Анализ, Скрытность, Выживание, Атлетика
- Общение: Убеждение, Обман, Проницательность, Запугивание, Выступление  
  Скрытность + доспех с помехой → toast «· помеха от доспеха» / «· доспех отменил преим.»

**Файлы:** `AbilitySkillsColumn.tsx`, `sheetTypes.ts`, `deskRolls.ts` [WAVE]

---

## 4. Rest (short / long)

### 4.1 [MOB] inline в `PlayPanel`

1. Открыть панель **«Состояния и ресурсы»**.
2. **Короткий отдых:** выбрать кость → **«Потратить кость · +N HP»**; отдельно **«Сброс коротких ресурсов»** (toast про pact/короткие ресурсы).
3. Edge: «Нужна кость…», «Задай максимум HP…», «Сначала выбери кость…», «Нет доступных костей…».
4. **«Продолжительный отдых»**: полные HP, половина костей, ячейки/pact, ресурсы, −1 истощение, сброс death saves.

### 4.2 [WAVE] `RestDialog` title **«Отдых»**

1. Header **«Отдых»** → dialog.
2. Hint: короткий = кости + сброс «короткий»; продолжительный = HP, ячейки, ресурсы, −1 истощение.
3. Поля: кость / класс, **«Временные HP»**.
4. Блок **«Короткий отдых»**: пипы костей → **«Потратить кость»** + **«Сброс коротких ресурсов»**.
5. Блок **«Продолжительный отдых»** → кнопка **«Продолжительный отдых»**.
6. Primary dialog: **«Закрыть»**.

**Файлы:** `PlayPanel.tsx` [MOB], `RestDialog.tsx` [WAVE]

---

## 5. Attacks / weapons `[оба]` (+ compact WAVE)

### Full `AttacksPanel` title **«Атаки»**

1. Пусто → «Пока нет атак — добавь первую или оружие в инвентарь.»
2. Добавить строку атаки; имя из combobox оружия.
3. Править характеристику, урон, тип урона, кол-во (метательные).
4. Тег **«природное»** / «С расы» — ограничено.
5. Sync с инвентарём: held оружия ↔ атаки.

### [WAVE] `PlayDeskAttacksCompact`

1. Список атак: клик → toast броска атаки/урона (с учётом норм/преим./помеха).
2. **«взять»** / **«убрать»** (held).
3. Секция **«Расходники»**: избранное до 3; **«потратить»**; **«+ в избранное (N/3)»**; picker «выбери предмет…».
4. Ресурс-кнопки умений: **«потратить»**.
5. **«полностью»** → full AttacksPanel.

**Файлы:** `AttacksPanel.tsx`, `PlayDeskAttacksCompact.tsx`, `heldEquip.ts`, `startingGearAttacks.ts`

---

## 6. Inventory / gear / wear / held / attunement / AC

### 6.1 Full `InventoryPanel` title **«Инвентарь»** `[оба]`

Toolbar: **«Из справочника»** → `GearPickerDialog` **«Справочник снаряжения»** (**«Добавить»**); **«Своя строка»**.

Фильтры: **«Все»** · **«Надето»** · **«Оружие»** · **«Доспех»** · **«Наборы»** · **«Прочее»**.

На карточке:

1. Toggle equip: оружие **«В руках»**/**«Убран»**; щит **«В руке»**/**«Не в руке»**; прочее **«Надето»**/**«Снято»**.
2. Hands conflict: двуручное вытесняет; max 2 one-hand.
3. Без владения доспехом → blocked chip + toast «Доспех снят — нет владения» / «Снято без владения: …».
4. Pack: **«Раскрыть»** / **«Раскрыть набор»** / **«Свернуть набор»**.
5. Детали: Предмет, КД/тип брони, вес, кол-во, шаблон брони, **«Для заклинаний»** (фокус/мешочек), **«Слот ношения»** (Плащ, Кольцо…), **«Настройка»** chip **«Нужна настройка»**/**«Без настройки»**, примечания, **«Удалить»**.
6. Перегруз: «Перегруз: итого больше лимита переноски (СИЛ × 15).»
7. Монеты в панели (MOB/layout); WAVE также через header CoinPad.

AC: auto от надетого доспеха/щита/стиля/магии; override в sticky/header.

### 6.2 [WAVE] `PlayDeskExploreCompact` title **«Снаряжение»**

Ноша, монеты, **«Надето → КД»**, слоты настройки, список (теги **надето** / **в бою**), star в расходники боя (max 3).

### 6.3 `AttunementPanel` title **«Настройка (attunement)»** `[оба]`

1. До N слотов PHB; **«+ слот»**.
2. Select «Из инвентаря (нужна настройка…)» или вручную название/заметки.
3. Привязка **автоматически надевает** wear/armor/shield → toast «Настроено и надето: …».
4. **«Удалить»** слот.
5. Warning если предметов с флагом больше лимита.

**Файлы:** `InventoryPanel.tsx`, `GearPickerDialog.tsx`, `AttunementPanel.tsx`, `wearEquip.ts`, `heldEquip.ts`, `attunement.ts`, `gearEffects.ts`, `PlayDeskExploreCompact.tsx`

---

## 7. Spells / grimoire / cast / upcast / prepare / pact `[оба]`

### Full `SpellsPanel` title **«Заклинания»**

1. Сводка: Спасбросок / Атака / Известно|Подготовлено / Заговоры; чипы фокуса и мешочка компонентов.
2. **«Настройки»** / **«Скрыть настройки»**: характеристика, лимит подготовки, ячейки по уровням, **Pact magic (варлок)** (включить, уровень pact, макс. ячеек).
3. **«Подготовить»** → `PrepareSpellsDialog` **«Подготовить заклинания»** (**«Готово»**).
4. **«Гримуар»** → `GrimoireDialog`: поиск; add/prepare по mode known / prepared_list / spellbook; лимиты toast («Лимит заговоров», «Лимит подготовки», «В книгу…»).
5. Список боевой / **«Все известные»**; пусто → подсказка про Подготовить/Все известные.
6. На заклинании: **«Каст»** → `CastSpellDialog`:
   - Заговор: **«Использовать заговор?»**
   - Spell: **«Кастовать заклинание?»**
   - Источник: грант / **«Ритуал»** / **Pact N** / **N-й** slot (upcast)
   - Materials: списать / «Не списывать (тест)»
   - Primary: **«Каст»** / **«Каст (Грант)»** / **«Ритуал»** / busy / blocked «Нет ячеек»
7. Концентрация занята → **«Смена концентрации»**: **«Сменить и кастовать»**.
8. Пипы ячеек: клик потратить/вернуть.

### [WAVE] `PlayDeskSpellsCompact`

Закреплённый сплит или сцена; каст → те же dialogs; теги **конц.** / **держит** / **готово**; пипы ячеек.

**Файлы:** `SpellsPanel.tsx`, `CastSpellDialog.tsx`, `GrimoireDialog.tsx`, `PrepareSpellsDialog.tsx`, `spells.ts`, `spellFocus.ts`, `spellMaterials.ts`, `PlayDeskSpellsCompact.tsx`, `SorceryPointsSpendDialog.tsx`

---

## 8. Level-up / multiclass / archetype `[оба]`

### Level-up

1. **Основное** → **«+1 уровень»** (disabled at 20) → `LevelUpDialog` **«Повышение уровня»**.
2. Chip **«Этот класс»** | **«Мультикласс»**.
3. Same: select класса; Multi: CatalogCombobox (PHB ability gates → danger reason).
4. HP: **«Среднее»** | **«Вручную»** → **«Повысить»**.
5. После: GuidedWizard / subclass pick / ASI queue; toast «Уровень класса +1…» / «Мультикласс: Name 1…».

### ASI

`ClassAsiDialog`: **«Увеличение характеристик · Class N»** — +2 / +1×2 / **«Черта»** → `FeatSetupDialog` **«Взять черту»**; **«Позже»**.

### Archetype change

1. Combobox архетипа в **Основное** → confirm `SubclassChangeConfirmDialog` **«Сменить архетип?»**.
2. **«Все способности»** | **«Только будущие уровни»**; optional copy note to Заметки; **«Сменить»**.
3. Setup `SubclassSetupDialog` **«…: настройка архетипа»**.

### Class / race / background setup (create & change)

- `ClassSetupDialog` **«…: настройка класса»** (мультикласс без стартового снаряжения).
- `RaceSetupDialog` / `BackgroundSetupDialog` + homebrew variants.
- `GuidedWizardDialog` **«Настройка персонажа»** / шаги: **«Далее»**/**«Готово»**, **«Позже»**.

**Файлы:** `LevelUpDialog.tsx`, `ClassAsiDialog.tsx`, `SubclassChangeConfirmDialog.tsx`, `SubclassSetupDialog.tsx`, `ClassSetupDialog.tsx`, `GuidedWizardDialog.tsx`, `ClassFeaturesPanel.tsx`

---

## 9. Race / background / class grant popups after create `[оба]`

1. `createGuide=background-first` → scroll/focus **Предыстория** (hint **«Шаг 1 · прошлое…»**); затем класс (**«Шаг 1 · основной класс…»**), раса (**«Шаг 3 · …»**).
2. Выбор из справочника → setup dialog → apply grants → toast «Раса/Предыстория/Класс «…»: …».
3. Нет пакета эффектов → toast «пока без пакета… — выставь вручную».
4. Homebrew → только имя на листе.
5. Фон/раса даёт черту → `FeatSetupDialog` title **«Черта предыстории»** / **«Черта расы»**.
6. Starting level &gt;1 → toast «Старт с N ур. — пройди выборы умений» + wizard.

**Файлы:** `MinimalSheetEditor.tsx`, `RaceSetupDialog.tsx`, `BackgroundSetupDialog.tsx`, `ClassSetupDialog.tsx`, `FeatSetupDialog.tsx`, `CharacterDetailPage.tsx`

---

## 10. Companions (напарники) `[оба]`

### Full `CompanionsPanel` title **«Спутники и напарники»**

1. **«+ Спутник»** / **«+ Напарник»**.
2. Поля: Имя, Тип (Зверь-спутник, Стальной защитник, Мистическая пушка, Дрейк, Первобытный спутник, Фамилиар, Напарник, Спутник), Хиты, КД, Скорость, Заметки; **«Убрать»**.
3. Feature summon: в `ClassFeaturesPanel` **«Использовать»** / **«Призвать спутника»** / **«Призвать напарника»**.

### Dock + compact [WAVE]

Dock всегда (named): клик → режим Напарники. Compact: статус; правка через **«полностью»**.

**Файлы:** `CompanionsPanel.tsx`, `companions.ts`, `PlayDeskCompanionsCompact.tsx`, `ClassFeaturesPanel.tsx`

---

## 11. Text blocks / notes `[оба]`

`TextBlocksPanel` title **«Тексты и заметки»**.

Фильтры: **«Все»** · **«Личность»** · **«Умения»** · **«Заметки»** · **«С ресурсом»** · **«Скрытые»**.

Действия: reorder ↑↓, expand, edit заголовок/текст, bind resource (**«В блок…»**), **«Показать»**/**«Скрыть»**, **«Удалить»**, **«Добавить блок»**.

[WAVE] `PlayDeskSocialCompact`: заполненные personality blocks → toast preview; empty → «откройте полную панель».

**Файлы:** `TextBlocksPanel.tsx`, `textBlocks.ts`, `PlayDeskSocialCompact.tsx`

---

## 12. Avatar upload on character `[оба]`

`CharacterAvatarControl` в top листа:

1. Клик / **«Загрузить»** → file input; hint **«фото»** / **«…»**.
2. Title **«Сменить аватарку персонажа»**.
3. **«Удалить»** если есть `/uploads/character-avatars/…`.
4. Errors: «Не удалось загрузить/удалить аватар».
5. Desk: actions скрыты (`showActions={!isPlayDesk}`) — на телефоне кнопки видны.

**Файлы:** `CharacterAvatarControl.tsx`, API `uploadCharacterAvatar`

---

## 13. Join lobby from sheet `[оба]`

1. Topbar **«В лобби»** → dialog **«Вступить в лобби кодом»**.
2. Field **«Код от мастера»** (hint QR `/join/КОД`), placeholder `ABC123`.
3. **«Добавить этого персонажа»** / **«Отмена»** / busy **«Добавляем…»**.
4. Success → `/lobbies/:id` + toast «Name добавлен в лобби».
5. Error → danger text.

**Файлы:** `CharacterDetailPage.tsx`, `shared/api/lobbies`

---

## 14. Autosave / version conflict

### [MOB] manual save

1. Кнопка **«Сохранить лист»** / **«Сохраняем…»**.
2. Toast **«Лист сохранён»**.
3. Conflict dialog **«Конфликт версий листа»**: **«Обновить лист»** (reload server) / **«Оставить мои правки»** (dismiss; keep local unsaved).
4. Cross-tab: BroadcastChannel → banner на `CharacterDetailPage`.

### [WAVE] autosave

1. Debounced persist on draft change.
2. Status line: **«Сохраним через мгновение…»** · **«Сохраняем…»** · **«Сохранено»** · **«Ошибка сохранения»** · **«Обновляем…»** + «Редакция … · vN».
3. Silent rebase once on `sheet_version_conflict` race.
4. Dialog **«Конфликт версий листа»**: **«Сохранить мои правки»** (overwrite server) / **«Взять с сервера»** (drop local).
5. Same cross-tab banner on detail page.

**Файлы:** `MinimalSheetEditor.tsx`, `shared/sync/characterSheetChannel.ts`, `CharacterDetailPage.tsx`

---

## 15. Classic sheet and back `[оба]`

1. С листа: **«Классический лист 2014»** → `/characters/:id/classic`.
2. Classic toolbar: **«← К карточке»**, status **«Загрузка…»** / **«Сохраняем в карточку…»** / **«Сохранено в персонажа»**, **«Печать / PDF»**, background picker.
3. Debounced autosave 500ms; publish sheet sync (открытый цифровой лист увидит remote banner).

**Файлы:** `ClassicSheetPage.tsx`, `classicSheet/*`

---

## 16. Class features / ownership / identity extras

### `ClassFeaturesPanel` title **«Умения классов»** `[оба]`

- Pending choices chips **«не выбрано»**.
- Resource pips; metamagic / flexible casting (sorcerer) → `SorceryPointsSpendDialog` **«Очки чародейства»**.
- Wild shape / similar: **«Использовать»**; success lock «Заблокировано после успеха — снимите блок через 7 дней.»
- Summon buttons (см. companions).
- [WAVE] compact: spend resource on click; race darkvision; feats toast.

### Ownership drawer

**«Владения и языки»** [MOB] / **«Владения · языки и инструменты ▸»** [WAVE] → drawer **«Владения»**:

- `EquipmentProficienciesPanel` **«Владения снаряжением»** (доспехи, оружие)
- `LanguagesToolsPanel` **«Языки и инструменты»**

### Identity panel **«Основное»**

Имя, уровень + **«+1 уровень»**, XP, БМ, классы/архетипы, раса, размер (read-only from race), предыстория, мировоззрение; блок **«Скорости и зрение»** (ТЗ, лазание, плавание, полёт).

**Файлы:** `ClassFeaturesPanel.tsx`, `EquipmentProficienciesPanel.tsx`, `LanguagesToolsPanel.tsx`, `XpProgressField.tsx`, `PlayDeskFeaturesCompact.tsx`

---

## 17. Edge cases / stubs (UI handles)

| Ситуация | Поведение |
|----------|-----------|
| HP ≤ 0 | Death UI в шапке/pad; toast WAVE «HP ≤ 0 — спасброски…» |
| Нет max HP before short rest / hit die | Toasts блокируют spend |
| Armor not proficient | Equip blocked / auto-unequip toast |
| Encumbered | Danger line СИЛ×15 |
| Attunement &gt; PHB limit | Warning; choose which slots active |
| Spell: no slots / grant exhausted | Cast primary disabled; hint отдых / грант / ритуал |
| Concentration swap | Confirm before spend slot |
| Concentration vs damage [WAVE] | Удержал / Сорвалось |
| Multiclass ability gates | Class hidden / danger reason |
| Catalog miss (race/class/bg) | Homebrew name-only or «без пакета» |
| Feat catalog incomplete in GuidedWizard | Button **«Черта (скоро)»** disabled |
| Pack expand fail | busy state; catalog hydrate |
| Combat favorite &gt; 3 [WAVE] | Toast «Уже 3 избранных» |
| Stealth + armor disadvantage [WAVE] | Forces disadvantage / cancels advantage |
| Version conflict | См. §14 (разные кнопки MOB vs WAVE) |
| Remote tab save | Banner Позже/Обновить |
| WAVE mobile | Нет mode chrome; все панели видны (не one-panel как MOB) |
| Session combat / loot from sheet | Нет (дырки продукта) |

---

## 18. Key Russian labels (cheat sheet)

**Modes (MOB):** Бой · Исследование · Общение · Напарники  
**Modes (WAVE):** + Способности · ЕЩЁ  

**Panels:** Атаки · Характеристики · Способности · Заклинания · Снаряжение · Настройка · Напарники · Тексты и заметки · Состояния и ресурсы · Основное · Владения  

**Chrome:** В лобби · Классический лист 2014 · Сохранить лист · Отдых · Лечение/Урон/Вылечить · При смерти · Успехи/Провалы · Вдохновение · Истощение · Концентрация · Снять · Гримуар · Подготовить · Каст · +1 уровень · полностью · ← компактно · норм/преим./помеха  

**Dialogs:** Конфликт версий листа · Вступить в лобби кодом · Повышение уровня · Сменить архетип? · Отдых · Хиты · Монеты · Состояния · Кастовать заклинание? · Смена концентрации · Черта предыстории · Макс. HP по уровням  

---

## 19. File index by area

| Area | Paths under `frontend/src/` |
|------|------------------------------|
| Entry | `pages/CharacterDetailPage.tsx`, `pages/ClassicSheetPage.tsx`, `App.tsx` |
| Shell / modes | `features/characters/MinimalSheetEditor.tsx`, `playDeskUi.ts` |
| Vitals MOB | `CombatStickyHeader.tsx`, `PlayPanel.tsx`, `MaxHpByLevelsDialog.tsx` |
| Vitals WAVE | `PlayDeskHeader.tsx`, `PlayDeskHotBar.tsx`, `HpPadDialog.tsx`, `CoinPadDialog.tsx`, `HotConditionsDialog.tsx`, `RestDialog.tsx` |
| Abilities | `AbilitySkillsColumn.tsx`, `sheetTypes.ts`, `deskRolls.ts` |
| Attacks | `AttacksPanel.tsx`, `PlayDeskAttacksCompact.tsx`, `heldEquip.ts` |
| Inventory | `InventoryPanel.tsx`, `GearPickerDialog.tsx`, `wearEquip.ts`, `inventory.ts`, `inventoryPacks.ts`, `gearEffects.ts`, `PlayDeskExploreCompact.tsx` |
| Attunement | `AttunementPanel.tsx`, `attunement.ts` |
| Spells | `SpellsPanel.tsx`, `CastSpellDialog.tsx`, `GrimoireDialog.tsx`, `PrepareSpellsDialog.tsx`, `spells.ts`, `PlayDeskSpellsCompact.tsx`, `SorceryPointsSpendDialog.tsx` |
| Level / grants | `LevelUpDialog.tsx`, `ClassAsiDialog.tsx`, `ClassSetupDialog.tsx`, `RaceSetupDialog.tsx`, `BackgroundSetupDialog.tsx`, `SubclassSetupDialog.tsx`, `SubclassChangeConfirmDialog.tsx`, `FeatSetupDialog.tsx`, `GuidedWizardDialog.tsx` |
| Features | `ClassFeaturesPanel.tsx`, `PlayDeskFeaturesCompact.tsx` |
| Companions | `CompanionsPanel.tsx`, `companions.ts`, `PlayDeskCompanionsCompact.tsx` |
| Texts | `TextBlocksPanel.tsx`, `textBlocks.ts`, `PlayDeskSocialCompact.tsx` |
| Ownership | `EquipmentProficienciesPanel.tsx`, `LanguagesToolsPanel.tsx` |
| Avatar | `CharacterAvatarControl.tsx` |
| Sync | `shared/sync/characterSheetChannel.ts` |
| Classic | `features/classicSheet/*` |

---

## 20. How to refresh this map

```bash
git fetch origin
git ls-tree -r --name-only origin/cursor/wave-a-listva-a73e -- frontend/src/features/characters/
git grep -n "Бой\|Отдых\|Каст\|Конфликт" origin/cursor/mobile-play-desk-2c91 -- frontend/src/features/characters/
git show origin/<tip>:frontend/src/features/characters/playDeskUi.ts
```

При смене tip — обнови таблицу веток в шапке и пометки [MOB]/[WAVE].
