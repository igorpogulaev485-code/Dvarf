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
  → UI умений (траты) + PlayPanel (отдых по recharge)
```

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
10. **Друид** ← следующий / Волшебник, Изобретатель

## Не в v1

Авто«убили врага», полный симулятор реакций, копирайт PHB, отдельный React на архетип.
Лимит ярости на 20 ур. (unlimited) — пока таблица до 6; безлимит отмечен в тексте.
