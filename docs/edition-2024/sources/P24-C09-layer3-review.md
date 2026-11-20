# P24-C09 — файл для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/); полные тексты книги не копировать.

## Объём

| Категория | PH24 srd=false | Сид |
|-----------|----------------|-----|
| Виды | 1 (`aasimar`) | `species_ph24.json` |
| Предыстории | 12 | `backgrounds_ph24.json` |
| Подклассы | 36 (по 3 на класс × 12) | `subclasses_ph24.json` |

Голиаф и орк в эталоне `srd=true` — уже в C01, сюда не дублируются.

## Выборка для сверки

1. **Аасимар** — https://next.dnd.su/species/aasimar — размер M/S, сопротивление, исцеляющие руки, откровение.
2. **Стражник / Дворянин** — https://next.dnd.su/backgrounds/897-guard/ · https://next.dnd.su/backgrounds/901-noble/ — ASI, черта, навыки.
3. **Моряк** — https://next.dnd.su/backgrounds/903-sailor/ — на next.dnd.su указаны СИЛ/ЛОВ/**МУД**; сверить с ttg/книгой (возможное расхождение ASI).
4. **Путь дикого сердца** — https://next.dnd.su/class/barbarian — умения 3/6/10/14.
5. **Домен света** — https://next.dnd.su/class/cleric — канал и вспышка.
6. **Клинок душ** — https://next.dnd.su/class/rogue — пси-клинки.

## Неразрешённые ссылки на черты (для C10)

Предыстории ссылаются на черты происхождения, которых ещё нет в `feats_srd.json` (C02):

- `crafter` (Мастеровой) — Ремесленник
- `musician` (Музыкант) — Артист
- `tough` (Крепкий) — Фермер
- `healer` (Лекарь) — Отшельник
- `lucky` (Везучий) — Торговец, Бродяга
- `tavern-brawler` (Дебошир) — Моряк

Уже в C02 (резолвятся): `alert`, `skilled`, `magic-initiate`.

## Источник русских имён

`docs/edition-2024/sources/{species,backgrounds,subclasses}.csv` (волна 0, next.dnd.su).
