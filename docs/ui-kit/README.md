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
- навык = строка-кнопка: `—` → `Влад.` → `Эксп.` (не switch);
- Пр — read-only chip; Сп — toggle владения;
- база → эффективный (`16 → 18`);
- свернуть навыки — клик по **полному названию** (Сила / Ловкость…; отдельной кнопки ▾ в краю нет);
- шапка в две строки: полное название · число/`→eff` + Пр/Сп;
- пассивы — glance-карточки; CTA «Владения» → drawer.

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

**Сначала** — единый кит в **одном** цвете (дефолт Листва): токены, паттерны, rail A, панели/хром.  
**Потом** — выбор темы в кабинете (`data-theme` / `--accent` swap) и сохранение на аккаунт.

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
**Hot-bar audit (2026-10-13):** логика ок (состояния / снять конц. / пипсы). Gap vs `desk-chrome` §D: нет line-icons на полосе; live = текстовые wide + пипсы (Отдых в шапке). Ресурсы дублируются в hot-пипсах и компакте атак.  

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

**Дальше (не без ok):** сцена Исследование (компакт снаряжения ↔ эталон Inventory); hot-bar icons на полосе; каст→концентрация (BUG-019); A5.

Rail характеристик (вариант A) иконок не требует — полные названия, chips, drag.

### 6b. Логика прода священна

Пиксельный restyle = CSS / className / обёртки.  
Не менять handlers, формулы бросков, cycle навыков, HP/слоты/spend, autosave.  
После слайса — скрин + smoke той же логики.

---

## 7. Запреты

- Не вводить параллельную палитру «на свой вкус».
- Не красить нейтрали и danger темой.
- Не перекрашивать identity характеристик темой аккаунта.
- Не кодить UI «в обход» досок, если паттерн новый.
- Не возвращать purple-glow / default Inter-only / плоский white dashboard без пергамента.
