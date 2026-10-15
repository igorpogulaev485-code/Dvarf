# Облики (Forms) — Дикий облик и схожие превращения

**Статус:** дизайн LOCK + детальный план  
**Prod tip base:** `cursor/companions-naparniki-b378`  
**План исполнения:** [`forms-feature-plan.md`](forms-feature-plan.md) (слайсы B0–B6 / F1–F6, приёмка, риски, DoD)  
**Цель UX:** друид жмёт «Дикий облик» → выбирает форму из списка → во вкладке **Напарники** появляется карточка «как сейчас выглядит игрок» → там хиты облика и способности формы.

Связанные слои уже в продукте:

| Слой | Что есть | Чего нет |
|------|----------|----------|
| Пул `feat:wild_shape` | 2× / short, scale CR по уровню, Moon/Elemental | нет действия «принять облик» |
| Напарники | отдельное существо (спутник / призыв) | нет роли «это я» |
| Бестиарий | `kind=bestiary` в каталоге (enum есть) | **0 записей** — без наполнения пикер обликов пустой |
| Каст → naparnik | Summon*/Conjure*/Familiar | Polymorph/Shapechange не создают карточку |

> **Порядок работ:** сначала полный оф. бестиарий (B0–B3), потом модель обликов (F1+) и пикер. Ручной `known_forms` — только fallback/homebrew, не замена справочника.

---

## 1. Главное различение

В продукте два разных класса сущностей, живущих в **одном UI-блоке «Напарники»**:

| Роль | Кто это | Примеры | HP |
|------|---------|---------|----|
| **ally** (напарник) | отдельное существо | Зверь-спутник, Steel Defender, Familiar, Summon Beast | свои; смерть/диспаун по `nature` |
| **self_form** (облик) | **тело игрока** в другом статблоке | Wild Shape, Polymorph на себя, Shapechange, некоторые предметы | пул HP формы; при 0 — возврат в хозяина + остаток урона |

> Правило продукта: **облик ≠ напарник**, но **карточка облика живёт во вкладке Напарники**, потому что там уже есть HP, действия, активность и бестиарий-реф. Не плодим вторую вкладку «Облики».

---

## 2. Целевой пользовательский поток (Дикий облик)

```
Умения → «Дикий облик» [Использовать]
        ↓
  есть заряд?  ──нет──→ toast / disabled
        ↓ да
  диалог «Выбери облик»
        ↓
  список известных форм (фильтр CR / плавание / полёт)
  + поиск по бестиарию в рамках лимита
  + «свой облик» (ручной stub, если бестиарий пуст)
        ↓
  Подтвердить
        ↓
  1) spend pool wild_shape (−1)
  2) создать/заменить карточку self_form в companions[]
  3) снимок host HP (текущие хиты персонажа не трогаем)
  4) UI: бейдж «В облике» в боевой шапке + карточка в Напарниках
        ↓
  В карточке: HP формы, КД, скорость, действия/атаки формы
  Урон → applyHpChange по карточке облика
        ↓
  HP формы ≤ 0  ИЛИ  «Сбросить облик»  ИЛИ  конец длительности
        ↓
  dismiss: active=false или удалить runtime-карточку;
  остаток урона (если был) → hitPointCurrent хозяина
```

**Moon — Combat Wild Shape:** та же кнопка, но действие = бонусное (подпись в диалоге); лечение ячейкой — отдельная кнопка **на карточке облика** («Исцелить ячейкой»), тратит слот → +1к8×уровень к HP формы.

**Elemental Wild Shape:** в пикере вариант «Элементаль» (4 выбора); linked_spend оба заряда `wild_shape` уже в пакете умений — активация элементаля идёт через тот же пайплайн форм.

---

## 3. Модель данных

### 3.1. Расширение `CompanionEntry` (минимальный diff)

Не новая таблица — поле роли + блок формы:

```ts
export type CompanionRole = 'ally' | 'self_form'

export type FormSourceKind =
  | 'wild_shape'
  | 'elemental_wild_shape'
  | 'spell'          // polymorph, shapechange, true_polymorph…
  | 'item'           // артефакты / волшебные предметы
  | 'feature'        // Shapechanger (Transmutation), Thousand Forms…
  | 'other'

export type ActiveFormMeta = {
  /** Откуда взялась форма */
  form_source: FormSourceKind
  /** slug умения / заклинания / предмета */
  form_source_ref: string
  /** Хиты хозяина на момент входа (для UI и аудита; урон облика их не ест) */
  host_hp_at_enter: number | null
  host_hp_max_at_enter: number | null
  /** Длительность: минуты WS = ½ ур. друида; null = пока не сбросили / концентрация */
  duration_minutes: number | null
  entered_at: string | null  // ISO
  /** Известные формы игрока (опционально кэшируем выбранный id) */
  known_form_id?: string
}

// CompanionEntry +=
role: CompanionRole           // default 'ally' для всех текущих
form: ActiveFormMeta | null   // только при role === 'self_form'
```

Инварианты:

1. **Не больше одной активной `self_form`** (`active === true`) на лист.
2. Новая активация **заменяет** предыдущую (сначала dismiss старой без урона по хозяину, если добровольная смена).
3. `kind` для облика: `'other'` или новый `'wild_shape_form'` — предпочтительно **новый kind** `transformed_self` для подписей UI («Облик», не «Напарник»).
4. `nature`: для WS/polymorph → `'summoned'`-подобное поведение при 0 HP (**не** death saves облика; при 0 → dismiss). Правила PHB: форма не делает death saves — урон переливается на хозяина.
5. `control`: `with_master` (это и есть хозяин).
6. `is_primary`: для `self_form` всегда `true` на время активности (фокус боя = облик); предыдущий primary ally запоминается и возвращается при dismiss.
7. `source`: `{ kind: 'class'|'spell'|'feat'|…, labelRu, feature?, spellId? }` — как у naparnik; для концентрации (Polymorph) `spellId` гасит форму так же, как призыв.

### 3.2. Библиотека известных форм (на листе)

Отдельно от runtime-карточки — список «зверей, которых друид уже видел/выучил»:

```ts
export type KnownForm = {
  id: string
  bestiary_ref: string | null
  name_ru: string
  cr: string            // "0" | "1/8" | "1/4" | "1/2" | "1" | …
  tags: ('swim' | 'fly' | 'elemental' | 'custom')[]
  /** Ручной статблок, пока бестиарий пуст или кастом */
  stats_override?: { hp: number; ac: number; speed: number; actions: string }
  notes?: string
}

// sheet.play.known_forms: KnownForm[]
```

Пикер показывает `known_forms`, отфильтрованные лимитом WS по уровню (+ Moon CR).  
Пока бестиарий пуст: игрок **добавляет известную форму вручную** (имя + CR + HP/AC/скорость/действия) — это разблокирует поток без ожидания агента бестиария.

### 3.3. Лимиты Дикого облика (движок)

Уже есть `scale.by_level` на умении. Вынести чистую функцию:

```ts
wildShapeLimits(druidLevel, circle): { maxCr: number; allowSwim: boolean; allowFly: boolean }
```

- PHB: L2 CR¼ no swim/fly · L4 CR½ +swim · L8 CR1 +fly  
- Moon Circle Forms: L2 CR1; L6+ CR = floor(druidLevel/3)  
- Archdruid L20: unlimited uses (max → ∞ или track special) — пул уже описан в пакете

Пикер **не даёт выбрать** форму вне лимита (disabled + причина).

---

## 4. Что попадает в «облик», а что нет

| Источник | → self_form карточка? | Заметки |
|----------|----------------------|---------|
| **Дикий облик** | ✅ | основной кейс |
| **Elemental Wild Shape** | ✅ | 4 элементаля; 2 заряда |
| **Polymorph** (на себя) | ✅ | концентрация; dismiss по концу conc. |
| **Polymorph** (на союзника) | ⚠️ later | карточка на **листе цели**, не кастера |
| **Shapechange** | ✅ | шире список существ |
| **True Polymorph** | ✅ | длительность / «постоянно» |
| **Alter Self / Disguise Self / Mask of Many Faces / Thousand Forms** | ❌ | косметика; достаточно заметки/баффа, без боевой карточки |
| **Find Familiar / Summon* / Conjure*** | ❌ (уже ally) | остаются naparnik `role=ally` |
| **Shifter (раса)** | ❌ v1 | temp HP на хозяине; не полный статблок |
| **Предметы** (Cloak of the Bat, Fang of the Serpent и т.п.) | ✅ если дают боевой статблок / WS-like | `form_source: 'item'`, ref = item id |
| **Wizard Shapechanger** (бесплатный polymorph в зверя CR≤1) | ✅ | `form_source: 'feature'` |

Критерий v1: **если у формы свой пул HP и/или свои атаки в бою — карточка `self_form`. Если только внешность — нет.**

---

## 5. UI

### 5.1. Кнопка умения

На ряду «Дикий облик» в умениях:

- как сейчас: пипсы пула  
- **новое:** кнопка «Принять облик…» (если remaining > 0 или Archdruid)  
- если уже в облике: «Сменить облик…» / «Сбросить облик»

### 5.2. Диалог выбора

- Поиск + фильтры (CR, плав., полёт)  
- Секции: «Известные» | «Элементали» (если Moon 10+) | «Добавить своего»  
- Превью статов перед подтверждением  
- Подтверждение = spend + create card

### 5.3. Карточка в Напарниках

Отличия от ally:

- Бейдж **«Это ты · Дикий облик»** (или имя заклинания/предмета)  
- Нет death saves  
- Кнопка «Сбросить облик»  
- Moon: «Исцелить ячейкой»  
- Аватар разрешён (это «портрет облика»)  
- Заголовок панели можно не менять; внутри — секция «Облик» сверху списка, затем «Напарники»

### 5.4. Боевая шапка хозяина

Пока активен `self_form`:

- чип «В облике: Бурый медведь»  
- клик → скролл/фокус на карточку  
- HP в шапке остаются **хитами персонажа** (не формы); хиты формы — только на карточке (как в PHB: два пула)

---

## 6. Урон и сброс (правила продукта)

1. Урон по игроку в облике → **сначала HP формы** (`applyHpChange` на карточке).  
2. Если урон > оставшихся HP формы → форма сбрасывается, **остаток** вычитается из `hitPointCurrent` хозяина.  
3. Добровольный сброс / конец длительности / потеря концентрации → форма уходит, урон хозяину **не** переносится.  
4. Хиты хозяина за время облика **не регенятся автоматически** от лечения формы (кроме явных исключений вроде Moon slot heal → только форма).  
5. Короткий/длинный отдых: активная форма сбрасывается (или предупреждение «сбросить облик?»); заряды WS — по существующему recharge.

---

## 7. Бестиарий (делать первым)

Без справочника существ фича обликов не собирается: пикеру не из чего брать CR/HP/AC/скорости/атаки.  
Правила наполнения — **те же, что у рас / заклинаний / черт**:

| Правило | Как |
|---------|-----|
| Охват | Весь **официальный** бестиарий 2014 по всем книгам (MM, VGtM, MToF, MPMM, приключения, сеттинги…) |
| Исключить | Homebrew, UA, 3rd-party (как у гримуара 527) |
| Имена | RU как на dnd.su / ttg; EN slug стабильный |
| Хранение | `catalog_entries` · `kind=bestiary` · `rules_edition=2014` · JSONB `data` schema v1 |
| Волны | JSON-файл(ы) в `backend/data/…` + alembic upsert (идемпотентно по slug) |
| Проверка | Сверка списков **dnd.su** и **ttg.club**; gap-отчёт как у SPELLS |
| Аудит-файл | `docs/BESTIARY_AUDIT_2014.md` (зеркало `RACES_AUDIT_2014.md`) |

### 7.1. Источники правды (проверка)

| Источник | Роль | Ориентир на 2026-10-15 |
|----------|------|------------------------|
| [ttg 5e14 API](https://5e14.ttg.club/api/v2/bestiary) | **канон статов** + индекс + detail JSON | ~2554 всего; **~2380** group=`Basic` (оф.) |
| [dnd.su / 5e14 bestiary](https://5e14.dnd.su/bestiary/) · `piece/bestiary/index-list/` | покрытие / RU-имена / gap vs ttg | ~**2875** карточек в оф. индексе (без homebrew-вкладки) |
| PHB/MM/MPMM/TCE PDF (по необходимости) | справочно | не перебивает правило ниже |

Расхождение счётчиков dnd.su ↔ ttg ожидаемо (разный состав приключений/репринтов).  
Цель агента: **закрыть оф. пересечение + добрать уникальные оф. с обеих сторон**, gap → 0 по согласованному allowlist книг. Homebrew/UA/3rd не сидим.

#### Конфликт статов dnd.su ↔ ttg

Известны точечные разночтения блоков (не только «есть/нет в индексе»).  
**Правило продукта (LOCK Игоря): при расхождении статов берём ttg.**

| Существо | Поле | ttg (берём) | dnd.su | Заметка |
|----------|------|-------------|--------|---------|
| Дух дикого огня / Wildfire Spirit (TCE, Круг дикого огня) | HP | **10** + 5×ур. друида | **5** + 5×ур. друида | AC/абилки/действия совпадают; зафиксировано 2026-10-15 |

На сиде: `data` пишем с ttg detail; в `external_ref` кладём оба URL; в аудит — строка «conflict→ttg».  
На B6 gap-pass: скрипт diff не только slug-наличия, но и ключевых полей (hp_average, ac, cr, abilities) для пересечения; все conflict→ttg + лог в `BESTIARY_AUDIT_2014.md`.  
Пока не доказано иное — считаем, что конфликты **могут быть системными**, не разовой ошибкой одной карточки.

Fetch-скрипт по аналогии со `backend/scripts/fetch_spell_wave.py`:

- индекс с ttg API (`/api/v2/bestiary` → detail по `url`)  
- параллельно индекс dnd.su → diff slug/name/CR/source  
- выход: `backend/data/srd/2014/bestiary_*.json` волнами (MM → VGM/MTF → MPMM → adventures/settings)

### 7.2. Schema v1 `data` (kind=bestiary)

Минимум, который нужен обликам / напарникам / мастеру:

```ts
{
  schema_version: 1,
  size: string,                 // "tiny" | "small" | "medium" | …
  type: string,                 // beast | elemental | … (EN slug)
  type_ru: string,              // «зверь»
  subtype?: string | null,
  alignment?: string,
  ac: number,
  ac_notes?: string,            // natural armor и т.п.
  hp_average: number,
  hp_formula?: string,          // "3к8"
  speed: { walk?: number; swim?: number; fly?: number; climb?: number; burrow?: number },
  cr: string,                   // "0" | "1/8" | "1/4" | "1/2" | "1" | …
  proficiency_bonus?: number,
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number },
  skills?: Record<string, number>,
  senses?: { darkvision?: number; blindsight?: number; tremorsense?: number; truesight?: number; passive_perception?: number },
  languages?: string[],
  traits?: { name_ru: string; name_en?: string; text_ru: string }[],
  actions?: { name_ru: string; name_en?: string; text_ru: string }[],
  bonus_actions?: …,
  reactions?: …,
  legendary_actions?: …,
  source_book: string,          // MM | MPMM | …
  tags?: string[],              // swim, fly — для фильтра WS
  environment?: string[],
}
```

Строки каталога: `slug` (EN snake), `name_ru`, `name_en`, `source`, `external_ref` (url ttg + id dnd.su), `data`.

Для Дикого облика пикер фильтрует: `type ∈ {beast}` (+ elemental для Moon 10), `cr ≤ limit`, `speed.swim/fly` по уровню.

### 7.3. Волны сида (как SPELLS)

| Волна | Книги (ориентир) | Зачем |
|-------|------------------|-------|
| B1 | MM (+ SRD overlap) | база; почти все WS-звери |
| B2 | VGtM + MToF | додобивка до MPMM-эры |
| B3 | MPMM | актуальный «большой» бестиарий |
| B4 | FTD, BGG, BAM, TCE creatures… | драконы / великаны / … |
| B5 | Adventures + settings (SKT, ToA, GGR, ERLW, EGW, …) | закрыть оф. gap vs dnd.su/ttg |
| B6 | Gap-pass | diff dnd.su ↔ ttg ↔ наш COUNT; добить до 0 оф. дыр |

Каждая волна: fetch JSON → alembic upsert → smoke count by `source_book` → строка в `BESTIARY_AUDIT_2014.md` → PRODUCT_STATUS «В ветках» / после деплоя «на проде».

### 7.4. Связь с обликами

- Runtime: статы формы из `bestiary_ref` → `data` (hp_average, ac, speed, actions → текст карточки).  
- `KnownForm.stats_override` — только homebrew / существо вне каталога.  
- Пока B1 не залит: пикер может искать по каталогу и показывать пусто — **не считаем облики готовыми**.

---

## 8. Слайсы реализации (после LOCK)

**Сначала бестиарий, потом облики.**  
Детальная разбивка (файлы, приёмка, tip, риски): [`forms-feature-plan.md`](forms-feature-plan.md).

| # | Слайс | Результат |
|---|-------|-----------|
| F0 | Этот документ LOCK + план | согласование |
| **B0** | Schema `bestiary` v1 + fetch/diff скрипты | контракт данных |
| **B1** | Сид MM (upsert alembic) | первый рабочий справочник → разблок F2 |
| **B2–B5** | VGM/MTF → MPMM → остальные оф. книги | полное покрытие |
| **B6** | Gap-pass + field-diff (conflict→ttg) | оф. gap → 0 |
| F1 | Модель: `role`, `form`, `known_forms` + read/write | данные на листе |
| F2 | `wildShapeLimits` + диалог пикера + spend → self_form | друид входит в облик |
| F3 | UI карточки облика + dismiss + overflow damage | бой в облике |
| F4 | Moon heal-slot + Elemental picker | круг Луны |
| F5 | Polymorph/Shapechange (self) | заклинания |
| F6 | Item/feature + ally-статы из бестиария (Wildfire…) | артефакты / дух огня |

Параллелить можно F1 с B2+, но **F2 не стартуем**, пока в каталоге нет хотя бы MM (B1).

---

## 9. Открытые решения (нужен ok Игоря)

1. **Один UI-блок** «Напарники» с секцией «Облик» — ок, или отдельная вкладка? *(рекомендация: один блок)*  
2. Хранить **библиотеку известных форм** на листе или только runtime одну форму? *(рекомендация: библиотека на листе — «видел/выучил» поверх полного бестиария)*  
3. При смене облика — новый полный HP формы по PHB? *(рекомендация: да)*  
4. Polymorph на **врага/союзника** в v1 не делаем? *(рекомендация: только self в F5)*  
5. Имя kind: `transformed_self` vs `other`? *(рекомендация: `transformed_self`)*  
6. **Бестиарий первым (B0→B6), облики после B1+** — ок? *(рекомендация: да)*  
7. Allowlist книг: всё с group=оф. на ttg/dnd.su, без HB/UA/3rd — ок? *(рекомендация: да)*  
8. **Конфликт статов → ttg** (пример: Wildfire Spirit HP 10+5×ур vs 5+5×ур на dnd.su) — **принято** по слову Игоря; на B6 гоняем системный diff полей.

---

## 10. Не делать

- Не подменять HP в боевой шапке хозяина хитами формы.  
- Не включать Alter Self / Disguise в self_form.  
- Не создавать параллельный store вне `companions[]` без причины.  
- Не сидить homebrew / UA / 3rd-party в `kind=bestiary`.  
- Не считать F2–F3 готовыми, пока бестиарий пуст (ручной stub — только аварийный fallback).
