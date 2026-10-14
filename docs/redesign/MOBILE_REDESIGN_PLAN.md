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

**Live prod tip (сверка 2026-10-14):** `cursor/buffs-ac-slice-244b` · URL http://201.34.132.252/  
Бандл-маркеры: `CharacterDetailPage-DFLWQXEV.js` · CSS `index-DY8NTA2Z.css`  
Старт mobile-kit ветки был от более раннего tip — **перед следующим кодом/деплоем mobile rebase/merge на live tip**.

> Mobile chrome (M0–M1.1) **ещё не на проде**. На телефоне live = desk tip без Bottom Nav / Книга / cast recovery.

---

## 0. Жёсткие ограничения

| Ограничение | Следствие |
|-------------|-----------|
| Desktop UI Kit закрыт | Только наследуем токены/иконки/LOCK-смысл; **новые desk-фичи = новые mobile входы** |
| Mobile kit — отдельный док | Правки мобилки ≠ правки `docs/ui-kit/` (кроме ссылок на LOCK) |
| Логика священна | Chrome + wiring входов; не handlers формул / modifiers / heldEquip |
| Паритет 100% функций | Нет «это только на ПК» — включая бафы, щит, прыжок, историю бросков |
| Breakpoint 960 | Одна модель данных UI (`deskMode`/`panel`), две плотности |
| Plan → ok Игоря → код | По `dvarf-dev-workflow` |
| Prod lineage | Ветка от **live** tip; preflight; деплой только по «залей на сервер» |

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
| *(нет more/ЕЩЁ)* | identity ← avatar; abilities/ownership ← sheets из vitals; conditions ← HotStrip |

Десктопные `deskMode` / compact можно оставить для ≥960; на mobile — отдельный ключ или адаптер, **без** стека.

---

## 4. Фазы внедрения

### 4.0 Desk delta 2026-10-14 (не было в исходном mobile-плане)

Сверено с живым продом (`buffs-ac-slice-244b`) + PRODUCT_STATUS / PR #152–#159.  
Это **новые эталоны стола** — mobile должен дать те же входы, иначе паритет снова «только на ПК».

| Desk (на проде) | Что это | Mobile вход (цель) | Слайс |
|-----------------|---------|--------------------|-------|
| Витал **Прыж.** `15/5` | PHB long/high в шапке | chip в `MobileVitalsBar` (+ tip) | **M0.5** |
| Чип **щит** под КД | draw/stow held shield → КД | тот же chip под КД на phone | **M0.5** |
| Разборка **КД** | клик КД → база / щит / бонусы | bottom sheet (те же handlers) | **M0.5** |
| Разборка **характеристик** | клик названия → бафы / проверки / спас | sheet со страницы Характеристики | **M0.6** |
| Разборка **инициативы** | клик Иниц. → база / оверрайд / бонусы | sheet из vitals | **M0.6** |
| **СЛ / атака** заклинаний | клик в настройках / Книге | sheet из Книги / compact stats | **M0.6** |
| Формулы бонусов `+`/`−`/`=` · `[WIS]`… | общий engine `modifiers` | **не форкать** — те же dialogs/sheets | **M0.6** |
| Рейл LSS: **pip + число→бросок** | влад./эксп. отдельно от roll | страница Характеристики | **M0.6** |
| **броски** + история (50) | рядом с норм/преим./помеха | sticky в Бою + sheet истории | **M1.4** |
| Тост броска длиннее / hover pause | desk UX friend feedback | тот же `Toast` (уже общий) | **M1.4** |
| Безрассудная → **преим.** | chip атаки включает advantage | Бой compact (тот же wiring) | **M1.4** |
| Identity **Черты** + «Мастер выдал черту» | §2k LOCK 2026-10-14 | секция в Identity sheet | **M0.4b** |
| Варвар: Безрассудная в Бою, текст Ярости | friend feedback | сцена Бой / Способности | **M1.3** |
| Свои способности на панели | homebrew block | сцена Способности | **M1.3** |
| Тема кабинета persist | Wave B fix | уже P2 polish; проверить `<960` | **M1.6+/P2** |
| Cleric/create/lizardfolk catalog | логика, не chrome | бесплатно после rebase на tip | gate |

**Gate перед любым следующим mobile-кодом:**  
`git merge origin/cursor/buffs-ac-slice-244b` (или актуальный live tip) в mobile-ветку + зелёный preflight.  
Иначе ship mobile затрёт сегодняшние desk-фиксы.

### P0 — «Играбельный телефон» (фундамент)

**Слайс M0.1 — Mobile shell** · код в `cursor/mobile-ui-kit-0ed9` (не на проде)  
- Вернуть one-panel: `play-desk__body--mobile` + `stageHidden` на `<960`  
- Bottom Scene Nav (без panel `<select>`)  
- Убрать стек всех панелей  

**Слайс M0.2 — Vitals parity** · код в mobile-kit ветке  
- Rest, CoinPad, HpPad (temp/death), conc-on-damage с sticky/vitals  
- Who → Identity sheet  

**Слайс M0.3 — HotStrip + Conditions** · код в mobile-kit ветке  
- Провод `PlayDeskHotBar` / `HotConditionsDialog` на mobile  

**Слайс M0.4 — Combat scene + abilities entry** · код в mobile-kit ветке  
- Бой = атаки (+ сегмент заклинания)  
- Характеристики → **полноэкранная страница B** из vitals (без tab ЕЩЁ)  
- Владения → sheet из страницы Характеристики  
- Vitals **сворачиваются** (compact strip)  
- Identity field atoms + XP pad/history/level-up  

**Слайс M0.4b — Identity «Черты» (desk §2k 2026-10-14)** · **done** (tip merge)  
- Секция Черты в Identity sheet: список грантов  
- CTA «Мастер выдал черту» → `FeatSetupDialog` (source `manual`)  
- Убрать только manual; ASI-черта остаётся в level-up  

**Слайс M0.5 — Vitals desk-sync (прыжок / щит / КД)** · **done** `cursor/mobile-desk-sync-code-0ed9`  
- Витал Прыж. `long/high` в `MobileVitalsBar`  
- Чип «щит» под КД (heldEquip draw/stow)  
- Tap КД → `AcBreakdown` bottom sheet · tap Иниц. → initiative breakdown  

**Слайс M0.6 — Buffs + LSS rail на phone** · **done** (tip AbilitySkillsColumn + shared dialogs)  
- Ability / Initiative / Spell DC·Attack breakdown sheets  
- Страница Характеристики: pip владения + число → бросок (как desk rail)  
- Не дублировать формульный engine — только mobile placement  

**Критерий P0 (обновлён):** K2, K3, K6, K7 на 390px; Rest/Conditions/атака; нет стека;  
прыжок/щит/разборка КД достижимы ≤2 тапа; rail LSS на странице Характеристики.

### P1 — «Скорость и паритет сцен»

| Слайс | Содержание | Статус |
|-------|------------|--------|
| **Gate** | Merge live prod tip в mobile line | **обязателен сейчас** |
| M1.1 | Spells: Бой/Книга + cast recovery | **done** (код) `cursor/mobile-spells-m11-0ed9` · не на проде |
| M0.4b–M0.6 | Desk delta sync (см. выше) | **очередь сразу после gate** |
| M1.2 | Inventory glance + attunement entry + encumbrance bar | next scenes |
| M1.3 | Social / Features / Companions + варвар Безрассудная/Ярость + свои способности | |
| M1.4 | Roll mode + **история бросков** + reckless→преим. (+ skill strips) | |
| M1.5 | Create: sticky StepRail + footer gates + Сводка sheet | |
| M1.6 | Character list density + ⋯ action sheet; theme persist smoke `<960` | |
| M1.7 | Lobby Hero (код + QR accordion) + Join thumb flow | |

**Критерий P1:** PARITY §A и §B без ❌/💀; create/lobby usable one-handed;  
desk delta 10-14 не «только ≥960».

### P2 — «Полировка»

- Motion pass (`scene-crossfade`, `sheet-rise`, `hp-pulse`) + reduced-motion  
- Companion dock optional  
- AppHeader compact / overflow  
- Cabinet/auth sheet polish (тема уже на tip — проверить phone column)  
- Classic soft-bridge warn  
- Coachmarks first-run (1 раз)  
- FEATURE_LOCK machine markers для mobile shell  
- Метрики baseline

---

## 5. Порядок = путь десктопа

```
Desktop path (live tip 2026-10-14):
  Wave A LOCK → create kit → friend feedback → desk UX ship
  → buffs AC/abil/spell/init + LSS rail  = cursor/buffs-ac-slice-244b

Mobile path (этот документ):
  Mobile UI Kit → MOBILE_REDESIGN_PLAN → ok Игоря
    → M0.1–M0.4 shell/vitals/hot/abilities (код в ветках, не tip)
    → M1.1 spells Бой/Книга (код)
    → ★ merge live tip (buffs…)
    → M0.4b Identity Черты → M0.5 vitals sync → M0.6 buffs/rail
    → M1.2–M1.7 scenes / create / lobby
    → M2 polish → ship mobile на tip + PRODUCT_STATUS
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

## 10. Следующий код-слайс (после sync плана)

**Сейчас (2026-10-14):**

1. **Gate:** merge `origin/cursor/buffs-ac-slice-244b` (live tip) в mobile line.  
2. **M0.4b** Identity «Черты» / мастер выдал черту.  
3. **M0.5** Прыжок + щит + разборка КД в `MobileVitalsBar`.  
4. **M0.6** Buffs sheets + LSS rail на странице Характеристики.  
5. Потом **M1.2** Исследование (как раньше в P1).

Не деплоить mobile, пока tip не в ancestry ветки.

---

## 11. Definition of Done релиза в прод

1. Mobile UI Kit ok + этот план ok (с desk delta 10-14).  
2. P0 (+ M0.5/M0.6) закрыт **на tip**; P1 паритет без 💀/❌.  
3. `./deploy/preflight-prod.sh` + live tip ancestry green.  
4. Явное «залей на сервер» от Игоря.  
5. Проверка живого URL на телефоне / DevTools 390px **и** ≥960 без регрессии desk.  
6. `PRODUCT_STATUS.md` + смена prod tip.  
7. Сообщение для друзей — только если попросишь.

---

## 12. Решения Игоря (2026-10-13)

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Mobile UI Kit как контракт | **Ок**, но сначала **картинки/доски**, как у десктопа; код после визуала |
| 2 | Bottom Scene Nav вместо select «Панель» | **Ок** |
| 3 | Копирайт табов | **Как на десктопе после Wave A LOCK:** Бой · Исследование · Общение · Напарники · Способности. **ЕЩЁ нет** (разнесено: identity/hot/владения/attune) |
| 4 | Старт кода M0.1 | **Только после** ok на картинки кита |
| 5 | Path B abilities | Полноэкранная страница Характеристики + сворачиваемые vitals (ok 2026-10-14) |

### 12b. Синхронизация с desk tip (2026-10-14)

| # | Факт | Решение для mobile |
|---|------|--------------------|
| 1 | Live tip = `buffs-ac-slice-244b` (не create-pipeline / не restore-wave alone) | Все новые mobile-ветки от tip |
| 2 | На проде уже: прыжок, щит у КД, бафы, LSS rail, история бросков, Identity Черты | Добавлены слайсы M0.4b–M0.6 + расширен M1.4 |
| 3 | Mobile M0–M1.1 код не на проде | Не ship отдельно без merge tip |
| 4 | Desk handlers (`modifiers`, `heldEquip`, roll history) священны | Только placement / sheets на `<960` |

**Следующий шаг:** ok на обновлённый план → gate merge tip → M0.4b → M0.5 → M0.6 → M1.2.
