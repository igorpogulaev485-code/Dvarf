# Dvarf Mobile UI Kit — контракт телефона

**Статус:** контракт + **JPG-доски** на согласовании с Игорем → после ok обязателен для UI на `<960px`. Код — только после ok на картинки.  
**Доски:** [`boards/`](boards/) · сводная: [`boards/dvarf-mobile-kit-catalog.jpg`](boards/dvarf-mobile-kit-catalog.jpg)  
**База:** десктопный / планшетный кит [`docs/ui-kit/README.md`](../ui-kit/README.md) (**Листва**).  
**Этот файл не заменяет и не правит** десктопный кит. Десктопные LOCK-доски и README остаются как есть.

Skill: [`.cursor/skills/dvarf-ui-kit-mobile/SKILL.md`](../../.cursor/skills/dvarf-ui-kit-mobile/SKILL.md)  
План внедрения: [`docs/redesign/MOBILE_REDESIGN_PLAN.md`](../redesign/MOBILE_REDESIGN_PLAN.md) · простыми словами: [`PROSTO.md`](PROSTO.md)  
Паритет функций: [`PARITY.md`](PARITY.md)

Прод: http://201.34.132.252/ · breakpoint телефона: **`<960px`** (тот же `isPlayDesk`, что у десктопа).

> **ЕЩЁ:** в desktop UI Kit LOCK сцена упразднена (функционал разнесён). На проде tip `cursor/restore-wave-a-desk-0ed9` — без «ЕЩЁ». Мобильный кит = **5 сцен** (паритет desktop §2k).

---

## 0. Зачем отдельный кит

Десктопный кит закрыт под **стол** (≥960): rail слева, ModeTab, hot-bar, split, compact-сцены.  
На телефоне тот же продукт должен дать **все те же функции**, но другой chrome:

| | Desktop / tablet (≥960) | Phone (&lt;960) |
|--|-------------------------|----------------|
| Ментальная модель | Стол: rail + сцена | Карман: vitals + **одна сцена** |
| Навигация | ModeTab сверху + left rail | **Bottom Scene Nav** + sheet «Характеристики» |
| Плотность | Compact / split | Combat-density rows + bottom sheets |
| Pads | Popover / dialog у контрола | **Full-width bottom sheet** |

**Жёстко:** цвета, шрифты, иконки, accent-темы, identity характеристик, glance→expand логика панелей, autosave — **из десктопного кита**. Меняем только layout, reach, плотность и точки входа.

---

## 1. Токены (наследуем + мобильные дополнения)

### 1.1 Наследуем без изменений

Из [`docs/ui-kit/README.md`](../ui-kit/README.md) §1:

- Нейтрали: `--ink` `#2d2d2a` · `--muted` `#6f675c` · `--panel` `#fbf7ec` · `--line` `#e0d8c7` · `--card` `#fffdf8` · `--danger` `#b42318`
- 6 тем accent / soft (Листва дефолт `#5a6b3d` / `#e5ecd4`)
- Ability identity A (Медь…Слива) — **не** перекрашиваются темой
- Display: Source Serif 4 · UI: IBM Plex Sans
- Иконки: `deskIcons` / `spellIcons` / `attackIcons` — те же SVG

### 1.2 Мобильные токены (новые, не новая палитра)

| Token | Значение | Зачем |
|-------|----------|-------|
| `--tap-min` | `44px` | минимальная зона тапа (Apple HIG / Material) |
| `--tap-comfy` | `48px` | primary CTA / scene tab |
| `--mobile-pad-x` | `12px` | горизонтальный gutter экрана |
| `--mobile-gap` | `8px` | шаг между блоками сцены |
| `--mobile-section` | `12px` | между секциями |
| `--sheet-radius` | `16px 16px 0 0` | верхний радиус bottom sheet |
| `--nav-h` | `56px` | высота Bottom Scene Nav (+ safe-area) |
| `--vitals-sticky-z` | `40` | vitals над сценой |
| `--nav-z` | `50` | bottom nav над sheets backdrop |
| `--sheet-z` | `60` | bottom sheet / pads |
| `--motion-fast` | `120ms` | chip / tab on |
| `--motion-sheet` | `220ms` | sheet-rise |
| `--motion-mode` | `180ms` | смена сцены |
| `--focus-ring` | accent 2px offset | a11y клавиатура / switch control |

Safe area: `padding-bottom: max(12px, env(safe-area-inset-bottom))` на nav и sheets.

---

## 2. Поведенческие принципы (BA / mobile PM)

1. **Одна рука, большой палец.** Primary действия — в нижней трети экрана или в sticky vitals с крупным HP.
2. **Одна сцена = один job.** Нельзя снова получить «простыню» всех панелей Wave A.
3. **Паритет функций, не паритет пикселей.** Всё, что есть на столе, достижимо ≤2–3 тапами с телефона.
4. **Glance → expand.** Длинные списки (атаки, заклинания, лут, тексты) — короткая строка, деталь по тапу.
5. **Sheet, не center-modal.** Rest / HP / монеты / каст / состояния / владения / identity / attunement — bottom sheet.
6. **Один primary на view.** Остальное soft/ghost.
7. **Честный stub.** Нет фейкового боя в сессии.
8. **Не ломать логику.** Restyle + chrome + wiring входов; handlers / формулы / autosave священны.
9. **prefers-reduced-motion** → только opacity fade.
10. **Новый мобильный паттерн** → описание здесь (+ опц. SVG в `boards/`) → ok Игоря → код.

---

## 3. Shell телефона — LOCK-кандидат

> После ok Игоря этот раздел становится **LOCK** (как Wave A header на десктопе). До ok — спецификация к реализации.

### 3.1 Слои экрана (снизу вверх по z, сверху вниз по UI)

```
┌─────────────────────────────┐
│ AppHeader (сжатый)          │  опц. свернуть на /characters/:id
├─────────────────────────────┤
│ MobileVitalsBar (sticky)    │  HP · КД · скор · иниц · chips
├─────────────────────────────┤
│ HotStrip (optional row)     │  состояния · конц · ресурс-пипы
├─────────────────────────────┤
│ Scene (одна)                │  scroll; padding-bottom под nav
├─────────────────────────────┤
│ Bottom Scene Nav            │  5–6 табов + safe-area
└─────────────────────────────┘
         ↑ bottom sheets overlays
```

### 3.2 MobileVitalsBar

Наследует **способности** Wave A `PlayDeskHeader`, не визуальный клон на узкой ширине.

| Элемент | Поведение |
|---------|-----------|
| Who | Имя (1 строка) · раса · чип класса; tap → Identity sheet |
| КД / Скор. / Иниц. / БМ | vital chips; tap → tooltip/sheet формулы (не edit «вслепую») |
| HP | **крупный** primary tap → HpPad sheet (урон/хил/temp/death) |
| Death | только при HP≤0; opaque card + череп (как desktop LOCK) |
| Вдохн. / Истощ. | chips; истощение → Conditions sheet |
| Монеты | icon → CoinPad sheet |
| Отдых | icon → Rest sheet |
| XP | компактная полоска или «⋯ vitals» → sheet (не выкидывать) |
| Концентрация | chip; clear + при уроне из HpPad — «Удержал / Сорвалось» |

**Эволюция кода:** расширить `CombatStickyHeader` до паритета входов Wave A, либо новый `MobileVitalsBar` с теми же callbacks, что `PlayDeskHeader`.

### 3.3 HotStrip

Мобильный аналог `PlayDeskHotBar`:

| Chip | Действие |
|------|----------|
| Состояния | → HotConditions sheet (LOCK desktop §2e) |
| Концентрация | статус / сброс |
| Ресурс-пипы | spend как на столе |
| (Отдых уже в vitals) | не дублировать |

Icons: те же `IconConditions` / `IconConcentration` / `IconPouch`.

### 3.4 Bottom Scene Nav

| Tab id | Label (desktop `MODE_LABELS` после drop ЕЩЁ) | Primary сцена | Secondary |
|--------|-----------------------------------------------|---------------|-----------|
| `combat` | **Бой** | Атаки (combat density) | Заклинания — segmented |
| `explore` | **Исследование** | Инвентарь | Attunement из summary |
| `social` | **Общение** | Тексты | — |
| `companions` | **Напарники** | Companions | — |
| `features` | **Способности** | ClassFeatures | — |

**Сцены «ЕЩЁ» нет** — как в desktop UI Kit LOCK (§2e/2j/2k) и ветке `characters-list-kit` (legacy `more` → `combat`).  
Бывший функционал ЕЩЁ на телефоне тоже **разнесён**, не собираем обратно в tab:

| Было в ЕЩЁ | Куда на mobile (паритет desktop LOCK) |
|------------|----------------------------------------|
| Состояния | HotStrip → Conditions sheet |
| Основное / identity | аватар / who → Identity sheet |
| Настройка (attunement) | Исследование summary → Attunement sheet |
| Владения | из Характеристик CTA «Владения ▸» → bottom sheet (не left drawer) |
| Характеристики (rail) | отдельный вход: chip/кнопка в vitals или sheet «Характеристики» — **не** 6-й tab «ЕЩЁ» |

Короткие подписи под иконкой ок (`Исслед.` / `Способн.`); `aria-label` = полный label.

**Правила**

- Ровно **одна** сцена на экране (`play-desk__body--mobile` + `stageHidden`).
- Tab active = solid accent; иконка + короткий label.
- Высота ≥ `--tap-comfy` + safe-area.
- **Не** возвращать tab/сцену «ЕЩЁ».
- Характеристики **не** permanent top rail: sheet/вход из vitals (паритет desktop left rail без 6-го режима).

Рекомендуемый default tab при открытии листа: **Бой** (time-to-attack).

### 3.5 Bottom sheets (единый паттерн)

| Sheet | Триггер | Содержимое |
|-------|---------|------------|
| HpPad | HP | урон / хил / temp / death / max-by-levels |
| CoinPad | монеты | разбивка + edit |
| Rest | Отдых | кости / короткий / длинный |
| Conditions | HotStrip | exhaustion + on-character + quick pick |
| Cast | Каст | upcast / источник / conc swap |
| Ownership | из Характеристик «Владения ▸» | скорости/ТЗ · снаряжение · языки/инструменты |
| Identity | аватар / who | как desktop IdentityDialog |
| Attunement | summary инвентаря | слоты 0–3 |
| Abilities | vitals → sheet Характеристики | AbilitySkillsColumn full |

CSS: уже есть задел `@media (max-width: 640px)` → `align-items: flex-end` у dialog. Унифицировать на `<960` для play pads.

Motion: `sheet-rise` 220ms; dismiss swipe-down optional P2.

---

## 4. Плотность сцен (combat density)

Вернуть / стандартизировать классы (раньше были в MOB + FEATURE_LOCK):

| Класс | Где |
|-------|-----|
| `attack-card__combat` | Бой · атаки |
| `spell-card__combat` | Бой · готовые заклинания |
| `inventory-card__combat` | Исследование · glance rows |

Правила строки:

- min-height ≥ `--tap-min`
- primary action (бросок / Каст) — правый крупный hit-area
- secondary (удерж./взять, ★, expand) — не конкурируют с primary
- filters = sticky chips under HotStrip
- empty = muted + soft CTA в нужную сцену

Compact-компоненты десктопа (`PlayDesk*Compact`) **можно** переиспользовать внутри мобильной сцены, если плотность ок; иначе full panel + `__combat` rows. Не стекать full+compact.

---

## 5. Паритет с desktop LOCK (обязательный)

Каждый desktop LOCK должен иметь **мобильную точку входа**. Детали матрицы — [`PARITY.md`](PARITY.md).

| Desktop LOCK | Mobile вход |
|--------------|-------------|
| §2b Header | MobileVitalsBar |
| §2c Spells | Бой → сегмент Заклинания / Книга sheet |
| §2d Attacks | Бой → Атаки |
| §2e Conditions | HotStrip |
| §2f Inventory | Исследование |
| §2g Texts | Общение |
| §2h Features | Способности |
| §2i Companions | Напарники |
| §2j Ownership | Характеристики → «Владения ▸» sheet (**не** left drawer, **не** ЕЩЁ) |
| §2k Identity | аватар / who line (сцена ЕЩЁ нет) |
| §2l Hot-bar + conc | HotStrip + HpPad conc-on-damage |
| §2m Character list | list density (см. §7) |

**Запрещено** оставлять функцию «только если ≥960».

---

## 6. Типографика на узкой ширине

| Ступень | Size / weight | Где |
|---------|---------------|-----|
| Display M | 18–20 / 600 Source Serif | заголовок сцены |
| UI L | 16 / 600 | primary CTA, tab label |
| UI M | 14 / 500 | строки списков |
| UI S | 12 / 500 | meta, chips |
| Numeric L | 22–28 / 600 tabular | HP |
| Numeric M | 16–18 / 600 | КД, бонусы атаки |

Не уменьшать body &lt;14px для читаемых строк боя.

---

## 7. Остальные поверхности приложения

### 7.1 Список персонажей

- Карточки kit §2m; на телефоне default размер **Средние** или **Компактные**
- Primary «Открыть» ≥ `--tap-comfy`
- Меню ⋯ — sheet actions (не крошечный popover у края)
- AppHeader: убрать/спрятать «Официальный сайт» в overflow на `<640`

### 7.2 Create pipeline

```
[StepRail sticky top — шаг N из M + %]
[Cards list]
[Footer sticky: Назад · Черновик · Далее]
[Сводка — button «Сводка» → bottom sheet]
```

- Гейты на шаге (не копить до Готово)
- Catalog detail: на `<860` уже stack — закрепить как mobile pattern, не два столбца

### 7.3 Лобби / Join

- Lobby Hero: **код крупно** (display), QR в accordion «Показать QR»
- Share / copy — primary в thumb zone
- Join: код → превью стола → выбор персонажа (карточки) → confirm

### 7.4 Кабинет / Auth

- Одна колонка; theme picker как на десктопе (только accent)
- Dialogs → bottom sheet на `<640`
- Сессии устройств: крупные destructive confirms

### 7.5 Classic print

- Не play-UX; deep link с карточки / sheet. На телефоне — предупреждение «удобнее с ПК» + всё же открыть

---

## 8. Motion (2–3 на поверхность)

| Имя | ms | Где |
|-----|-----|-----|
| `scene-crossfade` | 180 | смена tab сцены |
| `sheet-rise` | 220 | любой bottom sheet |
| `hp-pulse` | 220 | HP после урона/хила |
| `chip-pop` | 120 | tab / filter on |
| `conc-warn` | 300 | chip концентрации |

---

## 9. A11y / perf

- Tap ≥44px; focus ring виден
- `aria` у nav: `navigation` / `tablist`
- Смена сцены **без** remount всего каталога заклинаний/лута, если данные те же
- Boot splash anti-blank (`#boot`) сохраняем
- Не хуже текущего mobile crash/blank

---

## 10. Запреты (mobile-specific)

- Не править / не удалять [`docs/ui-kit/`](../ui-kit/) «под мобилку»
- Не возвращать **stack всех панелей** на `<960`
- Не left-drawer для ownership на телефоне
- Не прятать Rest / Conditions / Coins / Conc-damage «потому что нет места»
- Не вводить вторую палитру / dark-only / Inter-only
- Не менять формулы, spend, autosave «заодно»
- Не деплоить mobile-слайс без паритета P0 из плана

---

## 11. Как наполнять мобильный кит

1. Нужен новый **мобильный** паттерн? → секция здесь + опц. SVG в `docs/ui-kit-mobile/boards/`
2. Атом уже в десктопном ките? → переиспользовать, только density/placement
3. Затронут desktop LOCK? → не менять смысл LOCK; только mobile entry
4. Ok Игоря → код от **prod tip**
5. После кода: скрин телефона + smoke кейсов K2, K3, K7, K12 + preflight

---

## 12. Связь с десктопным редизайном

Десктопный план ([`docs/redesign/REDESIGN_PLAN.md`](../redesign/REDESIGN_PLAN.md) на ветке microflows) уже требовал:

> «Один desk-chrome (Wave-наследник); mobile = ModeTab + one scene»

Mobile UI Kit — **исполнение** этого требования отдельным контрактом, потому что Wave A на проде закрыл стол, а телефон временно остался со стеком панелей без mode chrome.
