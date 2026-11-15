# P24-C14 — выборка для ручной сверки (слой 3)

Волна 2 MM24 сверх SRD: **87** карточек (с «Kuo-toa Archpriest» до конца алфавита).

| slug | name_ru | type | CR | PB | spells | gear |
|---|---|---|---|---|---|---|
| `kuo-toa-archpriest` | Верховный жрец Куо-тоа | aberration | 6 | +3 | 7 | 0 |
| `kuo-toa-monitor` | Куо-тоа надзиратель | aberration | 3 | +2 | 0 | 1 |
| `kuo-toa-whip` | Куо-тоа кнут | aberration | 1 | +2 | 0 | 1 |
| `lacedon-ghoul` | Водяной упырь (ласедон) | undead | 1 | +2 | 0 | 0 |
| `larva` | Ларва | fiend | 0 | +2 | 0 | 0 |
| `lizardfolk-geomancer` | Людоящер-геомант | elemental | 2 | +2 | 4 | 0 |
| `lizardfolk-sovereign` | Верховный людоящер | elemental | 4 | +2 | 0 | 1 |
| `mage-apprentice` | Ученик мага | humanoid | 2 | +2 | 6 | 1 |
| `manes` | Ман | fiend | 1/8 | +2 | 0 | 0 |
| `manes-vaporspawn` | Ман дитя отчаяния | fiend | 1 | +2 | 0 | 0 |
| `marid` | Марид | elemental | 11 | +4 | 9 | 0 |
| `merfolk-wavebender` | Мерфолк ваятель волн | elemental | 6 | +3 | 4 | 0 |
| `mind-flayer` | Свежеватель разума | aberration | 7 | +3 | 3 | 0 |
| `mind-flayer-arcanist` | Свежеватель разума заклинатель | aberration | 11 | +4 | 10 | 0 |
| `shadow-dragon` | Теневой дракон | dragon | 13 | +5 | 0 | 0 |
| `spectator` | Наблюдатель | aberration | 3 | +2 | 0 | 0 |
| `sphinx-of-secrets` | Сфинкс загадок | celestial | 8 | +3 | 5 | 0 |
| `vampire-umbral-lord` | Вампир, повелитель теней | undead | 15 | +5 | 0 | 0 |
| `yuan-ti-abomination` | Отродье юань-ти | monstrosity | 7 | +3 | 2 | 0 |
| `yuan-ti-malison-type-3` | Юань-ти проклинатель (Вид 3) | monstrosity | 3 | +2 | 2 | 0 |

## Доправка C07 (в этом же PR)

- `summary_ru`: согласование размера/типа («большая аберрация») — **234** карточки.
- `spell_refs` очищены у **22** без блока «Сотворение заклинаний» (осталось **42**):
  `adult-white-dragon`, `ancient-white-dragon`, `black-pudding`, `chuul`, `cloaker`,
  `doppelganger`, `drider`, `dust-mephit`, `ghost`, `gray-ooze`, `ice-devil`,
  `ice-mephit`, `imp`, `lemure`, `pit-fiend`, `quasit`, `rust-monster`, `sea-hag`,
  `sprite`, `stone-golem`, `succubus`, `vampire`.
- Статы и прочие поля C07 не менялись.

## Источник русских имён

- `docs/edition-2024/sources/creatures.csv` (next.dnd.su), сверка ttg.club.
- Статы: страницы next.dnd.su редакции 2024; короткие `summary_ru`/`text_ru` своими словами.

По типам: `{'aberration': 10, 'undead': 5, 'fiend': 14, 'elemental': 9, 'humanoid': 10, 'construct': 6, 'plant': 9, 'giant': 1, 'monstrosity': 16, 'fey': 3, 'ooze': 1, 'dragon': 2, 'celestial': 1}`
По ПО: `{'0': 2, '1/8': 4, '1/4': 7, '1/2': 5, '1': 12, '2': 11, '3': 10, '4': 3, '5': 7, '6': 4, '7': 5, '8': 3, '9': 1, '10': 5, '11': 2, '12': 2, '13': 2, '15': 2}`
`name_ru_pending`: 0.

Первое существо волны: **Kuo-toa Archpriest** (`kuo-toa-archpriest`).
Последнее существо волны: **Yuan-ti Malison (Type 3)** (`yuan-ti-malison-type-3`).
