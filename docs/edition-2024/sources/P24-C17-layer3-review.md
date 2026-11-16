# P24-C17 — файл для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/); полные тексты книги не копировать.

## Объём

| Категория | FRHoF эталон | Сид |
|-----------|--------------|-----|
| Подклассы | 8 | `subclasses_frhof.json` |
| Предыстории | 18 | `backgrounds_frhof.json` |
| Черты | 34 | `feats_frhof.json` |
| Заклинания | 19 | `spells_frhof.json` |
| Снаряжение | 12 | `equipment_frhof.json` |
| Маг. предметы | 2 | `magic_items_frhof.json` |
| Виды | 0 | — |
| Существа | 0 | — |

`source=frhof` → `content_layer=community_ref`. C12 (бастионы) не трогали. Флаг создания 2024 выключен. 2014 не меняли.

## Выборка для сверки

1. **Коллегия луны** — https://next.dnd.su/class/bard — умения 3/6/14.
2. **Арфист** — https://next.dnd.su/backgrounds/913-arfist/ — ЛОВ/ИНТ/ХАР, черта «Агент Арфистов».
3. **Искра чаропламени** — https://next.dnd.su/feats/390-spellfire-spark — черта происхождения.
4. **Вспышка чаропламени** — https://next.dnd.su/spells/12463-spellfire-flare — 1 ур., чародей/волшебник.
5. **Бандура** — https://next.dnd.su/equipment/17353-bandore — музыкальный инструмент.
6. **Кольцо авантюриста** — https://next.dnd.su/items/17342-adventurers-ring — обычное кольцо.
7. **Ветряной челнок** — https://next.dnd.su/items/17351-windskiff — редкий чудесный, 3 заряда.

## Пропуски / эталон

- Виды и существа FRHoF в CSV: **0** (не добавляли).
- `enclave-magic`: на ttg нет карточки (`url_ttg` пустой) — сидили по next.dnd.su.
- `windskiff`: `url_ttg` пустой (на ttg только `-fraif`, см. gaps.md) — сидили по next.dnd.su.
- `arfist`: в CSV дописан `name_en=Harper` (было пусто).
- Заклинания FRHoF добавлены в `spell_list` классов C04; в списках книги **нет** артефактора → `classes_efa` не трогали.
- Страницы next.dnd.su на дату сборки ответили 200; честных пропусков по недоступности нет.

## Источник русских имён

`docs/edition-2024/sources/{subclasses,backgrounds,feats,spells,equipment,magic_items}.csv` (волна 0, next.dnd.su / ttg.club).
