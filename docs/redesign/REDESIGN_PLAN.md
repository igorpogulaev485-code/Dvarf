# Dvarf — комплексный план редизайна

**Роль документа:** продуктовый UX/UI план поверх существующей функциональности и **Dvarf UI Kit (Листва)**.  
**Не цель:** ломать формулы, autosave, гранты, API.  
**Источники:** [`USER_FLOW.md`](../../USER_FLOW.md) · [`PLAY_DESK_MICROFLOWS.md`](../../PLAY_DESK_MICROFLOWS.md) · кейсы K1–K28 · [`docs/ui-kit/`](../ui-kit/) (tip Wave A) · [`docs/figma-flows/`](../figma-flows/).

> **Если ты новичок в дизайне/UX** — начни с простого текста: [`PROSTO.md`](PROSTO.md).

Прод: http://201.34.132.252/ · desk ≥960px + mobile · React + FastAPI.

---

## 0. Исходные жёсткие ограничения

| Ограничение | Следствие для редизайна |
|-------------|-------------------------|
| UI Kit закрыт (Листва `#5a6b3d`, Source Serif 4 + IBM Plex Sans, rail A) | **Не** вводить параллельную палитру / Inter-only / purple-glow |
| Логика прода священна | Restyle = CSS / layout / microcopy / motion; handlers и формулы — нет |
| Две линии tip (MOB / WAVE) | Свести к **одному desk chrome**; WAVE — целевой эталон виталов |
| Cards только для interaction | Никаких декоративных карточек в hero |
| Breakpoint 960px | Один информационный дизайн, две плотности |

---

## 1. Аудит текущего состояния

### 1.1 Цифровой лист (главный инструмент)

**Сильные стороны**
- Play desk отделяет «игру» от «настройки» (режимы Бой / Исслед. / Общение / Напарники).
- Wave A: vitals в шапке, pads (HP / монеты / отдых), hot-bar, compact-сцены — правильный игровой фокус.
- Rail характеристик (вариант A) с identity-цветами — сильный glanceable блок.
- Живые эталоны кита: Inventory / Attacks / Texts уже ближе к целевому виду.
- Autosave + конфликт версий — зрелая модель документа.

**Проблемные зоны**
| Зона | Симптом | Кейсы |
|------|---------|-------|
| Двойной chrome MOB vs WAVE | Разный mental model (sticky vs header, manual save vs autosave) | K1–K6, K23 |
| Режимы + select «Панель» | Лишняя развилка; игрок думает «где атаки» дважды | K1–K2, K7 |
| Заклинания / каст | Много уровней (настройки → гримуар → prepare → cast → upcast → conc) без единого «боевого» пути | K12–K15 |
| Инвентарь full vs compact | На desk compact хорош, full-панель перегружена фильтрами и деталями сразу | K8–K11, K27 |
| ЕЩЁ / Основное | Свалка настроек рядом с игровым контуром | K16–K18, K21 |
| Mobile WAVE | Стекует все панели — противоречит MOB one-panel | K2 |
| Подсказки ошибок | Toast-спам; мало inline recovery («что сделать дальше») | K10, K14, K27 |

### 1.2 Лобби / сессия

**Сильные стороны**
- Понятная роль мастера: создать → код/QR → состав → сессия.
- Join с `?next=` — корректный auth funnel.
- Вход кодом с листа (K22) сокращает путь игрока.

**Проблемные зоны**
| Зона | Симптом |
|------|---------|
| Создание лобби | Форма «название + создать» без превью «что получат игроки» |
| Хаб лобби | Плоский список действий; QR/код не доминирует визуально |
| Join | Выбор персонажа слабо связан с «за каким столом» |
| Сессия | Посадка есть, **бой/лут — stub**; экран обещает больше, чем даёт |
| Мастер vs игрок | Один layout; мало роли-зависимой иерархии |

### 1.3 Создание персонажа

**Сильные стороны**
- 2014 pipeline по шагам (раса → … → прокачка) — правильный wizard spine.
- Сводка справа из каталога — сильный «что получаю».
- Черновик + resume — уважение к длинному онбордингу.
- GuidedWizard единый для create/level-up.

**Проблемные зоны**
| Зона | Симптом |
|------|---------|
| Шаги | Длинный вертикальный путь; слабый progress «где я / сколько осталось» |
| Карточки рас/классов | Каталожная плотность без hero-сигнала выбранного |
| Характеристики | Три метода (массив / point buy / вручную) конкурируют без default-рекомендации |
| Гейты «Готово» | Ошибка внизу после длинного пути; нет progressive disclosure блокировок |
| 2014 vs 2024 | Два разных мира создания — путаница ожиданий |

### 1.4 Навигация приложения

- Шапка: Персонажи | Лобби | аватар→кабинет — ок, но **нет «сейчас за столом»** (активная сессия).
- Переход лист ↔ лобби ↔ classic — рабочие, но classic ощущается «другим приложением».
- Нет единого empty-state языка между списком персонажей и лобби.

---

## 2. Цели редизайна (без потери функций)

1. **За 3 секунды на листе** понять: жив ли герой, что можно сделать сейчас (режим), где каст/атака.
2. **Один desk-chrome** (Wave-наследник) на desktop и mobile-плотности.
3. **Лобби как социальный продукт:** код/QR и состав — hero; сессия честно показывает «сейчас / скоро».
4. **Create как онбординг:** прогресс, рекомендательный default, карточки с ясным выбором.
5. **Дизайн-система = UI Kit + компоненты состояний + motion** — расширение, не замена.

---

## 3. Новая визуальная концепция (в рамках кита)

### 3.1 Позиционирование

**«Стол, а не бланк»** — атмосфера пергамента и Листвы уже есть; усиливаем:
- игровой контур (desk) = плотный, быстрый, large-tap targets;
- настройка / create = спокойный каталог с богатой сводкой;
- print/classic = единственное «бланковое» место (как в ките).

### 3.2 Токены (не меняем hex без ok Игоря)

База из UI Kit:

| Роль | Token |
|------|-------|
| Ink / muted / panel / line / card / danger | как в `docs/ui-kit` |
| Accent default | Листва `#5a6b3d` / soft `#e5ecd4` |
| Ability identity | Медь…Слива (rail A LOCK) |
| Display | Source Serif 4 |
| UI | IBM Plex Sans |

**Добавить в кит (новые токены, не новая палитра):**

| Token | Предложение | Зачем |
|-------|-------------|-------|
| `--desk-z-sticky` | elevation scale 0–3 | шапка / hot-bar / pads |
| `--tap-min` | 44px | mobile |
| `--motion-fast/med` | 120ms / 220ms | единый motion |
| `--focus-ring` | accent 2px offset | a11y |
| `--mode-combat` … | soft tints от accent/abil | лёгкий tint режима (не новая радуга) |

### 3.3 Типографика (шкала)

| Ступень | Font | Size / weight | Где |
|---------|------|---------------|-----|
| Display L | Source Serif 4 | 28–32 / 700 | бренд, заголовок лобби |
| Display M | Source Serif 4 | 20–22 / 600 | titles панелей |
| UI L | Plex | 16 / 600 | primary CTA |
| UI M | Plex | 14 / 500 | строки списков |
| UI S | Plex | 12 / 500 | meta, chips |
| Numeric | Plex tabular | 18–28 / 600 | HP, КД, слоты |

### 3.4 Компонентная библиотека (атомы → организмы)

**Атомы (состояния: default / hover / active / disabled / loading / danger / empty)**  
Button (primary / soft / ghost / danger) · Chip / FilterChip · Field · Input · Textarea · Select · IconButton · Toast · Badge · ProgressDots · Skeleton.

**Молекулы**  
Pad (HpPad, CoinPad) · RestSheet · CastSheet · ConfirmDialog · EmptyState · CatalogCard · StepRail · ModeTab · VitalsCluster · SkillRow · SlotPips.

**Организмы**  
DeskHeader · HotBar · AbilityRail · SceneShell · InventoryList · SpellCombatTray · LobbyHero (код+QR) · CreateShell · SessionSeatMap.

Каждый новый паттерн → доска в `docs/ui-kit/boards/` + строка в UI Kit README (правило кита §6).

---

## 4. Редизайн по поверхностям

### 4.1 Цифровой лист

#### A. Панель виталов (приоритет P0)

**Структура**
```
[Аватар] Имя · раса · чипы классов
[КД] [Скор.] [Иниц.] [БМ] [Вдохн.] [Истощ.]
[HP cluster: текущ/макс · temp · death] [Монеты] [Отдых]
```
- HP — один primary tap-target (K3); death появляется **только** при HP≤0 (K4).
- Концентрация: chip в hot-bar + при уроне modal Удержал/Сорвалось (K5) — не дублировать в трёх местах.
- Мультикласс: чипы уровней под именем (уже в ките) — не раздувать шапку текстом.

**Взаимодействие**
- Desktop: hover = preview формулы (КД/иниц.) в soft tooltip.
- Mobile: pads на весь ширинный sheet (bottom sheet), не center modal.

#### B. Режимы (P0)

**Убрать двойной выбор «режим + панель».**  
Режим = сцена:

| Режим | Primary сцена | Secondary (split ≥960) |
|-------|---------------|-------------------------|
| Бой | Атаки | Заклинания (toggle) |
| Исследование | Снаряжение | Заклинания |
| Общение | Тексты | — / опц. заклинания |
| Напарники | Спутники | — |
| Способности | Умения + ресурсы | — |
| ЕЩЁ | segmented: Состояния · Основное · Настройка · Владения | — |

- ModeTab с иконкой + короткий hint (уже есть MODE_HINT) — показывать **одну** строку под табами.
- Mobile: ModeTab sticky; одна сцена (как MOB), не стек WAVE.

#### C. Атаки (P1)

- Combat tray: крупная строка атаки (имя · бонус · урон) → tap = бросок.
- Held controls (**взять/убрать**) вторичны, не конкурируют с броском.
- Расходники (K26): max 3, всегда видны в Бою под атаками.
- Empty: «Добавь оружие из снаряжения» + CTA в Исследование.

#### D. Заклинания (P1)

**Два режима панели, явный toggle:**
1. **Бой** — подготовленные / known ready: Каст одним тапом → sheet upcast/conc.
2. **Книга** — Гримуар / Подготовить / настройки слотов.

Каст-sheet (bottom/side): источник (слот/pact/ритуал/грант) → confirm.  
Нет ячеек (K14): inline recovery «Короткий отдых» / «Сброс pact», не только disabled.

#### E. Инвентарь (P1)

- Default: glance rows (иконка · имя · теги надето/в руках · вес).
- Expand row → детали / слоты / удалить (не все поля сразу).
- Фильтры sticky; active = solid accent.
- Перегруз (K27): sticky warning bar, не только строка внизу.
- Attunement: секция «Нужна настройка» с счётчиком слотов, не отдельный «потерянный» экран.

#### F. Прокачка / ЕЩЁ (P2)

- **+1 уровень** и смена архетипа — в Основное, с preview последствий.
- createGuide (K18): checklist overlay «Осталось N выборов», не только scroll+toast.

### 4.2 Лобби

#### Создание и список (P0)

- Список: карточки взаимодействия (имя · роль мастер/игрок · N участников · последняя сессия).
- Create: inline → сразу **Lobby Hero** с кодом/QR (не прятать на детали).

#### Хаб лобби (P0)

```
[Hero: название · КОД крупно · QR · копировать/поделиться]
[Состав: аватары персонажей]
[Сессии: эта / прошлые]
[Сеттинг: опц. свёрнут]
```
- Мастер: primary «Открыть сессию» / «Показать код».
- Игрок: primary «Мой персонаж» / статус посадки.

#### Join (P0)

1. Код (или deep link) → превью стола (название, мастер).
2. Выбор персонажа (карточки с аватаром/классом).
3. Confirm «Сесть за стол».

Ошибки: неверный код / нет персонажей — empty + CTA создать персонажа.

#### Сессия (P1, честный stub)

- Seat map: слоты игроков (посажен / свободен).
- Блок **«Скоро»**: инициатива / лут — disabled с подписью (не пустой бой).
- Пока нет combat frame — не имитировать готовую боевую комнату.

### 4.3 Создание персонажа

#### Pipeline shell (P0)

```
[StepRail: 1 Раса · 2 Черта? · 3 Фон · 4 Класс · 5 Статы · 6 Прокачка]
[Main: карточки + поиск]
[Summary: sticky «что получишь»]
[Footer: Назад · Сохранить черновик · Далее/Готово]
```
- Progress % + «Шаг N из M».
- Гейты: блокировать **Далее** на шаге, не копить ошибки до Готово.

#### Карточки рас / классов (P1)

- Выбранная = accent border + summary refresh (motion 220ms).
- В карточке: имя · source chip · 1–2 черты-обещания (скорость, ТЗ, hit die) — не стена текста.
- Деталь — в summary / sheet, не в каждой карточке.

#### Характеристики (P1)

- Default recommended: **стандартный массив**; point buy / вручную — secondary tabs.
- Живой preview расовых бонусов на числах (база → eff).
- Point buy: остаток очков всегда visible; invalid = inline, не toast.

#### 2024 path (P2)

- Тот же CreateShell visual; внутри — GuidedWizard steps.
- Явная метка редакции на старте выбора 2014/2024.

---

## 5. UX-улучшения сквозные

### 5.1 Сценарии (маппинг на K*)

| Сценарий | Целевое время / трение | Как меряем |
|----------|------------------------|------------|
| Открыл лист → готов атаковать | ≤ 2 тапа (K7) | task time |
| Урон/лечение | 1 tap + confirm (K3) | taps |
| Каст с upcast | ≤ 3 действия (K12) | taps |
| Join по QR | ≤ 40 сек с логином (K22) | funnel |
| Create 2014 до Готово | −30% drop на шагах 4–6 | step funnel |

### 5.2 Подсказки и ошибки

| Тип | Паттерн |
|-----|---------|
| Blocking | inline под контролом + disable primary |
| Recoverable | banner с CTA (отдых, снять доспех) |
| Info | soft tooltip / first-run coachmark (1 раз) |
| Danger | confirm sheet, не theme accent |
| Conflict (K23) | один dialog, copy как в WAVE: «Сохранить мои» / «Взять с сервера» |

### 5.3 Адаптив

| | Desktop ≥960 | Mobile |
|--|--------------|--------|
| Desk | rail + scene + optional split | ModeTab + one scene |
| Pads | popover near control | full-width bottom sheet |
| Create | 2-col cards+summary | cards; summary = bottom sheet «Сводка» |
| Lobby hero | QR слева/справа от кода | код крупно, QR accordion |

---

## 6. Система анимаций (2–3 intentional motion / поверхность)

| Имя | Timing | Где | Зачем |
|-----|--------|-----|-------|
| `mode-crossfade` | 180ms ease | смена режима | присутствие сцены |
| `hp-pulse` | 220ms | HP при уроне/хиле | обратная связь |
| `chip-pop` | 120ms | filter/mode active | иерархия |
| `sheet-rise` | 220ms | pads / cast sheet | mobile affordance |
| `summary-morph` | 220ms | create summary | «что изменилось» |
| `conc-warn` | 300ms | chip концентрации | внимание в бою |

**Не анимировать:** пересчёт всех списков при вводе, autosave spinner (только fade status).  
`prefers-reduced-motion`: только fade opacity.

---

## 7. План в Figma

### 7.1 Структура файла

```
Dvarf Design System
├── 0 Foundations (tokens, type, icons, motion)
├── 1 Components (atoms → molecules, all states)
├── 2 Desk (header, modes, attacks, spells, inventory, rail)
├── 3 Lobby (list, hub, join, session)
├── 4 Create (shell, cards, abilities, gates)
├── 5 Flows (вставить SVG из docs/figma-flows + K01–K28)
├── 6 Themes (6 accents × sample screens)
└── 7 Handoff (specs, redlines, Do/Don't)
```

### 7.2 Порядок досок (дизайн → ок Игоря → код)

1. Foundations sync с `docs/ui-kit` (не invent).
2. DeskHeader + ModeTab + CastSheet (P0 desk).
3. Lobby Hero + Join (P0 social).
4. Create shell + CatalogCard (P0 onboarding).
5. Inventory glance / Spells combat tray (P1).
6. Session seat map + honest stub (P1).
7. Motion prototype (FigJam / Smart Animate).
8. Themes B (после волны A в коде).

Импорт текущих flow: [`docs/figma-flows/`](../figma-flows/) — 13 продуктовых + 28 кейсов.

### 7.3 Handoff в код

- Каждая доска паттерна → файл в `docs/ui-kit/boards/` + README §4.
- Слайс кода только после ok; restyle без смены handlers.
- Скрин до/после + smoke K-кейсов из чеклиста §10.

---

## 8. Приоритеты и фазы внедрения

### P0 — «Играбельный стол» (фундамент UX)
1. Унификация desk chrome (WAVE-модель + MOB one-scene на mobile).
2. ModeTab без select «Панель».
3. Vitals cluster + bottom pads.
4. Lobby Hero (код/QR) + Join preview.
5. Create StepRail + footer gates.

### P1 — «Скорость за столом»
6. Attacks tray + consumables.
7. Spells Combat/Книга + cast sheet recovery.
8. Inventory glance/expand + encumbrance bar.
9. Session seat map + honest «Скоро».
10. Create cards + abilities default массив.

### P2 — «Полировка и темы»
11. createGuide checklist; classic soft-bridge.
12. Coachmarks first-run; empty-state unified.
13. Icon pack магия/каст (дыра кита §6a).
14. Волна B: theme picker в кабинете.
15. Motion pass + reduced-motion.

### Зависимости
```
UI Kit tokens (есть) → Desk chrome → Modes → Panels
         ↘ Lobby Hero → Join → Session stub
         ↘ Create shell → Cards → Abilities
Themes B только после волны A на всех трёх поверхностях
```

---

## 9. Метрики успеха

| Метрика | Baseline (замерить 1 нед.) | Цель |
|---------|---------------------------|------|
| Time-to-attack с открытия листа | замер | −40% |
| Cast complete rate (открыл каст → подтвердил) | замер | +25% |
| Join funnel (код → в лобби) | замер | ≥85% |
| Create step drop (шаг 4→6) | замер | −30% |
| Conflict dialog rate / save errors | замер | −20% |
| Mobile crash/blank (boot) | уже был фокус | не хуже |
| SUS / 5-вопросный опрос друзей Игоря | — | ≥4/5 «удобно в бою» |
| Task success K3, K7, K12, K22 | качеств. | 5/5 без подсказки |

---

## 10. Чеклист тестирования

### Функциональный (регрессия)
- [ ] K1–K28 сценарии (см. PLAY_DESK_MICROFLOWS)
- [ ] Create 2014 draft / Готово / F5
- [ ] Level-up / мультикласс / архетип
- [ ] Join + login next
- [ ] Classic round-trip autosave
- [ ] Version conflict MOB/WAVE copy

### UX
- [ ] Mode switch ≤1 tap to attacks/spells
- [ ] HP pad reachable one-handed (mobile)
- [ ] QR code ≥ reading size on mobile hub
- [ ] Create progress visible on all steps
- [ ] Empty states have CTA
- [ ] Danger confirms destructive

### Visual / a11y
- [ ] Contrast text on panel/accent-soft
- [ ] Focus ring keyboard
- [ ] Tap targets ≥44px mobile
- [ ] `prefers-reduced-motion`
- [ ] Theme Листва + одна не-зелёная (Чернила/Медь) на новых паттернах

### Perf
- [ ] Mode switch no full remount catalog
- [ ] Cast sheet open < 100ms after data ready

---

## 11. Гайдлайны дизайн-системы (кратко)

1. **Сначала кит** — `docs/ui-kit/README.md` + skill `dvarf-ui-kit`.
2. **Тема = только accent** — не красить panel/ink/danger/ability.
3. **Карточки = interaction** — иначе row/panel.
4. **Glance → expand** — списки снаряжения, заклинаний, текстов.
5. **Один primary на view** — остальное soft/ghost.
6. **Иконки до кода блока** — магия ещё не закрыта.
7. **Motion с смыслом** — feedback / hierarchy / presence, не декор.
8. **Честный stub** — «скоро» лучше фейковой боевой комнаты.
9. **Desktop и mobile — одна модель**, разная плотность.
10. **Любой новый паттерн → доска → ok → код.**

Полная библиотека состояний ведётся в Figma §7 + дублируется JPG-досками в репо для агентов.

---

## 12. Ожидаемые артефакты (Definition of Done редизайна)

| Артефакт | Статус в этом PR / следующий шаг |
|----------|----------------------------------|
| Аудит + план (этот файл) | ✅ |
| Flow SVG для Figma | ✅ `docs/figma-flows` (13+28) |
| UI Kit foundations | ✅ на tip Wave A; подтянуть в рабочую ветку при merge tip |
| Figma: Components + Desk/Lobby/Create | 🔜 дизайн-итерация |
| Доски новых паттернов в `docs/ui-kit/boards` | 🔜 по мере ok |
| Код P0 chrome | 🔜 отдельные слайсы от prod tip |
| Метрики baseline | 🔜 после P0 на проде |

---

## 13. Рекомендуемый первый слайс кода (после ok на досках)

**«Desk chrome unify»** (только UI):
- ModeTab без panel select;
- единый header vitals;
- mobile one-scene;
- без изменения HP/cast/inventory logic.

Критерий приёмки: K1, K2, K3, K7 проходят; скрин Листва; preflight tip зелёный.
