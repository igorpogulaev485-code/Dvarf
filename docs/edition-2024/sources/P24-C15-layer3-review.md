# P24-C15 — файл для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/); полные тексты книги не копировать.

## Объём

| Категория | EFA эталон | Сид |
|-----------|------------|-----|
| Класс | 1 (`artificer`) | `classes_efa.json` |
| Подклассы | 5 | `subclasses_efa.json` |
| Виды | 5 | `species_efa.json` |
| Предыстории | 17 | `backgrounds_efa.json` |
| Черты | 28 | `feats_efa.json` |
| Заклинания | 1 (`homunculus-servant`) | `spells_efa.json` |
| Маг. предметы | 9 | `magic_items_efa.json` |
| Существа | 0 | — |

`source=efa` → `content_layer=community_ref`. Артефактор 2014 (Таша) не изменялся.

## Выборка для сверки

1. **Артефактор** — https://next.dnd.su/class/artificer — К8, ИНТ, полукастер, реплики/схемы (не инфузии Таши), таблица 1–20.
2. **Картограф** — специальность на той же странице — атлас 3/5/9/15.
3. **Кованый** — https://next.dnd.su/species/warforged — тип Конструкт, размер M/S.
4. **Наследник дома Каннит** — https://next.dnd.su/backgrounds/935-house-cannith-heir/ — ASI, Метка создания.
5. **Аберрантная метка** — https://next.dnd.su/feats/439-aberrant-dragonmark — категория dragonmark.
6. **Гомункул-слуга** — https://next.dnd.su/spells/12581-homunculus-servant — 2 ур., только артефактор.
7. **Ослепительное оружие** — https://next.dnd.su/items/17570-dazzling-weapon — редкое, +1, заряды.

## Пропуски / не в эталоне

- **Реаниматор** — на странице класса next.dnd.su есть блок; в `subclasses.csv` (book=EFA) нет → не сидили.
- Заклинания с `filter_class=artificer`, но вне SRD/PH24/EFA (AU и др.): Dueling Ground, Uncertain Footing, Catnap, Distorted Distance, Spirit Lantern — не в `spell_list`.
- Монстры EFA: в эталоне 0 строк.

## Источник русских имён

`docs/edition-2024/sources/{classes,subclasses,species,backgrounds,feats,spells,magic_items}.csv` (волна 0, next.dnd.su).
