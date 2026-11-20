# P24-C18 — выборка для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/); полные тексты книг не копировать.

## Объём

| Книга | Категория | Эталон | Сид |
|-------|-----------|-------:|----:|
| FRAiF | существа | 40 | `creatures_fraif.json` |
| FRAiF | маг. предметы | 12 | `magic_items_fraif.json` |
| ABH | предыстории | 3 | `backgrounds_abh.json` |
| ABH | черты | 16 | `feats_abh.json` |
| ABH | существа | 5 | `creatures_abh.json` |
| LFL | виды | 7 | `species_lfl.json` |
| LFL | предыстории | 2 | `backgrounds_lfl.json` |
| LFL | черты | 2 | `feats_lfl.json` |
| LFL | существа | 8 | `creatures_lfl.json` |
| NsF | маг. предметы | 8 | `magic_items_nsf.json` |
| NsF | существа | 8 | `creatures_nsf.json` |

**Всего:** 111. `source` = `fraif` / `abh` / `lfl` / `nsf` → `community_ref`. Флаг создания 2024 выключен. 2014 не меняли. Тексты приключений и карты не переносили.

## Выборка для сверки

1. **Взрослый глубинный дракон** — https://next.dnd.su/bestiary/29345-adult-deep-dragon / ttg `adult-deep-dragon-fraif`.
2. **Брошь Арфиста** — https://next.dnd.su/items/18607-harper-pin.
3. **Кутила** — https://next.dnd.su/backgrounds/926-carouser/ — ЛОВ/ИНТ/ХАР, черта «Неустанный гуляка».
4. **Жажда крови** — https://next.dnd.su/feats/424-bloodlust.
5. **Боггарт** — https://next.dnd.su/species/boggart / ttg `boggart-lfl`.
6. **Эльф (LFL)** — только ttg `elf-lfl` (`url_dndsu` в CSV пустой).
7. **Магический накопитель** — https://next.dnd.su/items/17494-arcane-battery.

## Пропуски / эталон

- Честных пропусков по недоступности страниц нет.
- `domestic-wonder` / `flying-wonder`: у статблока нет секции «Действия» (только черты / бонусные) — как на next.dnd.su.
- В `traits_text` UI — русские ярлыки книг («Приключения в Фаэруне», «Книга голода Астариона», «Первый свет Лорвина», «Падение Нетерила»), не коды ABH/LFL.

## Источник русских имён

`docs/edition-2024/sources/{creatures,magic_items,backgrounds,feats,species}.csv` (волна 0, next.dnd.su / ttg.club).

## Виды LFL (засижены)

боггарт, эльф (`elf__lfl`), феери, огневик, свояк, пересад Лорвина, измороз.
