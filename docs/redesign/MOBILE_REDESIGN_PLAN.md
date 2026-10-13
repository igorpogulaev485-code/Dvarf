# Dvarf — план мобильного редизайна

**Роль:** продуктовый + поведенческий план для телефона (`<960px`), поверх **Desktop UI Kit (Листва)** и нового **Mobile UI Kit**.  
**Не цель:** менять формулы, autosave, API, удалять десктопный кит.  
**Путь-образец:** тот же, что у десктопа — [`REDESIGN_PLAN.md`](REDESIGN_PLAN.md) (ветка microflows) → Wave A LOCK на столе.

Документы:

| Документ | Зачем |
|----------|-------|
| [`docs/ui-kit/README.md`](../ui-kit/README.md) | Десктопный кит — **не трогаем** |
| [`docs/ui-kit-mobile/README.md`](../ui-kit-mobile/README.md) | Новый мобильный контракт |
| [`docs/ui-kit-mobile/PARITY.md`](../ui-kit-mobile/PARITY.md) | Матрица паритета функций |
| [`docs/ui-kit-mobile/PROSTO.md`](../ui-kit-mobile/PROSTO.md) | Для новичка |
| [`MOBILE_PROSTO.md`](MOBILE_PROSTO.md) | Этот план простыми словами |

Прод tip на старт работ: `cursor/create-pipeline-kit-prod-244b` · URL http://201.34.132.252/

---

## 0. Жёсткие ограничения

| Ограничение | Следствие |
|-------------|-----------|
| Desktop UI Kit закрыт | Только наследуем токены/иконки/LOCK-смысл |
| Mobile kit — отдельный док | Правки мобилки ≠ правки `docs/ui-kit/` |
| Логика священна | Chrome + wiring входов; не handlers формул |
| Паритет 100% функций | Нет «это только на ПК» |
| Breakpoint 960 | Одна модель данных UI (`deskMode`/`panel`), две плотности |
| Plan → ok Игоря → код | По `dvarf-dev-workflow` |
| Prod lineage | Ветка от tip; preflight; деплой только по «залей на сервер» |

---

## 1. Аудит (кратко)

### 1.1 Что сделали правильно на десктопе (повторяем метод)

1. Зафиксировали UI Kit + skill + AGENTS §0.  
2. Написали `REDESIGN_PLAN` с P0/P1/P2.  
3. Внедрили Wave A слайсами с LOCK (header → spells → attacks → inventory → …).  
4. Не ломали игровую логику.

### 1.2 Что сломалось на телефоне

Wave A chrome завязан на `isPlayDesk` (`min-width: 960px`). На телефоне:

- нет ModeTab / HotBar / Rest / Coin / Ownership CTA;
- `stageHidden` отключён → **все панели стеком**;
- `CombatStickyHeader` не дотягивает до паритета `PlayDeskHeader`;
- плотность `*-card__combat` и one-panel из MOB-линии не в tip.

Это регрессия UX относительно старого MOB play-desk, при том что **десктоп стал эталоном функций**.

### 1.3 Поведенческий диагноз

| Проблема | Эффект на игрока за столом с телефоном |
|----------|----------------------------------------|
| Cognitive overload | Не найти атаку за 3 сек |
| Top-heavy chrome | Большой палец не достаёт primary |
| Hidden Rest/Conditions | Ломает mid-combat loops |
| Endless scroll | Ошибки «не ту панель», случайные правки |
| Dual mental models | Друзья на ПК и телефоне «как будто в разных приложениях» |

---

## 2. Цели

1. **Time-to-attack ≤ 2 тапа** с открытия листа на 390px.  
2. **Одна сцена** на экране; Bottom Scene Nav.  
3. **100% паритет** функций Wave A (матрица PARITY → все ✅).  
4. **Одна рука:** vitals + bottom nav + sheets.  
5. **Тот же бренд:** Листва, без параллельной палитры.  
6. Метод десктопа: kit → plan → ok → code slices → prod.

---

## 3. Целевая информационная архитекция

```
/characters/:id  (<960)
├── MobileVitalsBar     ← все vitals-входы Wave A
├── HotStrip            ← conditions / conc / pips
├── SceneHost (one)     ← panel by mobileScene
└── BottomSceneNav      ← combat explore social features companions more
```

Маппинг tab → panel (предложение в state `sheetUi`):

| `mobileScene` | Панели |
|---------------|--------|
| `combat` | attacks (+ spells via `combatSpellSeg`) |
| `explore` | inventory |
| `social` | texts |
| `features` | features |
| `companions` | companions |
| `more` | abilities \| ownership (sheets); identity from avatar |

Десктопные `deskMode` / compact можно оставить для ≥960; на mobile — отдельный ключ или адаптер, **без** стека.

---

## 4. Фазы внедрения

### P0 — «Играбельный телефон» (фундамент)

**Слайс M0.1 — Mobile shell**  
- Вернуть one-panel: `play-desk__body--mobile` + `stageHidden` на `<960`  
- Bottom Scene Nav (без panel `<select>`)  
- Убрать стек всех панелей  
- Файлы: `MinimalSheetEditor.tsx`, `playDeskUi.ts`, `index.css`

**Слайс M0.2 — Vitals parity**  
- Rest, CoinPad, HpPad (temp/death), conc-on-damage с sticky/vitals  
- Who → Identity sheet  
- Файлы: `CombatStickyHeader.tsx` / `MobileVitalsBar`, pads, `RestDialog`

**Слайс M0.3 — HotStrip + Conditions**  
- Провод `PlayDeskHotBar` / `HotConditionsDialog` на mobile  
- Файлы: hot bar, conditions dialog, CSS strip

**Слайс M0.4 — Combat scene + abilities entry**  
- Бой = атаки (+ сегмент заклинания)  
- Ещё → Характеристики (abilities tab/sheet)  
- Владения → bottom sheet  
- Density `*-card__combat`

**Критерий P0:** K2, K3, K6, K7 проходят на 390px; Rest/Conditions/атака доступны; нет стека панелей.

### P1 — «Скорость и паритет сцен»

| Слайс | Содержание |
|-------|------------|
| M1.1 | Spells: Бой/Книга + cast sheet recovery |
| M1.2 | Inventory glance + attunement entry + encumbrance bar |
| M1.3 | Social / Features / Companions — one scene each, toolbar |
| M1.4 | Skill strips / roll mode на mobile (Бой или Характеристики) |
| M1.5 | Create: sticky StepRail + footer gates + Сводка sheet |
| M1.6 | Character list density + ⋯ action sheet |
| M1.7 | Lobby Hero (код + QR accordion) + Join thumb flow |

**Критерий P1:** PARITY §A и §B без ❌/💀; create/lobby usable one-handed.

### P2 — «Полировка»

- Motion pass (`scene-crossfade`, `sheet-rise`, `hp-pulse`) + reduced-motion  
- Companion dock optional  
- AppHeader compact / overflow  
- Cabinet/auth sheet polish  
- Classic soft-bridge warn  
- Coachmarks first-run (1 раз)  
- FEATURE_LOCK machine markers для mobile shell  
- Метрики baseline

---

## 5. Порядок = путь десктопа

```
Desktop path (уже сделано):
  UI Kit → REDESIGN_PLAN → ok → Wave A LOCK slices → tip

Mobile path (этот документ):
  Mobile UI Kit → MOBILE_REDESIGN_PLAN → ok Игоря
    → M0.1 shell → M0.2 vitals → M0.3 hot → M0.4 combat/abilities
    → M1.* scenes / create / lobby
    → M2 polish → prod tip + PRODUCT_STATUS
```

Каждый слайс: короткий план в чат (если scope сдвинулся) → ok → commit/push/PR → smoke на 390px.

---

## 6. Метрики

| Метрика | Цель |
|---------|------|
| Time-to-attack (cold open → roll) | ≤ 2 тапа / −40% vs текущий стек |
| Rest reachable | 1 тап из vitals |
| Conditions reachable | 1 тап из HotStrip |
| Create step drop 4→6 | не хуже десктопа; −20% frustration (опрос) |
| Join code → seated | ≥85% без помощи |
| Blank/boot crash | не хуже |
| Опрос друзей «удобно в бою с телефона» | ≥4/5 |

---

## 7. Чеклист тестирования

### Функциональный

- [ ] K2 one-zone на 390 и 768  
- [ ] K3 HP pad + death  
- [ ] K5 conc on damage  
- [ ] K6 Rest  
- [ ] K7 attack roll  
- [ ] K12–K15 cast / upcast / no slots recovery  
- [ ] K8–K11 inventory  
- [ ] K16–K18 identity / level hooks  
- [ ] K22 join  
- [ ] K23 conflict dialog  
- [ ] Create draft / Готово / F5  
- [ ] Classic open from card  

### UX / a11y

- [ ] Bottom nav ≥48px + safe-area  
- [ ] Sheets dismissible  
- [ ] Tap ≥44px  
- [ ] Focus ring  
- [ ] One primary per scene  
- [ ] Листва + одна не-зелёная тема  

### Regress desktop

- [ ] ≥960: Wave A LOCK без визуальных регрессий  
- [ ] preflight-prod зелёный  

---

## 8. Риски

| Риск | Митигация |
|------|-----------|
| Сломать desktop `isPlayDesk` ветки | Чёткие ветки `if (!isPlayDesk)`; визуальный smoke ≥1280 |
| Двойной state mode/panel | Один адаптер mobileScene ↔ panel id |
| Забыть FEATURE_LOCK маркеры | Вернуть contains-patterns в lock при M0.1 |
| Scope creep «заодно RN» | Out of scope: React Native; только responsive web |
| Деплой тонкой ветки | Только от prod tip + preflight |

---

## 9. Out of scope

- Редизайн десктопного кита / смена Листвы  
- React Native приложение  
- Combat frame сессии / лут-стол  
- Новые правила 5e / homebrew engine  
- Параллельная dark-тема  

---

## 10. Первый код-слайс (после ok на кит+план)

**M0.1 Mobile shell unify**

- Bottom Scene Nav + one-panel  
- Не менять HP/cast/inventory handlers  
- Скрин 390px до/после  
- Acceptance: K2; панели не стекаются; desktop ≥960 без регрессии  

---

## 11. Definition of Done релиза в прод

1. Mobile UI Kit ok + этот план ok.  
2. P0 закрыт на tip; P1 паритет без 💀/❌.  
3. `./deploy/preflight-prod.sh` green.  
4. Явное «залей на сервер» от Игоря.  
5. Проверка живого URL на телефоне / DevTools 390px.  
6. `PRODUCT_STATUS.md` + смена prod tip.  
7. Сообщение для друзей — только если попросишь.

---

## 12. Решение, которое нужно от Игоря сейчас

1. **Ок мобильный UI Kit** (`docs/ui-kit-mobile/`) как контракт?  
2. **Ок Bottom Scene Nav** (а не возврат MOB select «Панель»)?  
3. **Ок фазы P0→P1→P2** и старт с M0.1 после ok?  
4. Имя таба «Сумка» vs «Исслед.» / «Речь» vs «Общение» — ок копирайт?
