# План: системная починка фидбека создания (Илья / Telegram)

**Статус:** план · ждём ok → код срезами  
**Контур:** план → ok → срезы A→E → скрины/selfcheck → ok → прод  
**База:** live tip `cursor/vpn-https-stable-fab2` (или актуальный `deploy/prod-tip`)  
**Источник:** 4 репорта (аасимар, колдун Tome, прислужник, мультикласс L20 зайцегон)  
**Аудит:** сверка с tip 2026-10-21 — 7 багов / 1 UX / 1 вопрос правил / 1 «как задумано»

---

## Зачем

Репорты выглядят как «точечные баги персонажей», но почти все — симптомы **дыр в контрактах** (раса / выбор умения / снаряжение→атаки / create→inventory / валидация диалогов).  
Точечный патч «убери fly у аасимара» или «добавь +ПБ зайцегону» оставит тех же дефектов у фэйри / gem dragonborn / других pact / других предысторий.

Слоган: **чинить систему, закрывать репорт как приёмку.**

---

## Карта: репорт → системная дыра (не точечный фикс)

| # | Репорт | Вердикт | Системная дыра | Анти-паттерн (не делать) |
|---|--------|---------|----------------|--------------------------|
| 1 | Постоянный полёт аасимара-защитника | баг | **R1** движение: permanent vs activated | `if (aasimar) fly=null` |
| 2 | Два кинжала в Атаках | баг | **E1** оружие→атаки: identity + merge | `if (name==='Кинжал') dedupe` |
| 3 | ASI MotM vs Volo Protector | правила | **P1** политика каталога рас | молча «починить» на Volo без решения |
| 4 | Черты: только тёмное зрение | баг | **R2** trait cards + mech grants | только текст для аасимара |
| 5 | «Нет книги» до конца создания | баг | **C1** create pipeline = picks без inventory | hardcode `hasBook=true` на create |
| 6 | Договор Книги: нет 3 заговоров | баг | **F1** choice side-effects (pact / boon) | только UI «3 поля» у warlock |
| 7 | Прислужник: Apply не пускает | UX/partial | **U1** opaque setup validation | спец-кейс acolyte |
| 8 | Hare-Trigger: инициатива без ПБ | баг | **R3** racial combat modifiers | `if (harengon) init += PB` |
| 9 | Мультикласс wizard: нет книги / 0 prep | баг | **C1** + **C2** multiclass gear / book | выдать книгу только Wiz5+War3 |
| 10 | КД 9 без доспеха | ok | — | «чинить» КД |

---

## Пять систем (срезы A–E)

```
R (раса)     R1 movement modes · R2 traits/resist/resources · R3 combat mods
     │
F (choices)  F1 feature choice → grants (pact boons first; шаблон общий)
     │
E (equip)    E1 starting weapons → Attacks merge by identity
     │
C (create)   C1 draft inventory + spellbook bind · C2 multiclass caster kit
     │
U (UX)       U1 setup dialog: что блокирует + disable Apply
```

Зависимости:

- **U1** независим → можно первым (быстрый unblock create).
- **R1–R3** один контракт `raceGrants` / apply — один срез **A**.
- **C1** нужен и репорту 5, и репорту 9; **C2** опирается на C1.
- **F1** не зависит от R/C, но гримуар/cantrips стыкуется с C после.
- **E1** независим от R/F; стык с C только если create сразу пишет attacks.

---

## Non-goals

- Не чинить «одного персонажа Ильи» в сохранённом JSON на сервере (только engine + create + apply).
- Не вводить вторую параллельную модель рас «для MotM» без решения по **P1**.
- Не раздувать UI предыстории обязательными идеалами/слабостями (сейчас optional — ок).
- Не трогать КД 9 / unarmored baseline.
- Не one-off компоненты «AasimarFlightButton» / «HarengonInitiative» вне контракта.

---

## P1 — решение по ASI аасимара (до кода R)

Сейчас в `mpmm_race_catalog_spec` у `aasimar_protector`: `source: vgtm` в тексте, ASI = `tasha_flexible`, fixed bonuses `{}`.  
Volo RAW: +2 Cha / +1 Wis. MotM: гибкий ASI, другая Сияющая душа.

**Нужен ok Игоря (один вариант):**

| Вариант | Поведение | UI |
|---------|-----------|-----|
| **A (рекомендуем)** | Оставить MotM-ASI на всех aasimar_*; текст/бейдж «ASI: MotM» | в попапе расы одна строка источника правил |
| **B** | Две записи: Volo Protector (fixed) и MotM Aasimar (flexible, без Volo-подрас как сейчас) | два корня/режима в каталоге |
| **C** | Переключить protector на Volo fixed Cha+2/Wis+1 | ломает уже созданных с гибким ASI |

До ok по P1 в срезе A **не меняем** ASI; только movement / traits / combat.

---

## Срез U — валидация setup-диалогов (репорт 7)

**Система:** любой `*SetupDialog` с `canConfirm` (фон: `BackgroundSetupDialog`; раса уже чинилась в human-apply).

### Делать

1. Единый хелпер `setupBlockingReasons(def, picks): string[]` — человекочитаемые пункты («выбери 2 языка», «пакет снаряжения или „Без снаряжения“», «молитвенник или барабан», «черты характера: 0 или 2»).
2. Показать список под кнопкой / вместо одной фразы «обязательные развилки».
3. `Apply` / `Применить`: `disabled={!canConfirm}`; primary визуально disabled.
4. Selfcheck: acolyte — languages=2 + skip equipment → ok; languages=2 + pack без OR → blocked с причиной OR; 1 personality trait → blocked.

### Приёмка

Прислужник: после 2 языков + «Без снаряжения» (или pack + OR) → Apply закрывает модалку, шаг Класс разблокируется.  
Другая предыстория с OR (не acolyte) — тот же UX.

### Файлы

`BackgroundSetupDialog.tsx`, `backgroundGrants.ts` (+ selfcheck), при необходимости общий `setupValidation.ts`.

---

## Срез A — контракт расовых эффектов (репорты 1, 4, 8)

**Система:** каталог → `RaceGrantDef` → `applyRaceGrant` / `raceEffects` → лист (speed / fly / traits panel / resources / initiative).

Сейчас механика узкая: ASI, walk, permanent `movement.*`, darkvision, skills/tools/langs, natural armor/weapons, racial spells.  
Всё остальное — `traits_text` prose → blob «Черты расы».

### A0 — расширить контракт (сначала схема, потом контент)

Добавить в `data` расы / `RaceGrantDef` (имена рабочие):

| Поле | Смысл | Пример |
|------|-------|--------|
| `movement.fly` и т.п. | **только permanent** скорость | ааракокра, фэйри (с оговоркой доспеха — отдельным флагом позже) |
| `activated_movement[]` | временный режим: fly/climb/swim + duration + recharge + from_level | Сияющая душа: fly=walk, 1 мин, long_rest, lvl 3 |
| `damage_resistances[]` / immunities | лист + панель | celestial resistance |
| `trait_cards[]` | карточки в панели умений | Healing Hands, Radiant Soul, Hare-Trigger… |
| `resources[]` | тот же дух, что `feature_resource_contract` (pb / level / long_rest) | Healing Hands: heal = character level, 1/LR |
| `combat_bonuses` | `{ initiative: "proficiency_bonus" \| … }` | Hare-Trigger |

Правило: **`movement.*` никогда не используется для activated способностей.**  
Если в каталоге сейчас `movement.fly` у activated (protector) — миграция данных в `activated_movement`, не «обнулить у одного slug».

### A1 — engine

1. `raceGrants.ts`: parse новых полей; revoke/apply идемпотентно.
2. `raceEffects.ts`: permanent fly → `flySpeed`; activated → **не** писать в `flySpeed`; ресурс + текст/карточка + опционально buff-хук позже.
3. Initiative: `sumRaceInitiativeBonus(grant, PB)` рядом с feat/feature bonuses в `MinimalSheetEditor` / `classicDerivedCombat` (один путь).
4. Панель: `trait_cards`优先нее blob; darkvision остаётся как сейчас.
5. Selfcheck: protector — `flySpeed==null`, есть activated + resource; harengon — init = dexMod+PB; раса с permanent fly — flySpeed выставлен.

### A2 — контент-волна (закрывает репорты)

Минимум для приёмки фидбека (не «все расы мира»):

| Раса/подраса | Данные |
|--------------|--------|
| `aasimar` + 3 подрасы | trait_cards; resistances; Healing Hands resource; Light cantrip уже есть проверить |
| `aasimar_protector` | **убрать** `movement.fly`; `activated_movement` Radiant Soul |
| `aasimar_scourge` / `fallen` | activated (не fly) + cards |
| `harengon` | `combat_bonuses.initiative = proficiency_bonus`; cards для четырёх черт; perception skill уже есть |

Дальше (бэклог того же контракта, не в этом PR-срезе): gem dragonborn flight, owlfolk, temporary flight cleric light domain и т.д. — **тем же форматом**, без новых веток кода.

### Приёмка

- Селестия: скорость без «полёт 30»; Сияющая душа видна как черта/ресурс, не как постоянный fly.
- Лапа L20: инициатива Dex + PB.
- Панель аасимара: отдельные черты, не один blob (+ darkvision).

### Файлы

`backend/data/races/mpmm_race_catalog_spec.json` (+ alembic upsert если нужен), `raceGrants.ts`, `raceEffects.ts`, `raceTraitCards.ts`, `featureCombatBonuses.ts` или race-parallel, `MinimalSheetEditor.tsx`, `ClassFeaturesPanel.tsx`, selfchecks.

---

## Срез C — create inventory + spellbook (репорты 5, 9)

**Система:** create pipeline должен к моменту магии иметь **тот же контракт инвентаря**, что лист (хотя бы draft), иначе любой gated-by-item флоу (книга, focus, оружие) врёт.

Связано с [`wizard-spellbook-plan.md`](wizard-spellbook-plan.md) срез 2 — engine bind уже есть; дыра = **когда** появляется item.

### C1 — draft inventory в пайплайне

1. При выборе/подтверждении классового и background gear: материализовать items в `sheetDraft.inventory` (те же helpers, что `applyClassGrantToDraft` / background apply), не только store picks.
2. Сразу `syncWizardSpellbookWithInventory` на draft.
3. `CreateCharacterPage` / GuidedWizard: `hasBook` считает draft inventory; L1 unblock остаётся safety net, не костыль вместо книги.
4. Revoke/смена класса или «Без снаряжения»: снять выданные create-items по маркеру источника (`granted_by: create_class|create_bg`), не чужой лут.

### C2 — мультикласс / вторичный wizard

1. Правило: если среди классов есть **wizard** и нет usable spellbook в inventory → create/leveling предлагает «добавить книгу заклинаний» (бесплатно как tool of the trade при первом уровне волшебника в билде *или* явная кнопка «Пустая книга»), а не silent block.
2. Multiclass package wizard пустой по RAW — ок; продукт даёт **путь получить книгу**, не молчаливый 0/29.
3. Free fills / prepare gates используют тот же `wizardHasUsableSpellbook`.

### Приёмка

- Создание волшебника: на шаге заклинаний chip «Книга: есть», free вносятся.
- Билд Wiz5+… без стартового wizard-gear: после C2 можно внести/готовить; domain/oath не маскируют пустой prepare-cap.

### Файлы

`pipelineApply.ts`, `CreateCharacterPage.tsx`, `createPipelineSheet.ts`, `wizardSpellbookInventory.ts`, `classGrants.ts` / classEffects, GuidedWizard / Grimoire draft path, selfchecks.

---

## Срез F — feature choice → grants (репорт 6)

**Система:** `choice.options_from` сейчас часто только **список лейблов** (`warlock_pact_boons`). Выбор пишется в `feature_picks`, побочных грантов нет.

Тот же класс дыр: Pact of the Chain (familiar), Blade (weapon bond UX) — не обязаны в этом срезе, но контракт общий.

### F0 — контракт

```text
choice option id → GrantBundle {
  known_cantrips?: { count, lists: 'any_class'|'warlock'|…, ability? }
  spells?: …
  resources?: …
  notes_ru?: …
}
```

Хранение: либо в JSON features рядом с choice, либо таблица `warlock_pact_boon_grants` рядом с `WARLOCK_PACT_BOONS`.

### F1 — Pact of the Tome (приёмка репорта)

1. При выборе `tome`: +3 known cantrips, список **any class**, не едят warlock cantrip budget (отдельный bucket `pact_tome` / source tag).
2. Create leveling + sheet: явный пикер «Заговоры договора (N/3)».
3. Смена pact / revoke: снять cantrips с этим source.
4. Book of Ancient Secrets (invocation) остаётся про ритуалы — не подменять Tome cantrips.

### Приёмка

Дракша Векса L3 Fiend + Tome: после выбора договора виден шаг/диалог на 3 заговора; на листе 2 class cantrips + 3 tome (итого 5), не «только 2».

### Файлы

`warlock_2014.json` / `warlockInvocations.ts`, `classFeatures.ts`, caster progression / spell known apply, create `LevelingStep`, sheet warlock dialogs, selfcheck.

---

## Срез E — оружие → атаки (репорт 2)

**Система:** starting gear может дать одно и то же оружие из нескольких строк (pick + fixed package, class + background).  
`buildStartingWeaponAttacks` сейчас: одна строка → одна карточка; qty>1 в **одной** строке уже ок.

### Делать

1. Нормализация identity оружия (`catalog_slug` / каноническое имя).
2. Merge при сборке атак: один identity → одна карточка; qty суммируется; attack bonus пересчитывается один раз.
3. Не мержить разные оружия с похожими именами без slug.
4. Selfcheck: warlock/sorcerer/rogue пакеты с кинжалом + pick «Кинжал» → 1 карточка; background dagger + class dagger → 1.

### Приёмка

Селестия (или тестовый wizard с кинжалом×N): в Атаках один кинжал с верным бонусом.

### Файлы

`classEffects.ts` (`buildStartingWeaponAttacks`), background→attacks path если есть, selfcheck.

---

## Порядок внедрения (по «порядку репортов», но срезами)

| Шаг | Срез | Закрывает репорты | Риск |
|-----|------|-------------------|------|
| 1 | **U** setup validation | 7 | низкий |
| 2 | **A** race contract + aasimar/harengon data | 1, 4, 8 (+база для других рас) | средний (каталог + apply) |
| 3 | **C** draft inventory + multiclass book | 5, 9 | средний (create) |
| 4 | **F** pact choice grants | 6 | средний (spells) |
| 5 | **E** attack merge | 2 | низкий |
| — | **P1** решение | 3 | продукт |
| — | не трогаем | 10 | — |

Параллелить можно: **U ∥ E**; **F** после или параллельно **C** (если cantrip UI не на create-inventory).  
**A** лучше до «полировки листа», чтобы не учить игроков постоянному fly.

Каждый срез = отдельная ветка от **live tip** + selfcheck + короткое демо; деплой только после ok и merge tip.

---

## Definition of Done (весь план)

- [ ] Все 7 багов из таблицы закрыты **через** срезы U/A/C/F/E, не one-off.
- [ ] Selfchecks на контракты (race activated movement, initiative grant, tome cantrips, attack merge, background blocking reasons, create hasBook).
- [ ] Повтор сценариев Ильи на create (не только ручной лист).
- [ ] `PRODUCT_STATUS.md` после реального деплоя.
- [ ] P1 зафиксирован в статусе / бейдже расы.

---

## Открытые вопросы к Игорю

1. **P1 ASI аасимара:** A (MotM + бейдж) / B (две линии) / C (Volo fixed)?  
2. Катить **U первым** на прод отдельно (быстрый unblock прислужника) или пакетом с A?  
3. Мультикласс без книги (**C2**): авто-выдача пустой книги при наличии уровней wizard, или только явная кнопка в UI?

---

## Связанные доки

- [`feature_resource_contract.md`](feature_resource_contract.md) — образец «сначала контракт, потом UI»  
- [`wizard-spellbook-plan.md`](wizard-spellbook-plan.md) — bind книги  
- [`create-pipeline.md`](create-pipeline.md) — шаги создания  
- [`RACES_AUDIT_2014.md`](RACES_AUDIT_2014.md) — каталог рас / MotM
