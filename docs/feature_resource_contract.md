# Контракт умений и ресурсов листа (2014)

Системный слой для классовых/архетипных умений на цифровом листе.
Контент — в JSON-пакетах (`backend/data/classes/features/*.json` + копия во frontend).
Движок — `classFeatures.ts` + `featureResources.ts`. UI не знает правил архетипа.

## Три оси

| Ось | Вопрос | Куда |
|-----|--------|------|
| **Unlock** | Когда видно? | `level` + subclass slug |
| **Scale** | Какое значение сейчас? | `scale.by_level` → `scaleValue` |
| **Pool** | Сколько зарядов и как тратить? | `resource` → `feat:*` в `sheet.resources` |

## Опциональные умения (Tasha / TCoE)

Поля на `ClassFeatureDef`:

| Поле | Смысл |
|------|--------|
| `optional: true` | Умение из optional class features; бейдж «Tasha · опционально» в UI |
| `source_book: "tcoe"` | Источник контента |
| `replaces` | Id PHB-умения, которое это row заменяет (оба остаются в unlock — стол выбирает) |

**Политика v1:** optional = **не opt-in pick**. Как `wild_companion` / `cd_harness_divine_power`: при `level <= classLevel` умение видно всем. Стол может игнорировать.

**Миграция существующих персонажей:** список умений **не хранится** в sheet — он считается `unlockFeaturesForClasses` из пакетов. Достаточно обновить JSON (backend + frontend копия). При следующем открытии листа:
1. новые rows появляются в панели умений;
2. `syncFeatureResources` дописывает новые `feat:*` пулы (Favored Foe, Nature's Veil, …).

Alembic по персонажам **не нужен**. Эпоха контента: `OPTIONAL_CLASS_FEATURES_EPOCH` в `classFeatures.ts` (для самопроверок / будущих stamp'ов).

Инжект контента: `backend/scripts/inject_tcoe_optional_features.py` (идемпотентно).

## Умение предыстории (PHB feature)

| Куда | Что |
|------|-----|
| Каталог | `feature_name_ru` / `feature_text_ru` в `phb2014_background_catalog_spec.json` |
| Ledger | `sheet.background_grant.featureNameRu` / `featureTextRu` |
| Текст | marked-блок в `text_blocks.traits` (`<!-- dvarf-background-feature -->`) |
| UI способностей | карточка «предыстория» в `ClassFeaturesPanel` |
| Classic | бокс «Умения и особенности» читает `traits` (+ merge `features`) |

Миграция старых листов: при открытии `ensureBackgroundFeatureOnDraft` / soft-stamp из каталога по slug/имени; alembic `z2a3b4c5d6e7` обновляет тексты в `catalog_entries`.

## Паттерны (чеклист нового умения)

1. **Passive scale** — только таблица (Скрытая атака, Martial Arts)
2. **Spend / rest** — N×, сброс short/long (Second Wind, Action Surge, Ghost Walk)
3. **PB-gated spend** — `uses_from: proficiency_bonus` (Могильные вопли)
4. **2×PB spend** — `uses_from: twice_proficiency_bonus` (пси-кости Soulknife)
4b. **Ability-mod spend** — `uses_from: ability_modifier` + `ability: wis` (Warding Flare, War Priest, Cleansing Touch)
4c. **1+ability-mod spend** — `uses_from: one_plus_ability_modifier` + `ability: cha` (Divine Sense)
5. **Level table spend** — `scale_uses` по уровню класса (кости превосходства BM, Channel Divinity, Lay on Hands 5×ур.)
6. **Stock / event** — `track: stock`, ручной +/− (частицы души)
7. **Linked spend** — `linked_spend` на другой pool (вопль ← частица)
8. **Recover one** — `recover_one` (Soulknife: бонусным вернуть 1 кость / short)
9. **Initiative grant** — `grant_one_on_initiative_if_empty` (Relentless BM)
10. **Long-rest stock grant** — `grant_stock_on_long_rest_if_empty` (Друг смерти)
11. **Choice / pick** — subclass/class grants **или** `choice` на умении → `sheet.feature_picks` (Fighting Style)
12. **Shared pool** — несколько умений с одним `pool_id` (Turn Undead + доменные Channel Divinity)
13. **Success lock** — `success_lock` + `failure_spend_label_ru` (Divine Intervention: провал → long rest; успех → manual 7 дней)
14. **Slot spend** — `slot_spend` тратит ячейку заклинаний с ряда умения (Divine Smite)
15. **Save bonus self** — `save_bonus_self` добавляет мод. характеристики к спасам на листе (Aura of Protection)
16. **Save proficiency** — `save_proficiency: "all" | ["str", …]` выставляет владение спасбросками (Diamond Soul)
17. **Martial Arts die** — scale «Кость БИ» подменяет урон monk weapon / безоружного на столе (не one-off в UI атаки)

Если не ложится — сначала расширь контракт, потом UI. Не one-off компонент на архетип.

## Поля `resource`

```json
{
  "uses": 0,
  "uses_from": "fixed | proficiency_bonus | twice_proficiency_bonus | ability_modifier | one_plus_ability_modifier",
  "ability": "wis",
  "scale_uses": { "3": 4, "7": 5, "15": 6 },
  "recharge": "short_rest | long_rest | dawn | manual",
  "pool_id": "superiority_dice",
  "pool_name_ru": "Кости превосходства",
  "track": "spend | stock",
  "linked_spend": { "pool_id": "soul_trinkets", "label_ru": "сжечь частицу души" },
  "recover_one": {
    "label_ru": "Вернуть 1 кость (бонусное)",
    "recharge": "short_rest"
  },
  "grant_one_on_initiative_if_empty": true,
  "grant_stock_on_long_rest_if_empty": true,
  "stock_gain_label_ru": "+ частица (смерть рядом)",
  "stock_spend_label_ru": "Сжечь частицу",
  "success_lock": { "label_ru": "Успех → блок 7 дней", "recharge": "manual" },
  "failure_spend_label_ru": "Провал (сброс на отдыхе)"
}
```

- **spend**: `used` = потрачено; remaining = max − used  
- **stock**: `used` = текущий запас (0…max)  
- Один `pool_id` на сущность; несколько умений могут ссылаться на него (merge флагов)
- **success_lock**: успех ставит `reset=manual` и `used=max`; sync сохраняет manual, пока used > 0; «Снять блок» возвращает intended recharge

## Пайплайн

```
классы + архетип + ур. персонажа
  → unlockFeaturesForClasses
  → desiredResourcesFromFeatures (max / reset / track)
  → syncFeatureResources → play.resources (feat:*)
  → UI умений (траты) + PlayPanel / hot-bar (отдых по recharge)
```

**UI трека:** если `max > 10` (`shouldUseCompactResourceTrack`), пипы не рисуем — stepper `±` и число `осталось/max` (`SlotPips`, `PlayDeskHotBar`). Мелкие пулы (Divine Sense, Rage, слоты) остаются пипами.

Правила sync: пересчёт max при level-up; used/stock clamp; revoke при смене архетипа; ручные ресурсы не трогаем.

## Порядок добавления архетипа

1. Выписать умения по уровням  
2. Пометить паттерны 1–11  
3. Назначить `pool_id`  
4. Прописать links / recover / grants  
5. Добавить в пакет класса → sync подхватит  
6. Смоук: max на L3/L5/L9/L17, отдых, linked, initiative  

## Референсы в репо

| Архетип | Паттерны |
|---------|----------|
| Rogue PHB | 1, 2 |
| Phantom | 1, 3, 6, 7, 10 |
| Soulknife | 1, 4, 8 |
| Battle Master | 1, 5, 9 (+ Fighter 2) |
| Barbarian / Berserker / Totem | 1, 5 (+ Rage table) |
| Monk / Open Hand / Shadow / Elements | 1, 5, 9 (+ Ki = level, Perfect Self +4) |
| Cleric / **14** оф. доменов | 2, 4b, 5, 12, 13 (CD shared; Wis-mod; DI success lock; PHB+DMG+SCAG+XGtE+TCoE) |
| Paladin / **9** оф. клятв | 2, 4b, 4c, 5, 11, 12, 14, 15 (LoH; Sense; CD; Fighting Style; Smite slots; Aura saves) |
| Ranger / **8** оф. архетипов | 2, 3, 4b, 11, 14 (Favored Enemy/Terrain; Fighting Style; Primeval Awareness slot) |
| Sorcerer / **8** оф. происхождений | 2, 5, 11 + Flexible Casting UI + Metamagic SP spend (Twinned = ур. ячейки) |
| Warlock / **9** оф. покровителей | 2, 5, 11 (Pact Magic already in caster; Invocations multi-pick; Pact Boon; Arcanum 6–9) |
| Bard / **8** оф. коллегий | 2, 4b, 5, 8, 11 (BI Cha-mod; Font upgrades reset long→short; Superior Inspiration; Swords style) |
| Druid / **7** оф. кругов | 2, 3, 4b, 5, 11 (Wild Shape 2× short; Land type pick; PB/Wis pools on circles) |

**Облики (Wild Shape / Polymorph / …):** пул умения только тратит заряд; runtime-карточка формы — см. [`forms-and-wild-shape.md`](forms-and-wild-shape.md) (`role: self_form` в Напарниках).
| Wizard / **11** оф. традиций | 2, 5, 6, 11 (Arcane Recovery; Portent stock 2→3; Bladesong PB; Signature Spells) |
| Artificer / **4** оф. специалиста | 2, 4b, 5, 11 (Infusions multi-pick 4→12; Flash of Genius Int; Armorer model) |

## H4 — порядок пакетов классов

Без деплоя, по одному классу за шаг (PHB + ресурсные архетипы):

1. ~~Плут~~ + ~~Воин~~ (готово)
2. ~~Варвар~~ (готово)
3. ~~Монах~~ (готово)
4. ~~Жрец~~ (умения + 14 доменов + always-prepared/grants + CD shared + DI lock)
5. ~~Паладин~~ (класс: LoH/CD/Sense + Fighting Style + Smite + Aura saves; клятвы в пакете, полировка архетипов — общим проходом)
6. ~~Следопыт~~ (класс + каркас 8 архетипов; полировка архетипов — общим проходом)
7. ~~Чародей~~ (очки + метамагия + каркас 8 происхождений)
8. ~~Колдун~~ (инвокации + pact boon + арканумы; 9 покровителей каркас)
9. ~~Бард~~ (BI + Font short + Superior Inspiration; 8 коллегий каркас)
10. ~~Друид~~ (Wild Shape + Land pick; 7 кругов каркас)
11. ~~Волшебник~~ (Arcane Recovery + Portent/Bladesong; 11 традиций каркас)
12. ~~Изобретатель~~ (инфузии + Flash of Genius; 4 специалиста каркас)

## H4b — полировка архетипов (общий проход)

**Цель:** каждый официальный подкласс в пакете класса = unlock + scale + pool/choice где правило даёт лимит/выбор.

**Чеклист на архетип**
1. Все уровни фич PHB/источника (не только L3 stub)
2. Limited-use → `resource` + стабильный `pool_id`
3. Числовой прогресс → `scale` / `scale_uses`
4. Выбор (тотем, стиль, земля, модель…) → `choice` + labels в UI
5. Shared pool / initiative grant / recover_one — если правило требует
6. Slug + RU-алиас в `classFeatures.ts`
7. Smoke: unlock @ cap level; pools max; choices resolve

**Покрытие каталога:** 118/118 оф. подклассов в feature-паках (после волны покрытия fighter/barb/monk/rogue/wizard).

**Глубина:** дальше — донасыщение thin scaffolds (короткие summary без пулов) по классам, начиная с martial/полкастеров с явными лимитами.

Без деплоя.

## Не в v1

Авто«убили врага», полный симулятор реакций, копирайт PHB, отдельный React на архетип.
Лимит ярости на 20 ур. (unlimited) — пока таблица до 6; безлимит отмечен в тексте.
