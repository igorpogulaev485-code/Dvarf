# План фичи: Бестиарий + Облики (Дикий облик и превращения)

**Статус:** детальный план к исполнению  
**Ветка дизайна:** `cursor/forms-wild-shape-design-ab5e`  
**Base / prod tip:** `cursor/companions-naparniki-b378`  
**Контракты:** [`forms-and-wild-shape.md`](forms-and-wild-shape.md) · [`BESTIARY_AUDIT_2014.md`](BESTIARY_AUDIT_2014.md) · [`feature_resource_contract.md`](feature_resource_contract.md)

---

## 0. Зачем

Друид (и позже другие источники) принимает облик: жмёт умение → выбирает форму из справочника → во вкладке **Напарники** карточка «это ты» с HP формы и способностями.

Без **полного оф. бестиария** пикер пустой — фича не собирается. Поэтому план = **две фазы в одном эпике**: сначала справочник, потом механика обликов.

```
B0──B1──B2──B3──B4──B5──B6     бестиарий
         │
         └─(после B1 можно)─→ F1──F2──F3──F4──F5──F6   облики
```

---

## 1. Зафиксированные решения (LOCK)

| # | Решение |
|---|---------|
| L1 | Облик = `role: self_form` в том же блоке **Напарники**, не отдельная вкладка |
| L2 | Напарник = `role: ally` (Familiar, Summon*, Steel Defender, Wildfire Spirit…) |
| L3 | Бестиарий **первым** (B0→B6); F2 не стартуем без хотя бы MM (B1) |
| L4 | Весь оф. бестиарий 2014; без Homebrew / UA / 3rd-party |
| L5 | Проверка покрытия: **ttg + dnd.su**; при **конфликте статов → ttg** |
| L6 | Известный конфликт: Wildfire Spirit HP **10+5×ур** (ttg) vs 5+5×ур (dnd.su) |
| L7 | Два пула HP: шапка = хозяин; карточка = форма; overflow при 0 HP формы |
| L8 | Alter Self / Disguise / Mask — **не** карточка облика |
| L9 | Polymorph на других — не в первой поставке обликов |
| L10 | `known_forms` на листе = «видел/выучил»; статы по умолчанию из бестиария |

---

## 2. Что уже есть (не переписывать)

| Слой | Готово | Файл / маркер |
|------|--------|---------------|
| Enum `kind=bestiary` | да, 0 строк | alembic `b4c5d6e7f8a9` |
| Напарники UI + модель | да (`ally`-only по факту) | `companions.ts`, `CompanionsPanel.tsx` |
| CatalogCombobox `kind=bestiary` | да (пустой список) | `CompanionsPanel` |
| Пул `feat:wild_shape` | да, 2× short + scale CR | `druid_2014.json` |
| Moon / Elemental / Wildfire linked_spend | каркас умений | тот же пакет |
| Summon*/Familiar → naparnik | да | `spellCompanions.ts` |
| Паттерн сида справочников | да (SPELLS 527) | `fetch_spell_wave.py` + alembic upsert |

---

## 3. Целевой результат для пользователя

### MVP (после B1 + F1–F3)

1. В справочнике есть хотя бы MM (звери видны в combobox).
2. Друид 2+ жмёт «Принять облик…» на умении Дикий облик.
3. Пикер: фильтр по CR / плавание / полёт; поиск по бестиарию; можно добавить в «известные».
4. После выбора: −1 заряд, карточка в Напарниках с бейджем «Это ты», HP/AC/скорость/действия формы.
5. Урон по карточке; при 0 HP — сброс облика + остаток урона хозяину.
6. «Сбросить облик» без урона хозяину.

### Полная поставка эпика

- Весь оф. бестиарий (gap≈0), conflict→ttg залогирован.
- Moon heal ячейкой, Elemental WS, Polymorph/Shapechange self, предметы/фичи.
- Wildfire Spirit и прочие ally подтягивают статы из бестиария (не ручной stub).

---

## 4. Архитектура (кратко)

```
ttg API (+ dnd.su index)
        │ fetch_bestiary_wave.py
        ▼
backend/data/srd/2014/bestiary_*.json
        │ alembic upsert
        ▼
catalog_entries (kind=bestiary, data schema v1)
        │ GET /catalog?kind=bestiary
        ▼
FE CatalogCombobox / FormPickerDialog
        │
        ├─ ally: bestiary_ref → статы напарника (Wildfire, Familiar…)
        └─ self_form: spend wild_shape → CompanionEntry{role:self_form, form, stats}
                │
                ▼
        CompanionsPanel + CombatStickyHeader chip
```

**Инварианты runtime**

- ≤1 активный `self_form` на лист.
- `hitPointCurrent` хозяина не подменяется HP формы.
- Концентрация с `spellId` гасит self_form так же, как summon ally.

---

## 5. Фаза B — Бестиарий

Каждый слайс = **отдельная ветка от актуального tip** + PR + запись в `BESTIARY_AUDIT` + `PRODUCT_STATUS`.  
Деплой на tip — по явному «залей» / после интеграции, не каждый B-слайс обязан стать tip сам.

### B0 — Контракт и пайплайн fetch

**Цель:** можно стабильно качать и нормализовать карточки.

| Что сделать | Детали |
|-------------|--------|
| Schema | `backend/app/schemas/bestiary_catalog.py` (+ FE mirror types) — поля §7.2 контракта |
| Fetch | `backend/scripts/fetch_bestiary_wave.py`: ttg index → detail; фильтр `group=Basic`; map → schema v1 |
| Diff | `backend/scripts/diff_bestiary_sources.py`: индекс dnd.su ↔ ttg (slug/name/CR/book); опционально key-fields |
| Docs | обновить `BESTIARY_AUDIT_2014.md` (команды запуска, allowlist книг) |
| Smoke | скрипт: schema validate на 1–N fixture JSON |

**Файлы (ожидаемо)**

- `backend/app/schemas/bestiary_catalog.py`
- `backend/scripts/fetch_bestiary_wave.py`
- `backend/scripts/diff_bestiary_sources.py`
- `docs/BESTIARY_AUDIT_2014.md`
- опционально `frontend/src/shared/dnd/bestiaryCatalog.ts` (типы + parse)

**Приёмка**

- [ ] `fetch --book MM --limit 5` пишет валидный JSON schema v1
- [ ] Wildfire Spirit из ttg: `hp_average` base **10** (+ текст «+5×ур»)
- [ ] diff печатает counts ttg/dnd.su/only-left/only-right
- [ ] Homebrew/UA/3rd не попадают в выборку Basic

**Не входит:** запись в БД.

---

### B1 — Сид Monster Manual

**Цель:** первый рабочий справочник для WS.

| Что | Детали |
|-----|--------|
| Data | `backend/data/srd/2014/bestiary_mm_v1.json` (все оф. MM с ttg) |
| Migrate | alembic upsert `kind=bestiary`, `rules_edition=2014`, идемпотентно по slug |
| Smoke | count MM; sample beast CR≤1 имеет ac/hp/speed/actions |
| UI | CatalogCombobox на листе показывает зверей (без смены tip — проверяемо на стенде/локально) |

**Приёмка**

- [ ] `COUNT(*) WHERE kind=bestiary AND data->>'source_book'='MM'` ≈ ttg MM (~451)
- [ ] Волк / бурый медведь / крокодил / ястреб — полные статы, RU имена
- [ ] `BESTIARY_AUDIT` строка B1 ✅
- [ ] preflight не ломается (новый файл миграции в дерево tip-линии при интеграции)

**Разблокирует:** F2 (пикер).

---

### B2 — VGtM + MToF

| Data | `bestiary_vgm_mtf_v1.json` |
| Migrate | upsert |
| Приёмка | counts по VGM/MTF; audit; без дублей slug (MPMM-era reprints — политика: один slug, source_book = канон ttg / последний оф.) |

*Политика дублей:* один `slug` на существо; если существо переиздано (VGM→MPMM) — одна строка, `source_book` как на ttg; `external_ref.books[]` опционально накопительный.

---

### B3 — MPMM

| Data | `bestiary_mpmm_v1.json` |
| Приёмка | count ≈ ttg MPMM; audit |

---

### B4 — Остальные «книжные» бестиарии

FTD, BGG, BAM, TCE (в т.ч. **Wildfire Spirit**, Summon*-духи), BMT, … — всё Basic с ttg, не попавшее в B1–B3 и не adventure-only.

| Приёмка | Wildfire Spirit в каталоге с HP-формулой ttg; аудит conflict-строка |

**Разблокирует:** F-side подтягивание статов Wildfire ally из бестиария (часть F6 / отдельный tiny follow-up).

---

### B5 — Adventures + settings

SKT, ToA, WDMM, GGR, ERLW, EGW, … — оставшийся Basic allowlist.

| Приёмка | суммарный count движется к ttg Basic; audit by book |

---

### B6 — Gap-pass + conflict report

| Что | Детали |
|-----|--------|
| Coverage | only-ttg / only-dnd.su / both; добрать оф. only-* по allowlist |
| Stats diff | для both: сравнить hp_average, ac, cr, abilities; **писать ttg**; лог в audit |
| Цель | оф. gap по allowlist → 0; таблица конфликтов заполнена |
| PRODUCT_STATUS | «бестиарий оф. 2014×N» после деплоя на tip |

**Приёмка**

- [ ] Отчёт: 0 missing из согласованного allowlist
- [ ] Wildfire + любые новые conflicts →ttg в audit
- [ ] Smoke: `kind=bestiary` total = N (зафиксировать число в PRODUCT_STATUS)

---

## 6. Фаза F — Облики

Ветки от tip **после** влитого B1 (минимум). F1 можно параллелить с B2+ на ветке, где уже есть B1.

### F1 — Модель данных листа

**Цель:** лист умеет хранить облик и библиотеку известных форм.

| Изменения | |
|-----------|--|
| `CompanionRole` | `'ally' \| 'self_form'` (default `ally` для legacy) |
| `CompanionKind` | `+ 'transformed_self'` |
| `ActiveFormMeta` | form_source, form_source_ref, host_hp_*, duration, entered_at |
| `KnownForm[]` | на `sheet.play` (или рядом с companions) |
| Helpers | `getActiveSelfForm`, `assertSingleActiveSelfForm`, read/write backward-compat |
| Smoke | `smoke-companions.ts` расширить: role default, round-trip form |

**Приёмка**

- [ ] Старые листы без `role` читаются как `ally`
- [ ] Нельзя сериализовать два active self_form (helper нормализует)
- [ ] UI пока без кнопок — только модель + smoke

---

### F2 — Пикер + активация Дикого облика

**Цель:** счастливый путь друида.

| UI | `WildShapePickerDialog` (или `FormPickerDialog`): поиск, фильтры CR/swim/fly, известные, превью статов |
| Engine | `wildShapeLimits(druidLevel, circle)` из scale + Moon Circle Forms |
| Action | кнопка на ряду умения `wild_shape`: «Принять облик…» |
| On confirm | spend `feat:wild_shape` → создать/заменить self_form из bestiary row → optional add to known_forms |
| Header | chip «В облике: …» в `CombatStickyHeader` |

**Зависимости:** B1 в каталоге; F1 модель.

**Приёмка**

- [ ] Друид L2: только CR≤1/4, без swim/fly
- [ ] L4: +swim CR≤1/2; L8: +fly CR≤1
- [ ] Moon L2: CR≤1; L6+: floor(level/3)
- [ ] Нет заряда → кнопка disabled / toast
- [ ] После confirm: пул −1, карточка в Напарниках, chip в шапке
- [ ] Повторный WS заменяет форму (полный HP новой формы)

---

### F3 — Бой в облике (урон / dismiss / overflow)

| Карточка | бейдж «Это ты · Дикий облик»; без death saves; «Сбросить облик» |
| HP | `applyHpChange` на форме; overflow → `hitPointCurrent` хозяина |
| Rest | короткий/длинный: сброс активной формы (или confirm); заряды WS как сейчас |
| Primary | на время формы self_form = primary; restore previous primary ally on dismiss |

**Приёмка**

- [ ] Форма 10 HP, урон 14 → форма dismiss, хозяин −4
- [ ] Добровольный сброс → хозяин HP без изменений
- [ ] Шапка хозяина не показывает HP формы как «текущие хиты персонажа»

---

### F4 — Круг Луны

| Combat WS | подпись «бонусным» в пикере/кнопке |
| Heal | на карточке «Исцелить ячейкой» → spend slot → +1к8×slotLevel к HP формы (≤ max) |
| Elemental WS | в пикере 4 элементаля (из бестиария); linked_spend оба заряда `wild_shape` |

**Зависимости:** B4 желателен (элементали MM уже в B1 — достаточно MM air/earth/fire/water elemental).

**Приёмка**

- [ ] Moon L2 входит бонусным (UI copy)
- [ ] Heal ячейкой 2 → +2к8 к форме, слот spent
- [ ] Elemental: −2 WS, карточка элементаля

---

### F5 — Заклинания-превращения (self)

| Spells | Polymorph, Shapechange, True Polymorph (self only) |
| Flow | cast → picker (шире фильтр, не WS limits) → self_form + concentration link |
| End | conc end / dismiss → как summon |

**Приёмка**

- [ ] Polymorph self создаёт self_form; снятие концентрации убирает
- [ ] Не создаёт карточку при касте на «другую цель» (v1: UI только «на себя» или skip)

---

### F6 — Предметы, фичи, подтягивание ally-статов

| Sources | item / feature (Wizard Shapechanger, …) → self_form |
| Ally stats | Summon Wildfire Spirit / Find Familiar: если есть bestiary slug — заполнить stats из каталога (HP 10+5×level для wildfire) |
| Templates | `companionTemplates` может читать bestiary вместо хардкода, где возможно |

**Приёмка**

- [ ] Wildfire: карточка ally с HP = 10+5×druidLevel (ttg)
- [ ] Shapechanger feature → self_form CR≤1 beast без ячейки (1× short)

---

## 7. Тест-план (сквозной)

| Уровень | Что |
|---------|-----|
| Unit/smoke FE | `smoke-companions.ts`: role, form, overflow helper, wildShapeLimits |
| Unit/smoke BE | schema validate; upsert idempotent; count by book |
| Diff | `diff_bestiary_sources.py` в CI или ручной чеклист агента на B6 |
| Manual | друид 2 / 4 / 8 / Moon 2 / Moon 10 elemental; урон overflow; rest |
| Prod verify | после деплоя: `/catalog?kind=bestiary` count; UI пикер на тестовом друиде |

---

## 8. Порядок PR и tip

| Порядок | Слайс | Tip? |
|---------|-------|------|
| 1 | F0 дизайн (этот эпик docs) | нет |
| 2 | B0 fetch+schema | нет (или да, если нужен на сервере скрипт — не обязателен) |
| 3 | B1 MM | **да, желательно** — разблокирует прод-пикер |
| 4 | F1 модель | можно до/сразу после B1 |
| 5 | F2+F3 | да после B1+F1 — **первый user-visible WS** |
| 6 | B2–B5 | можно параллельно с F4–F6 |
| 7 | F4 Moon | да |
| 8 | B6 gap | да — «полный бестиарий» |
| 9 | F5–F6 | да |

Правило tip: каждый деплой только с ветки, содержащей актуальный tip + свой слайс (`AGENTS.md`).

---

## 9. Оценка объёма (техническая, не календарь)

| Слайс | Характер работ | Риск |
|-------|----------------|------|
| B0 | скрипты + schema | средний (парсинг HTML dnd.su / rate-limit ttg) |
| B1 | большой JSON + migrate | средний (объём MM ~450) |
| B2–B5 | повтор паттерна | низкий/средний (объём, дубли slug) |
| B6 | diff+добор | средний (расхождение 2380 vs 2875) |
| F1 | точечная модель | низкий |
| F2 | новый диалог + spend wiring | средний (UX + limits) |
| F3 | HP overflow | средний (легко ошибиться в шапке) |
| F4 | slot heal + elemental | низкий/средний |
| F5 | cast integration | средний (conc) |
| F6 | расползание источников | средний |

---

## 10. Риски и митигация

| Риск | Митигация |
|------|-----------|
| ttg/dnd.su rate-limit / вёрстка | кэш сырых JSON в `backend/data/…/raw/`; retry; не парсить лишний HTML если есть API |
| Дубли VGM/MPMM | один slug; source с ttg; audit |
| Конфликты статов системные | B6 field-diff; всегда ttg; таблица в audit |
| Пустой пикер до B1 | не мержить F2 на tip без B1 |
| Путаница HP в шапке | chip «В облике»; тесты overflow; copy в UI |
| Wildfire сейчас без статов | B4 + F6; до этого template может хардкодить 10+5×lvl по LOCK |

---

## 11. Definition of Done эпика

- [ ] `kind=bestiary` оф. 2014 заполнен; gap allowlist ≈ 0; PRODUCT_STATUS число
- [ ] Конфликт Wildfire (и найденные) → ttg в data + audit
- [ ] Друид: принять / сменить / сбросить облик; урон; overflow
- [ ] Moon: heal ячейкой + elemental
- [ ] Polymorph self через тот же пайплайн
- [ ] Документы audit/plan/status обновлены; tip отражает залитый контур

---

## 12. Следующий конкретный шаг

**Начать B0** на ветке `cursor/bestiary-schema-fetch-ab5e` от prod tip:

1. `bestiary_catalog` schema v1  
2. `fetch_bestiary_wave.py` (ttg Basic → JSON)  
3. `diff_bestiary_sources.py` (index gap)  
4. fixture smoke + строка в audit  

После merge B0 → сразу B1 (MM seed).
