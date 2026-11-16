# P24-C18 — выборка для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/).

## Объём

| Файл | Эталон | Сид |
|---|---:|---:|
| `creatures_fraif.json` | 40 | 40 |
| `magic_items_fraif.json` | 12 | 12 |
| `backgrounds_abh.json` | 3 | 3 |
| `feats_abh.json` | 16 | 16 |
| `creatures_abh.json` | 5 | 5 |
| `species_lfl.json` | 7 | 7 |
| `backgrounds_lfl.json` | 2 | 2 |
| `feats_lfl.json` | 2 | 2 |
| `creatures_lfl.json` | 8 | 8 |
| `magic_items_nsf.json` | 8 | 8 |
| `creatures_nsf.json` | 8 | 8 |

**Всего:** 111 (цель 111).

## Пропуски

- Честных пропусков по недоступности страниц нет (кэш P24-C18).

## Особые случаи

- `elf__lfl`: только ttg (`url_dndsu` пустой в CSV).
- Origin feats ABH/LFL: `Черта:` со страниц предысторий → id из feats.csv.
- `source` коды: fraif / abh / lfl / nsf → `community_ref`.
