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
5. **Level table spend** — `scale_uses` по уровню класса (кости превосходства BM)
6. **Stock / event** — `track: stock`, ручной +/− (частицы души)
7. **Linked spend** — `linked_spend` на другой pool (вопль ← частица)
8. **Recover one** — `recover_one` (Soulknife: бонусным вернуть 1 кость / short)
9. **Initiative grant** — `grant_one_on_initiative_if_empty` (Relentless BM)
10. **Long-rest stock grant** — `grant_stock_on_long_rest_if_empty` (Друг смерти)
11. **Choice / pick** — не сюда; это subclass/class grants

Если не ложится — сначала расширь контракт, потом UI. Не one-off компонент на архетип.

## Поля `resource`

```json
{
  "uses": 0,
  "uses_from": "fixed | proficiency_bonus | twice_proficiency_bonus",
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
  "stock_spend_label_ru": "Сжечь частицу"
}
```

- **spend**: `used` = потрачено; remaining = max − used  
- **stock**: `used` = текущий запас (0…max)  
- Один `pool_id` на сущность; несколько умений могут ссылаться на него (merge флагов)

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

## H4 — порядок пакетов классов

Без деплоя, по одному классу за шаг (PHB + ресурсные архетипы):

1. ~~Плут~~ + ~~Воин~~ (готово)
2. **Варвар** ← сейчас
3. Монах (ки)
4. Жрец (Channel Divinity + домены уже в always-prepared)
5. Паладин (возложение рук = stock/points, CD)
6. Следопыт / Плут XGtE (если нужно) / остальные PHB
7. Чародей, Колдун, Бард, Друид, Волшебник, Изобретатель

## Не в v1

Авто«убили врага», полный симулятор реакций, копирайт PHB, отдельный React на архетип.
Лимит ярости на 20 ур. (unlimited) — пока таблица до 6; безлимит отмечен в тексте.
