# Dvarf UI Kit — контракт фронтенда

**Статус:** закрыт и обязателен для всей UI-разработки.  
**Доски:** [`boards/`](boards/) · сводная карта: [`boards/dvarf-ui-kit-catalog-final.jpg`](boards/dvarf-ui-kit-catalog-final.jpg)

Этот документ — **источник правды** по визуалу и паттернам. Любой агент / PR, который трогает `frontend/`, обязан ему следовать. Отклонения — только с явного ok Игоря и обновления этого файла + доски.

Skill для агентов: [`.cursor/skills/dvarf-ui-kit/SKILL.md`](../../.cursor/skills/dvarf-ui-kit/SKILL.md)

---

## 1. Токены

### Нейтрали (общие, не перекрашиваем темой)

| Token | Hex | Роль |
|-------|-----|------|
| `--ink` | `#2d2d2a` | основной текст |
| `--muted` | `#6f675c` | вторичный текст |
| `--panel` | `#fbf7ec` | фон панелей / пергамент |
| `--line` | `#e0d8c7` | бордеры |
| `--card` | `#fffdf8` | вложенные поверхности |
| `--danger` | `#b42318` | только деструктив |

### Тема аккаунта (`--accent` / `--accent-soft`)

Одна палитра = **и** 6 тем кабинета, **и** identity характеристик.

| id | Имя | Accent | Soft | = характеристика | Роль |
|----|-----|--------|------|------------------|------|
| `str` | Медь | `#9a4a32` | `#f3e0d6` | СИЛ | тёплая, не-зелёная |
| `dex` | Хвоя | `#3d6b5a` | `#dcece4` | ЛОВ | прохладный зелёный |
| `con` | Охра | `#8a6a2f` | `#f1e6c8` | ТЕЛ | земля |
| `int` | Чернила | `#3f5f8a` | `#dde6f2` | ИНТ | не-зелёная |
| `wis` | **Листва** | `#5a6b3d` | `#e5ecd4` | МДР | **дефолт новых аккаунтов** |
| `cha` | Слива | `#7a4a6e` | `#efe0ea` | ХАР | не-зелёная |

Тема меняет **только** `--accent` и `--accent-soft` (кнопки, tabs, filters, panel titles, hot-bar on, sticky chrome).  
Пергамент и danger **не** зависят от темы.

> Миграция: текущий прод-olive `#4c663d` при restyle сходится к дефолту **Листва** `#5a6b3d`.

### Типографика

- **Display:** `Source Serif 4` → `--font-display` (заголовки панелей, бренд, аббревиатуры СИЛ/ЛОВ/…)
- **UI:** `IBM Plex Sans` → интерфейс, кнопки, поля

Доска: [`boards/dvarf-ui-kit-spec.jpg`](boards/dvarf-ui-kit-spec.jpg)

---

## 2. Характеристики — всегда вариант A

> **LOCK (Wave A rail candy):** зафиксировано с Игорем — две строки, полные имена, клик по названию сворачивает, без ▾ в краю. Не откатывать без нового согласования.

---

## 2b. Шапка стола — LOCK

> **LOCK (Wave A header):** зафиксировано с Игорем 2026-10-12 — «Идеал». Не откатывать без нового согласования.

Компоненты / паттерны этого этапа (`PlayDeskHeader`, `deskIcons.tsx`):

| Компонент | Правило |
|-----------|---------|
| Who 3-row | 1) Имя · Раса · Мировоззрение · издание · 2) чипы классов · 3) XP-дорожка |
| XP band | под полоской: **floor** · **ещё N** · **nextThreshold** (`formatXp`) |
| Vital card | иконка · значение · подпись (КД / Скор. / Иниц. / БМ) |
| Speed modes | теги лаз./плав./полёт **друг под другом** (узкий блок) |
| Chip stack | Вдохн. / Истощ. столбиком |
| Tools stack | монеты / Отдых столбиком; death справа от HP **без прыжка** |
| HP | tabular-nums, запас под трёхзначные |
| Death | opaque `#fff` card + череп; не wash / не fade opacity |
| Coin tip | hover ≈ зм + разбивка; клик → pad |
| deskIcons | shield / boot / bolt / badge / coin / rest / spark / skull |

Доска LOCK: [`desk-header-lock`](boards/dvarf-ui-kit-desk-header-lock.jpg) · состояния: [`header-states`](boards/dvarf-ui-kit-desk-header-states.jpg) · [`header-death`](boards/dvarf-ui-kit-desk-header-death.jpg) · [`header-dense`](boards/dvarf-ui-kit-desk-header-dense.jpg) · tip: [`coin-tip`](boards/dvarf-ui-kit-desk-coin-tip.jpg) · icons: [`desk-icons`](boards/dvarf-ui-kit-desk-icons.jpg)

---

## 2c. Заклинания стола — LOCK

> **LOCK (Wave A spells):** зафиксировано с Игорем 2026-10-13. Не откатывать без нового согласования.

| Компонент | Правило |
|-----------|---------|
| Compact = бой | список готовых, пипы spent, **Каст**, деталка по карточке |
| Настройки | диалог setup (не «полностью»): характеристика, Сл./атака (derived), ячейки макс., договор, Гримуар/Подготовить |
| Договор · ур. ячеек | **авто** по таблице колдуна PHB; вручную только макс. |
| Сл. спас. / Атака | `8+БМ+мод` / `БМ+мод` — только readout, не поля |
| По таблице | подставить макс. ячеек / договор / подготовку из PHB; spent не сбрасывать |
| Новые заклинания | только через **Гримуар** (без «Своё homebrew» в настройках) |
| Icons | `spellIcons.tsx` — книга / шляпа / ✨ / фокус / мешочек / конц. / ритуал |

Доски: [`spells`](boards/dvarf-ui-kit-spells.jpg) · [`spell-icons`](boards/dvarf-ui-kit-spell-icons.jpg)

## 2d. Атаки стола — LOCK

> **LOCK (Wave A attacks):** зафиксировано с Игорем 2026-10-13. Не откатывать без нового согласования.

| Компонент | Правило |
|-----------|---------|
| Compact = бой | hit/dmg toast, удерж./взять, ресурсы, расходники |
| Настройки | диалог setup (не «полностью» на stage): оверрайды карточек + **Своё** |
| Официальное оружие | из **инвентаря** (сцена Исследование) → карточка атаки |
| Своё | кастомная атака без строки лута |
| Природное | с расы, в настройках read-only |
| Icons | `attackIcons.tsx` — ближнее / дальнее / ресурс / расходник |

Левый блок (`AbilitySkillsColumn`):

- у каждой характеристики **свой identity-цвет** (полоска + label + Сп on + навыки);
- identity **не** перекрашивается темой аккаунта;
- навык = pip + имя + число: кружок `нет → влад. → эксп.`; **число → бросок** (как LSS);
- Пр — число → бросок проверки; Сп — pip владения + число → бросок спасброска;
- название характеристики → разборка (бафы); ▾ сворачивает навыки;
- база → эффективный (`16 → 18`);
- шапка в две строки: полное название · число/`→eff` + Пр/Сп;
- пассивы — glance-карточки; CTA «Владения ▸» → drawer (скорости/ТЗ · снаряжение · языки/инструменты); вкладки ЕЩЁ нет.

Доски: [`ability-rail-v2`](boards/dvarf-ui-kit-ability-rail-v2.jpg) · [`ability-colors` / вариант A](boards/dvarf-ui-kit-ability-colors.jpg) · [`themes-6`](boards/dvarf-ui-kit-themes-6.jpg)

---

## 3. Паттерны (обязательные)

| Паттерн | Правило |
|---------|---------|
| Panel | `--panel`, title Source Serif в `--accent` |
| Sticky toolbar | на полных панелях (Inventory / Attacks / Texts / Spells…) |
| Filters | chips; active = solid accent |
| Glance → expand | компактная строка → деталь |
| Cards | **только** для interaction; не декор в hero |
| Empty | muted one-liner + CTA soft |
| Danger | outline/confirm; не theme accent |
| Print | единственное место с hairlines / плотным бланком; abilities на бланке всё равно identity A |

Live-эталоны в продукте (уже близки к киту): Inventory, Attacks, Texts.

---

## 4. Карта досок

| Область | Доска |
|---------|-------|
| Foundations | `dvarf-ui-kit-spec.jpg` |
| 6 тем + rail A | `dvarf-ui-kit-themes-6.jpg`, `dvarf-ui-kit-cabinet-theme.jpg` |
| Desk chrome / header LOCK | `dvarf-ui-kit-desk-chrome.jpg`, `dvarf-ui-kit-desk-icons.jpg`, **`dvarf-ui-kit-desk-header-lock.jpg`**, `dvarf-ui-kit-desk-header-states.jpg`, `dvarf-ui-kit-desk-header-death.jpg`, `dvarf-ui-kit-desk-header-dense.jpg`, `dvarf-ui-kit-desk-coin-tip.jpg`, `dvarf-ui-kit-desk-speed-tip.jpg` |
| Pads / dialogs | `dvarf-ui-kit-dialogs-pads.jpg` |
| Rail | `dvarf-ui-kit-ability-rail-v2.jpg`, `dvarf-ui-kit-ability-colors.jpg` |
| Spells LOCK | `dvarf-ui-kit-spells.jpg`, `dvarf-ui-kit-spell-icons.jpg` |
| Combat attacks compact + settings | line icons in `attackIcons.tsx`; chrome = `desk-chrome` §E; setup = `AttacksSettingsDialog` (§2d) |
| Features / companions / attunement / ЕЩЁ | `dvarf-ui-kit-features-companions.jpg` |
| Rest / create / toast / list | `dvarf-ui-kit-rest-create-app.jpg` |
| Auth | `dvarf-ui-kit-auth.jpg` |
| Cabinet | `dvarf-ui-kit-cabinet.jpg` |
| AppHeader / lobbies / session | `dvarf-ui-kit-lobbies.jpg` |
| Classic print + sticky | `dvarf-ui-kit-print-sticky.jpg` |
| Сводный каталог | `dvarf-ui-kit-catalog-final.jpg` |

---

## 5. Порядок внедрения (зафиксировано)

**Сначала** — единый кит в **одном** цвете (дефолт Листва): токены, паттерны, rail A, панели/хром. ✅  
**Потом** — выбор темы в кабинете (`data-theme` / `--accent` swap) + режим цветов характеристик и сохранение на аккаунт (§2n).

Почему не наоборот: тема — тонкий слой над токенами. Пока UI на разнобое хардкодов, переключатель цвета даст кашу и двойную работу.

---

## 6. Как наполнять кит, если появится новое

1. Это **атом** (кнопка, chip, field, toast) или **новый паттерн**?
2. Атом → собрать из кита, доска не нужна.
3. Новый паттерн → одна доска: default / on / empty / disabled / danger; проверить на **Листве** и одной не-зелёной теме.
4. Добавить файл в `boards/` + строку в §4 и в `catalog-final`.
5. Согласование с Игорем → только потом код.

### 6a. Иконки — до кода блока

Когда берёмся за блок UI (инвентарь, магия, hot-bar, …):

1. Есть ли в ките / продукте **нужный набор иконок** для кнопок и ролей этого блока?
2. Если **нет** — сначала рисуем/добавляем иконки, кладём в кит (`boards/` + запись здесь), согласование.
3. Только потом верстка/логика chrome блока.

Сейчас есть: иконки под **инвентарь** (и частично texts); **шапка стола LOCK** — `deskIcons.tsx` + доска `desk-header-lock`; **магия LOCK** — `spellIcons.tsx` + доски `spells` / `spell-icons`; **атаки LOCK** — compact + `AttacksSettingsDialog` (§2d), `attackIcons.tsx`.  
**Hot-bar (2026-10-13):** line-icons на полосе (`IconConditions` / `IconConcentration` / `IconPouch` в `deskIcons.tsx`); Отдых в шапке. Каст→концентрация — BUG-019 ✅.  

## 2e. Состояния (hot dialog) — LOCK

> **LOCK (Wave A conditions dialog):** зафиксировано с Игорем 2026-10-13. Не откатывать без нового согласования.

| Компонент | Правило |
|-----------|---------|
| Вход | hot «Состояния» → диалог (не панель Ещё) |
| Секции | Истощение · На персонаже · Быстрый выбор + поиск/своё |
| Быстрый выбор | sheet-chips toggle on/off |
| Истощение | уровни 1–6 + текст отыгрыша стадии |
| Icons | `IconConditions` / `IconExhaustion` (`deskIcons.tsx`) |
| Hot chip | `is-on`, когда есть состояния / истощение |

## 2f. Исследование / инвентарь — LOCK

> **LOCK (Wave A explore inventory):** зафиксировано с Игорем 2026-10-13. Не откатывать без нового согласования.  
> Паттерн по опыту Боя: **одна поверхность**, не компакт↔полностью.

| Компонент | Правило |
|-----------|---------|
| Stage | `InventoryPanel` сразу (glance→expand строки) |
| Без flip | нет «полностью» / «← компактно» на столе |
| Accordion | одна деталь открыта; expand плотнее (роль-поля + footer) |
| Добавить | Из справочника (`GearPickerDialog` kit) / Своя строка |
| ★ | избранное → расходники боя |
| Meta | ноша · КД · Настройка N/3 в summary |
| Настройка | только из summary → `AttunementDialog` (вкладки ЕЩЁ нет; тот же editor/sheet) |
| Монеты | readout → CoinPad (header wide / panel-local compact) |
| Без PHB-шаблона | броня из справочника или ручные поля; dropdown «Шаблон PHB» убран |
| Заклинания | split справа (как combat/social) |

**Статус:** Идеал / LOCK (ok Игоря 2026-10-13).

## 2g. Общение / тексты — LOCK

> **LOCK (Wave A social texts):** зафиксировано с Игорем 2026-10-13. Не откатывать без нового согласования.

| Компонент | Правило |
|-----------|---------|
| Stage | `TextBlocksPanel` сразу (glance→expand) |
| Без flip | нет «полностью» / «← компактно» |
| Title | `Panel title` (`ui-panel__title`) + lede — как Inventory |
| Expand | multi-open; toolbar `abil-column__toolbar` «Свернуть все / Развернуть все» |
| Порядок | `abil-block__drag` ⋮⋮ + `moveTextBlockBefore` (не стрелки ▲▼) |
| Добавить | sticky «Добавить блок» |
| Вставки | `parts[]`: text / resource / spoiler / divider (+ Вставка меню) |
| Пипсы → hot | ресурс заметки `onHot: false` по умолчанию; ☆ hot / ★ hot |
| Фильтры | Все / Личность / Умения / Заметки / С ресурсом / Скрытые |
| Заклинания | split справа |

**Статус:** Идеал / LOCK.

## 2h. Способности (сводка) — LOCK

> **LOCK (Wave A features summary):** зафиксировано с Игорем 2026-10-13. Не откатывать без нового согласования.

| Компонент | Правило |
|-----------|---------|
| Stage | `ClassFeaturesPanel` сразу (glance→expand строки) |
| Без flip | нет «полностью» / «← компактно» / `PlayDeskFeaturesCompact` |
| Expand | только строки с resource / choice / spend / summon; пассивные — static glance |
| Toolbar | свернуть/развернуть все — только если есть раскрываемые |
| Фильтры | Все / Класс / Подкласс / Черты / С ресурсом / Выбор |
| Строка | имя · роль · scale/ресурс/выбор · превью summary |
| Логика | spend / picks / slot_spend без изменений (контракт feature_resource) |
| Не дублировать | тексты-заметки Общения — отдельно; здесь unlock-движок |

**Статус:** Идеал / LOCK.

## 2i. Напарники — LOCK

> **LOCK (Wave A companions):** зафиксировано с Игорем 2026-10-13. Не откатывать без нового согласования.

| Компонент | Правило |
|-----------|---------|
| Stage | `CompanionsPanel` сразу (glance→expand) |
| Без flip | нет «полностью» / «← компактно» / `PlayDeskCompanionsCompact` |
| Expand | multi-open; toolbar свернуть/развернуть все |
| Добавить | sticky «+ Добавить» → развилка Спутник / Напарник (Dialog) |
| Фильтры | Все / Спутники / Призывы / От умения |
| Строка | имя · тип · КД/HP/скорость · основной |
| Логика | create/update/remove без изменений (`companions.ts`) |

**Статус:** Идеал / LOCK.

## 2j. Владения (rail drawer) — LOCK

> **LOCK (Wave A ownership drawer):** зафиксировано с Игорем 2026-10-13. Не откатывать без нового согласования.

| Компонент | Правило |
|-----------|---------|
| Вход | CTA «Владения ▸» под пассивами в ability rail |
| Drawer | скорости/ТЗ · `EquipmentProficienciesPanel` · `LanguagesToolsPanel` |
| Логика | снятие доспеха без владения — как раньше на stage |
| ЕЩЁ | вкладки `ownership` нет; владения не дублируются на stage |

**Статус:** Идеал / LOCK.

## 2k. Основное (IdentityDialog) — LOCK

> **LOCK (Wave A identity dialog):** зафиксировано с Игорем 2026-10-13; черта от мастера — 2026-10-14. Не откатывать без нового согласования.

| Компонент | Правило |
|-----------|---------|
| Вход | клик по аватарке (hint «основное») или строка шапки раса·мировоззрение |
| Dialog | `IdentityDialog` size xl: аватар upload/delete + сборка |
| Секции | Персонаж · Классы · **Черты** · Раса и прошлое |
| Черты | список грантов; CTA **«Мастер выдал черту»** → `FeatSetupDialog`; source `manual`; Убрать только у manual |
| ASI-черта | по-прежнему на 4/6/8… в повышении уровня, не дублировать сюда |
| Сцена ЕЩЁ | нет |

**Статус:** Идеал / LOCK.

## 2l. Hot-bar + концентрация — LOCK

> **LOCK (Wave A hot-bar / BUG-019):** зафиксировано с Игорем 2026-10-13.

| Компонент | Правило |
|-----------|---------|
| Полоса | состояния · концентрация · пипсы ресурсов (Отдых в шапке) |
| Icons | `IconConditions` / `IconConcentration` / `IconPouch` |
| Каст | компакт → `CastSpellDialog` → слот + концентрация атомарно |
| Смена | confirm «Сменить и кастовать», если уже есть другая конц. |
| Урон | HP pad → диалог «Удержал / Сорвалось» (Сл = max(10, урон/2)) |

**Статус:** Идеал / LOCK.

## 2m. Список персонажей (kit + LSS-ценное)

> Не копировать LSS 1:1. Доска: `dvarf-ui-kit-rest-create-app.jpg` §E.

| Компонент | Правило |
|-----------|---------|
| Карточка | glance: круглый аватар · имя (display) · раса · класс ур. · edition · HP-полоска · теги |
| CTA | «Открыть» / «Продолжить»; ⋯ (угол карточки) → классический лист / удалить; без json/clone/pdf |
| Размер | Большие / Средние / Компактные (`sheet-chip`, localStorage `dvarf.characterList.v1`) |
| Теги | цветные pills + фильтр OR; CRUD в диалоге; пока в браузере (account sync — later) |
| Chrome | счётчик в заголовке; Create + sizes + Теги в toolbar |

**Статус:** собрано под кит — **хватит на сейчас**. Ideal/LOCK / polish — **доделать, когда будет время** (не блокер).

## 2n. Личный кабинет · Оформление (Wave B)

> Доски: `dvarf-ui-kit-cabinet.jpg` · `dvarf-ui-kit-cabinet-theme.jpg` · `themes-6`.

| Компонент | Правило |
|-----------|---------|
| Тема аккаунта | 6 swatches → `theme_id` на user → `html[data-theme]` → только `--accent` / `--accent-soft` |
| Дефолт | `wis` Листва |
| Цвета характеристик | `ability_colors`: `identity` (уникальные A, дефолт) **или** `theme` (все блоки = accent) — угодить и «ребит», и «кайф» |
| Chrome кабинета | back-link · title · Panels; danger не theme accent |
| Persist | PATCH `/auth/me`; cache `dvarf.accountAppearance.v1` до getMe |

**Статус:** собираем.

## 2o. Create pipeline 2014 (kit)

> Доска: `dvarf-ui-kit-rest-create-app.jpg` §D. Порядок шагов — **продуктовый**, не иллюстрация на доске.

| Компонент | Правило |
|-----------|---------|
| Порядок | Раса → Черта? → Предыстория → Класс → Характеристики → Прокачка |
| Stepper | done = accent-soft · active = solid accent · locked muted; title Source Serif accent |
| Панели | left/right `--panel`; catalog cards `--card`, selected = accent-soft |
| Filters | chips; active = **solid** accent |
| Method-cards | Массив · Point buy · **Бросок 4d6dl1** · Вручную — крупные interaction cards |
| Бросок | кости на строке (младший в `[]`); «Ещё раз» / «Перебросить все» → `baseAbilities` |
| Footer | ← Назад · **Шаг N из M** · Далее/Готово |
| Empty | `EmptyState` «Пока пусто» |
| Setup | Race / Class / Background / Subclass — `Dialog` + `sheet-chip` / `sheet-chip--block`; логика грантов без изменений |

**Статус:** Идеал / LOCK (ok Игоря 2026-10-13).

## 2p. Что ещё на столе (не LOCK)

| Область | Статус |
|---------|--------|
| **Список персонажей Ideal** | polish когда будет время |
| **Классический бланк** | отдельный print-трек |
| **Теги списка** | sync на аккаунт (сейчас localStorage) |

## 2r. Play Desk = единственный лист (LOCK)

> **LOCK (Play Desk source of truth):** зафиксировано с Игорем 2026-10-17 после инцидента с фейковым «листом» в превью агента.  
> Полный канон: [`../PLAY_DESK_SOURCE_OF_TRUTH.md`](../PLAY_DESK_SOURCE_OF_TRUTH.md).

| Правило | Деталь |
|---------|--------|
| Эталон | живой прод + доски §2b–2l + код `MinimalSheetEditor` / `PlayDeskHeader` / hot-bar |
| Запрет | второй layout листа; `/dev` mock-стол с самодельной шапкой; скрин фейка как «путь на проде» |
| Classic | только print (`/classic`), не digital Play Desk |
| Скрины для Игоря | `prod` \| `tip Play Desk` \| `dialog-only` \| `ui-kit board` — с подписью |
| ЛСС | референс поведения, **не** визуал стола Dvarf |

**Статус:** LOCK.

## 2q. Хаб лобби (A1) — LOCK

> **LOCK (Lobby Hub A1):** зафиксировано с Игорем 2026-10-15 (превью 8 игроков + скрины a1-roster).  
> **Инцидент 2026-10-16:** `index.css` от forms-adapt затёр блок A1→D1 — состав «поехал» (вертикальный список без карточек/табов).  
> Блок CSS помечен `UI KIT LOCK — Lobby Hub` в `frontend/src/index.css`. **Не удалять и не «упрощать»** без ok Игоря + обновления этого § и preflight.

| Компонент | Правило |
|-----------|---------|
| Табы | `.lobby-hub-tabs` sticky; `.lobby-hub-tab` pill; **active = solid `--accent` + белый текст** |
| Состав | `.lobby-member-grid` → 1→2→3→4 колонки (640 / 1000 / 1280); ориентир **~8**, запас до 10 |
| Карточка | `.lobby-member-card`: HP-полоска сверху (ok/warn/down) · аватар-инициал · имя · ур./раса/класс · HP · «Лист/Смотреть» + «Убрать» |
| Ширина хаба | `.page.page--lobby-hub` расширяется media (1120→1560), не узкий 720 на desktop |
| Код комнаты | `.lobby-hub-code__value` mono, accent, копируется кликом |
| Доска / эталон | `boards/dvarf-ui-kit-lobbies.jpg` · артефакты `a1-roster-*-desktop.png` |

Связанные блоки в том же LOCK-хвосте CSS (тоже священны): Session A2–A3, Journal A4, Chats A5, Notes A6, бой B1–B8, вики C1–C4, артефакты D1 (`.setting-wiki*`, `.setting-artifact*`).

**Статус:** Идеал / LOCK.

### 6b. Логика прода священна

Пиксельный restyle = CSS / className / обёртки.  
Не менять handlers, формулы бросков, cycle навыков, HP/слоты/spend, autosave.  
После слайса — скрин + smoke той же логики.

---

## 7. Запреты

- Не вводить параллельную палитру «на свой вкус».
- Не красить нейтрали и danger темой.
- Не перекрашивать identity характеристик темой аккаунта **по умолчанию** — только если пользователь явно выбрал `ability_colors=theme`.
- Не кодить UI «в обход» досок, если паттерн новый.
- Не возвращать purple-glow / default Inter-only / плоский white dashboard без пергамента.
- Не создавать альтернативный / упрощённый «лист персонажа» или fake Play Desk для демо (§2r).
