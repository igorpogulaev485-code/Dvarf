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
| Desk chrome | `dvarf-ui-kit-desk-chrome.jpg`, `dvarf-ui-kit-desk-icons.jpg`, `dvarf-ui-kit-desk-header-states.jpg` |
| Pads / dialogs | `dvarf-ui-kit-dialogs-pads.jpg` |
| Rail | `dvarf-ui-kit-ability-rail-v2.jpg`, `dvarf-ui-kit-ability-colors.jpg` |
| Spells | `dvarf-ui-kit-spells.jpg` |
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

Сейчас есть: иконки под **инвентарь** (и частично texts); **шапка стола** — line-иконки виталов/монет/отдыха/**черепа death** (`deskIcons.tsx`, доски `desk-chrome` / `desk-icons` / `desk-header-states`).  
Ещё нет: отдельный набор под **магия / каст / слоты** (и hot-bar — проверять при старте слайса).

**Шапка стола — краевые состояния (зафиксировано в компоновке):**

| Состояние | Как в шапке |
|-----------|-------------|
| Мультикласс (2–4+) | чипы `Класс N` под расой; раса/мировоззрение/2014 отдельно от классов |
| Alt-скорости | ход — крупное число; лаз/плав/полёт — мини-чипы под ним |
| Нет хода, есть alt | первичная скорость = первый alt (подпись лаз./плав./полёт), остальные чипами |
| HP ≤ 0 / при смерти | блок спасбросков справа от HP + **IconSkull**; треки активны |

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
