# P24-C20 — выборка для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/).

## Объём

| Файл | Эталон | Сид |
|---|---:|---:|
| `species_rtw.json` | 4 | 4 |
| `backgrounds_rtw.json` | 4 | 4 |
| `feats_rtw.json` | 11 | 11 |
| `subclasses_rtw.json` | 7 | 7 |
| `magic_items_rtw.json` | 1 | 1 |
| `creatures_rtw.json` | 68 | 68 |

**Всего:** 95 (цель 95).

## Пропуски

- Честных пропусков по недоступности страниц нет (кэш P24-C20).

## Особые случаи

- Виды: дампир, ведьмовская кровь (hexblood), волколак (lupin), возрождённый.
- Предыстории: origin_feat — id из feats.csv; у Преследуемого — `survivor` (или тёмный дар на выбор в книге; в карточке — основная ссылка).
- Черты: 2 origin + 9 dark_gift.
- Подклассы: Reanimator → artificer (EFA); остальные → классы C04.
- `ebonbane` есть и как существо, и как магический предмет (разный kind).
- Тексты приключений и домены ужаса как сюжет/карты не переносим.
- `source=rtw` → `community_ref`.

## Выборка для сверки

| slug | kind | Сверять |
|---|---|---|
| `dhampir` | race | next.dnd.su/species/dhampir · ttg dhampir-rhw |
| `hexblood` | race | next.dnd.su/species/hexblood · ttg hexblood-rhw |
| `haunted-one` | background | next.dnd.su backgrounds · ttg haunted-one-rhw |
| `survivor` | feat (origin) | next.dnd.su/feats · ttg survivor-rhw |
| `mist-walker` | feat (dark_gift) | next.dnd.su/feats · ttg mist-walker-rhw |
| `artificer__reanimator` | subclass | next.dnd.su/class/artificer |
| `cleric__grave-domain` | subclass | next.dnd.su/class/cleric |
| `ebonbane` | item + bestiary | next.dnd.su items/bestiary · ttg ebonbane-rhw |
| `strahd-von-zarovich` | bestiary | next.dnd.su · ttg strahd-von-zarovich-rhw |
| `cthulhu` | bestiary | next.dnd.su · ttg cthulhu-rhw |
