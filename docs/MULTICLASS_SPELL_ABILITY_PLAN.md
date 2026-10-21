# План: мультиклассная магия (источник → Сл/атака → UI-kit)

**Статус:** ok §12 · **M1–M6 в коде** · скрины desk/cast/полки/print ✅ · далее M7 UI-kit  
**Контур:** план → ok → срезы M1… → **скрины с реальных листов** → ok → прод  
**Дата:** 2026-10-21  
**План PR:** `#262` · **M1 tip base:** `cursor/restore-consumables-grimoire-0bc3`  
**Триггер:** персонаж Ильи **Квакк-Арканист** (Грунг, Изобретатель 15 — Артиллерист / Колдун 5 — Исчадие): одна атака +11 по ИНТ; бюджет заговоров 4/4 блокировал колдуна; known колдуна не настроен.  
**Ревью:** замечания агента Ильи (2026-10-21) — **приняты** как обязательные уточнения (§2).  
**Связанное:**  
- UX для игрока: [`MULTICLASS_SPELL_ABILITY_USER_STORY.md`](./MULTICLASS_SPELL_ABILITY_USER_STORY.md)  
- Гримуар-дом: [`SPELL_ACCESS_UX_PLAN.md`](./SPELL_ACCESS_UX_PLAN.md)  
- CF create feedback (U/A/C/F/E)  
- UI-kit LOCK spells: `docs/ui-kit/README.md` §2c + доски `spells` / `spell-icons`

---

## 0. Слоган

**Каждое получение заклинания хранит источник, лимит и условия применения.  
Боевой UI показывает уже рассчитанный результат.  
Игрок не переключает ИНТ/ХАР перед кастом.**

Чинить систему (контракт получения + профили каста + UI-kit), репорт Квакка = приёмка.  
Не `if (квакк)`, не выдуманные демо-листы для скринов.

---

## 1. Зачем (симптомы → дыры)

| Симптом на Квакке | Системная дыра |
|-------------------|----------------|
| Одна Сл/атака по «первому» кастеру | `SpellsState.casting_ability` + desk readout = mono |
| `заг. 4/4` блокирует колдуна | `resolveSpellLearnBudget` = бюджет **первого** кастера |
| Known/cantrips колдуна не выбрать в create | Create/grimoire шарят один mode/budget |
| Tome-заговоры видны, обычные колдуна — нет | Бюджет + шаги create; tome уже F, но MC не стыкован |
| Риск: бард+визад+колдун | Те же дыры × 3 режима обучения |

Уже **есть** и должно **встроиться**, не дублироваться:

| Уже в проде | Файлы / смысл |
|-------------|----------------|
| `source_kind` race/feat/subclass/feature/custom | `spells.ts` |
| `prepared_locked`, `prepare_source_label` | always-prepared / grants |
| `grant_cast` (заряды, short/long) | innate / черты |
| `race_grant` / `feat_grant` | innate vs spell_list |
| Pact Tome +3 вне cantrip budget | `pactTomeEffects.ts` (срез F) |
| Pact slots + shared slots в касте | `CastSpellDialog`, `casterProgression` |
| Wizard ritual from book | `isAvailableToCast` + `in_spellbook` |
| Alone-max для prepare membership | `prepareAvailability` / `maxSpellLevelForClassAlone` |
| Bonus stack `spell_dc` / `spell_attack` | `modifiers.ts` — `class_slug` scope (M3) |

Мультикласс добавляет: **привязку к классу**, **per-class бюджеты**, **шапку профилей**, **scope бонусов**, **глаголы доступа**.

---

## 2. Канон после ревью агента Ильи (LOCK смысла)

Эти пункты — часть контракта. Расхождение в коде = баг.

### 2.1. PHB

1. Known/prepared — **по классам отдельно**.  
2. Каждое known/prepared заклинание **associated with one class** → его хар-ка и фокус.  
3. Shared slots общие; pact отдельно; слоты **взаимозаменяемы**, хар-ку **не меняют**.  
4. Высокая общая ячейка **не** открывает заклинания низкоуровневому классу (alone-max).

### 2.2. Источник получения (acquisition)

Одна строка на листе = одно получение:

```
source: class | race | feat | item | feature | custom
class_slug? / class_entry_id?
ability (derived or explicit)
limits (cantrip budget / known / prepare / tome-extra / …)
cast_rules (slot | pact | grant_cast | ritual-from-book | …)
```

Раса/черта/предмет **не** получают автоматически «любую ячейку».  
Пример: Magic Initiate 2014 — свои ограничения (официальные разъяснения); грант несёт `cast_rules`, каст их уважает.

### 2.3. Шапка Сл / атаки

- Строка профиля = **класс (или грант-источник) · хар-ка · итоговые Сл · атака**.  
- Схлопывать две строки **только если итоги Сл и атаки совпали** (не «оба ХАР»).  
- Цвет хар-ки — подсказка; **текст источника обязателен**.

Канон для Квакка:

| Источник | Хар-ка | Сл | Атака |
|----------|--------|----|-------|
| Изобретатель · ИНТ | int | 19 | +11 |
| Колдун · ХАР | cha | 18 | +10 |

(БМ +6, ИНТ 20, ХАР 19 — сверка с реальным листом Ильи.)

### 2.4. Одинаковое заклинание в двух списках

- Выучил у одного класса → кастуешь **только** как этот класс.  
- Не становится автоматом заклинанием второго класса.  
- Вторая привязка — явная, с ценой бюджета:  
  *«Также выучить как колдун — займёт 1 из N известных колдуна»*.  
- В бою: **одна строка**, при касте выбор варианта, если привязок ≥ 2.  
- Классовые эффекты (напр. Wild Magic) — только если каст идёт от соответствующего класса.

### 2.5. Глаголы доступа (не «Забыть когда угодно»)

| Контекст | Глагол UI | Смысл |
|----------|-----------|--------|
| Create | Выбрать заклинания | Первичный пик в бюджет |
| Level-up | Заменить при повышении | PHB replace (1 known и т.п.), только когда разрешено |
| Prepared / spellbook morning | Изменить подготовку | Daily prepare из пула/книги |
| Override | Исправить лист | Ручное редактирование / fix |

«Выучить / Забыть» как ежедневные кнопки known-кастеров — **запрещены** в copy.

### 2.6. Статусы строки

Явные чипы (не одна кнопка «Подготовить» на все случаи):

- Подготовлено  
- Всегда подготовлено (`prepared_locked`)  
- В книге · доступно ритуалом (wizard; книга есть)  
- Известно (known-ready)  
- Заряд / раз за отдых (`grant_cast`)

Ритуал жреца ≠ ритуал волшебника: жрецу нужна подготовка; wizard — из книги без prepare.

### 2.7. Бюджеты в meta

Не безымянное `заг. 4/4 · 3/3`.

Канон:  
`Изобретатель 4/4 · Колдун 3/3 · Гримуар 3`  
На мобилке — одна строка, раскрывается.

### 2.8. Каст: ячейка до списания

До подтверждения видно:

- `Обычная, 3 круг — долгий отдых`  
- `Договор, 3 круг — короткий отдых`  
- `Заряд · Раса — длинный отдых`  
- `Ритуал · без ячейки`

Выбранный путь подсвечен до spend.

### 2.9. Create

- Последовательные шаги магии **по классам** + **обзор всех** кастер-классов.  
- Черновик можно сохранить незавершённым.  
- Полная подготовка **не** hard-gate: можно подготовить меньше лимита.

---

## 3. Целевая модель данных

### 3.1. `SpellCastProfile` (computed)

```ts
type SpellCastProfile = {
  id: string                 // classEntryId или grant-key
  kind: 'class' | 'grant'
  slug: string               // artificer | warlock | …
  labelRu: string
  ability: SpellcastingAbility
  mode: SpellLearnMode | null  // null для чистых grant-only
  aloneMaxLevel: number
  cantripsBudget: number
  leveledKnownBudget: number | null
  maxPrepared: number | null
  /** Итог после modifiers, scoped к этому источнику */
  saveDc: number
  attackBonus: number
}
```

`buildCastProfiles(classes, abilities, pb, overlays, modifiers)` — **единственный** источник шапки.

Deprecated как SoT: одиночный `casting_ability`.  
Оставить как legacy primary / fallback mono.

### 3.2. Расширение `SheetSpell`

```ts
class_slug?: string | null
class_entry_id?: string | null
/** Если одна логическая спелл-сущность с несколькими привязками — группа */
acquisition_group_id?: string | null
```

Плюс уже существующие: `source_kind`, grants, `prepared_locked`, `grant_cast`, `in_spellbook`, …

### 3.3. Бюджеты

`resolveSpellLearnBudgets(...) → SpellLearnBudget[]`  
(не один budget от первого кастера).

Sum cantrips для отображения опционален; **валидация и create — per profile**.

### 3.4. Резолв каста

```ts
resolveSpellCastStats(spell, profiles, abilities, pb, modifiers) → { dc, attack, ability, sourceLabel }
```

Все consumers: CastSpellDialog, PlayDesk, SpellsPanel, classic cards, combat log.

### 3.5. Scope бонусов (новый край)

Сейчас `spell_dc` / `spell_attack` глобальны.  
Для MC: BonusLine получает опциональный `scope?: { class_slug?: string }`  
(или эквивалент). Без scope = как сейчас (все профили).  
С scope = только профиль/заклинания этого класса.  
Selfcheck: предмет «+1 DC колдуна» не поднимает Сл изобретателя.

---

## 4. UI-kit: прокачка LOCK spells (Wave MC)

Текущий LOCK §2c — mono readout.  
После ok этой линии — **новый LOCK** (не тихо ломать Wave A без досок).

### 4.1. Что меняется в контракте UI-kit

| Было (Wave A) | Станет (Wave MC) |
|---------------|------------------|
| Один readout Сл / Атака | Список профилей-источников (класс · хар-ка · Сл · атака) |
| Одна casting ability в settings | Profiles derived; manual override только в «Исправить лист» |
| Meta `заг. n/n` без имён | Именованные карманы + Tome |
| Одна кнопка-поток в гримуаре | Секции/фильтр по профилю + глаголы из §2.5 |
| Статус «подготовлено» размыт | Чипы §2.6 |
| Каст: slot/pact есть | + явная подпись восстановления до spend |

### 4.2. Новые / обновляемые доски (обязательны)

Имена рабочие:

| Доска | Содержание |
|-------|------------|
| `dvarf-ui-kit-spells-mc-profiles.jpg` | Шапка: 1 профиль / 2 профиля равные итоги (merge) / 2 профиля разные / 3 класса |
| `dvarf-ui-kit-spells-mc-row.jpg` | Строка: badge класса, чипы статуса, dual-cast affordance |
| `dvarf-ui-kit-spells-mc-cast.jpg` | Cast dialog: пути ячейки с rest label; dual source picker |
| `dvarf-ui-kit-spells-mc-budgets.jpg` | Meta budgets named + mobile collapsed |
| `dvarf-ui-kit-spells-mc-grimoire.jpg` | Секции классов + глаголы create/level-up/prepare |
| `dvarf-ui-kit-create-mc-spells.jpg` | Create: обзор классов + шаг одного класса + draft |

Обновить `docs/ui-kit/README.md` §2c → **LOCK Wave MC** после ok скринов.  
Старые `spells.jpg` / `spell-icons.jpg` не удалять: icons остаются; profiles — дополнение.

### 4.3. Токены

Без новых цветов: ability tokens уже в ките (`int` / `cha` / `wis`…).  
Профиль-чип: soft ability + ink label источника.  
Не плодить третью палитру «магии».

### 4.4. Mobile

Шапка профилей: горизонтальный scroll или stack 2→collapse.  
Budgets: одна строка → expand.  
Parity: `docs/ui-kit-mobile` — отдельная мини-доска или кадр на той же MC-доске (телефонный viewport с **того же** реального персонажа).

---

## 5. Протокол скринов — ТОЛЬКО реальные листы

### 5.1. Запрещено

- Выдуманный «Demo Multiclass» / sample JSON ради красивой картинки.  
- Подкрученный лист агента с левыми статами «похоже на Квакка».  
- Скрины с пустым гримуаром «для схемы», если приёмка про бюджеты.  
- Подмена имени/классов на скрине.

### 5.2. Разрешённые фикстуры (приёмка)

| ID | Кто | Зачем |
|----|-----|--------|
| **R1 Квакк** | Реальный персонаж Ильи на creed20 (Грунг Art15/Warlock5) | Главный репорт: шапка 2 профиля, бюджеты, create/grim |
| **R2 Mono** | Реальный моно-кастер с прода (волшебник или жрец из живой учётки / стенда с копией прод-данных) | Регресс: UI не усложнился |
| **R3 MC stress** | Реальный мультикласс с **двумя** хар-ками на проде **или** тот же Квакк + отдельно живой бард/визад если появится | Если stress-персонажа нет — **не выдумывать**; stress закрывается selfcheck + отложенный скрин когда Илья/кто-то создаст |

Предпочтение: логин в стенд с **копией** листа Квакка с прода (export/import), не ручной набор «как будто».

### 5.3. Набор артефактов на срез (минимум)

Каждый UI-срез перед «ok → прод» кладёт в PR / walkthrough:

1. **Desk шапка** — R1: две строки Изобретатель/Колдун с цифрами.  
2. **Meta budgets** — R1: именованные карманы (+ Tome если есть).  
3. **Cast** — R1: каст изобретательского и колдунского (два кадра или одно видео).  
4. **Grimoire / create** — по срезу.  
5. **Mono regress** — R2: один кадр «как Wave A».  

Видео предпочтительнее пачки мелких скринов (walkthrough skill).  
Подпись артефакта: `character=<имя> id=<uuid> classes=…` — чтобы нельзя было подменить.

### 5.4. Доски UI-kit

Доски собираются **после** рабочих скринов с R1/R2 (кадры → композит доски), не наоборот («нарисовали доску → подогнали лист»).

---

## 6. Дорожная карта срезов

```
M0 ok решений
  → M1 модель (profiles + class_slug + selfcheck)
  → M2 бюджеты per-class
  → M3 резолв каста + шапка UI + scope bonuses
  → M4 create / level-up глаголы
  → M5 гримуар секции (стык SPELL_ACCESS)
  → M6 classic/print
  → M7 UI-kit LOCK доски + README (после скринов M3–M5)
```

Зависимости:

- **M1** блокирует всё.  
- **M2** и **M3** можно частично параллелить после M1.  
- **M4** после M2.  
- **M5** лучше после ok SPELL_ACCESS §9 *или* лёгкий фильтр класса в M3, полные секции в M5.  
- **M7** только когда есть реальные скрины.

### Срез M0 — Согласование

- [ ] Ok по §12 (решения)  
- [ ] Подтвердить доступ к **реальному** Квакку для приёмки (экспорт / стенд)  
- [ ] Зафиксировать: код до ok не писать  

### Срез M1 — Модель ✅

| Задача | Где | Статус |
|--------|-----|--------|
| `SpellCastProfile` + `buildCastProfiles` + display merge | `castProfiles.ts` | ✅ |
| `class_slug` / `class_entry_id` / `acquisition_group_id` + persist | `spells.ts` | ✅ |
| Backfill эвристика + sync | `castProfiles.ts` + `useSpellcastingSheetSync` | ✅ |
| `resolveSpellCastStats` | `castProfiles.ts` | ✅ |
| Selfcheck Квакк + stress + mono | `castProfiles.selfcheck.ts` | ✅ |

**Приёмка:** unit green; mono ≡ 1 профиль.  
**Скрины:** не обязательны (logic-only). UI шапки — M3.

### Срез M2 — Бюджеты ✅

| Задача | Где | Статус |
|--------|-----|--------|
| `resolveSpellLearnBudgets` + named meta helpers | `castProfiles.ts` | ✅ |
| Desk meta named | `PlayDeskSpellsCompact` | ✅ |
| Grimoire: per-class / sum cantrip caps + `class_slug` stamp | `GrimoireDialog` | ✅ |
| Create: cantripsMax = сумма при MC | `CreateCharacterPage` | ✅ |
| Selfcheck named meta Квакк | `castProfiles.selfcheck.ts` | ✅ |

**Приёмка R1:** meta `Изобретатель n/n · Колдун n/n · Гримуар 3` (если tome) — на скрине в M3.  
**Скрин:** вместе с M3 (нужен реальный Квакк).

### Срез M3 — Каст + шапка + modifiers scope ✅

| Задача | Где | Статус |
|--------|-----|--------|
| Шапка профилей §2.3 | `PlayDeskSpellsCompact` + CSS ability colors | ✅ |
| DEV превью клон-Квакка | `/dev/quack-spell-preview` | ✅ |
| Скрины шапка + budgets | artifacts `quack-*` | ✅ |
| Cast использует `resolveSpellCastStats` | CastSpellDialog | ✅ |
| Dual-cast picker | CastSpellDialog + desk/SpellsPanel | ✅ |
| Rest labels §2.8 | CastSpellDialog chips + banner | ✅ |
| `BonusLine.class_slug` scope | modifiers + selfcheck | ✅ |

**Скрины (клон Квакка, статы как у Ильи):**  
`quack-profiles-closeup.png` · `quack-budgets-meta.png` · `quack-spell-header-block.png` · `quack-spell-desk-full.png` · `quack-cast-dialog-*.png`

### Срез M4 — Create / Level-up (частично ✅)

| Задача | Где | Статус |
|--------|-----|--------|
| Overview + per-class open | `LevelingStep` + `initialClassFilter` | ✅ |
| Глаголы §2.5 | `spellAccessUi` + create context | ✅ |
| Draft save без полной подготовки | create (уже было) | ✅ |
| Warn duplicate learn §2.4 | `addCatalogSpellToKnown` per-slug + toast | ✅ |
| Level-up replace verbs на листе | sheet level-up | ⏳ тонкий слой |

**Приёмка:** новый Art/Warlock проходит cantrips+known колдуна; черновик сохраняется; prepare недобор ок.  
**Скрины:** create flow на **новом** реальном прогоне — после стенда/второго персонажа.

### Срез M5 — Гримуар секции ✅

| Задача | Где | Статус |
|--------|-----|--------|
| Полки по профилю (Art / Warlock) | `GrimoireDialog` shelfSections | ✅ |
| Alone-max membership (не shared slots) | `buildGrimoireShelfSources` + filter | ✅ |
| Per-shelf verbs / acquisition | rowMode + shelfSlug stamp | ✅ |
| Без второго Prepare-дома | без изменений (wizard-only) | ✅ |
| Скрин R1 | `quack-grimoire-shelves.png` | ✅ |

Стык с SPELL_ACCESS §7 (секции/фильтр) — без ожидания полного ok §11 ACCESS.

### Срез M6 — Classic / print ✅

| Задача | Где | Статус |
|--------|-----|--------|
| `classicCastProfiles` | `classicSpells.ts` | ✅ |
| Таблица профилей на 2014 P3 | `ClassicPrintSheet` | ✅ |
| Паритет 2024 P4 | `ClassicPrint2024` | ✅ |
| Фикстура Квакк + DEV preview | `/dev/classic-sheet-preview` | ✅ |
| Скрин R1 | `quack-classic-p3-profiles.png` | ✅ |

### Срез M7 — UI-kit LOCK Wave MC

Собрать доски §4.2 из **реальных** кадров M3–M5.  
Обновить README §2c.  
Ok Игоря на LOCK → можно считать визуальный контракт закрытым.

---

## 7. Порядок относительно других планов

```
CF F (tome) ──┐
CF C (draft) ─┼→ не ломать; MC опирается
SPELL_ACCESS ─┘  M5 стыкует секции
         │
        M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7
```

M1–M3 **не** ждут полного SPELL_ACCESS: шапка и бюджеты чинят бой Квакка раньше гримуар-полировки.

---

## 8. Non-goals

- Точечный патч JSON Квакка на сервере без engine.  
- Выдуманные персонажи для досок.  
- Слияние бард+колдун known в один пул.  
- Авто-«лучшая хар-ка» при касте.  
- КД/экипировка при стартовом золоте (отдельный equip slice).  
- Откат Wave A icons / mono UX для одноклассников.

---

## 9. Риски

| Риск | Митигация |
|------|-----------|
| Нет доступа к реальному Квакку | M0: Илья даёт export / агент на стенде с копией |
| Scope бонусов ломает mono | default scope=all; selfcheck mono |
| Dual-cast UX сложен | только если ≥2 acquisition; иначе тихо |
| Агенты снова пишут в `casting_ability` | checklist PR + selfcheck MC |
| Доски раньше кода | M7 строго после скринов |
| Перегруз мобилки | collapse budgets + scroll profiles |

---

## 10. Selfcheck минимум

- Art 15 / Warlock 5: profiles 2; cantrips 4+3; tome +3 extra; DC/atk 19/+11 vs 18/+10 при статах Квакка.  
- Bard 6 / Wizard 8 / Warlock 6: 3 profiles, abilities {int,cha}.  
- Duplicate learn: второй раз ест второй budget.  
- Modifier scope warlock +1 DC ≠ artificer DC.  
- Mono wizard: 1 profile, UI как Wave A.  
- Ritual wizard vs cleric prepare.  
- Grant_cast path не предлагает чужой slot, если cast_rules запрещают.

---

## 11. Критерий «линия готова»

1. Квакк (реальный): две строки шапки, правильные цифры, раздельные бюджеты, каст по классу.  
2. Create позволяет выбрать магию колдуна независимо от изобретателя.  
3. Mono без визуального шума.  
4. UI-kit §2c обновлён + доски из реальных кадров.  
5. Selfchecks зелёные; PRODUCT_STATUS / tip после деплоя.  
6. Нет второго SoT кроме `buildCastProfiles` + acquisition на spell.

---

## 12. Решения Игоря (заполнить)

| # | Вопрос | Варианты | Решение |
|---|--------|----------|---------|
| 1 | Шапка | **A:** всегда строка на класс; merge только при равных итогах · B: merge по ability всегда | **A** (ok 2026-10-21 «поехали») |
| 2 | Create layout | **A:** шаги по классам + overview · B: один экран-аккордеон | **A** |
| 3 | Dual-cast в бою | **A:** одна строка + picker · B: две строки | **A** |
| 4 | M5 vs SPELL_ACCESS | **A:** полный M5 после ok ACCESS · B: лёгкий фильтр класса уже в M3 | **B** лёгкий фильтр в M3; полный M5 после ACCESS |
| 5 | Доступ к Квакку для скринов | **A:** export JSON от Ильи · B: стенд с копией прода · C: Илья снимает сам, агент сверяет | _открыто_ — нужно для M3+ скринов; M1 logic-only |
| 6 | Scope бонусов в M3 | **A:** сразу · B: отложить, сначала bare ability | **A** |
| 7 | Первый код-срез | **A:** M1→M2→M3 · B: M1+M3 раньше budgets | **A** — старт M1 |

---

## 13. Что сделать сразу после ok

1. Получить R1 (Квакк) на стенд.  
2. Снять **before**-скрины текущего бага (шапка одна +11, budgets) — тоже с реального листа.  
3. Ветка `cursor/multiclass-spell-m1-…` от актуального tip.  
4. M1 → … по очереди; не открывать M7 без реальных after-скринов.

Пока §12 не заполнен — **код не писать** (кроме правок этих docs).
