# Эталонные списки редакции 2024 (волна 0 / P24-00)

Живые файлы для порога полноты следующих пачек справочников.  
**Не сиды и не карточки продукта** — только id, имена, книга, ссылки, флаги.

## Даты обращения

| Источник | Дата | Что брали |
|---|---|---|
| https://next.dnd.su/ | 2026-11-15 | HTML-списки / `window.LIST`, страницы классов, оружие (mastery) |
| https://new.ttg.club/ | 2026-11-15 | `GET /api/v2/*/search`, сверка русских имён |
| SRD 5.2.1 PDF (CC-BY 4.0) | 2026-11-15 | только английские имена для флага `srd` |

Полные тексты книг и SRD в репозиторий **не копировались**.

## Файлы категорий

Единый CSV UTF-8, запятая, заголовок в первой строке.

Общие колонки:

| Колонка | Смысл |
|---|---|
| `id` | английский slug |
| `name_en` | английское имя |
| `name_ru` | русское имя (после сверки; при споре — см. `discrepancies.md`) |
| `book` | код книги плана (`PH24`, `DMG24`, `MM24`, `EFA`, `FRHoF`, `FRAiF`, `NsF`, `ABH`, `LFL`, `RTW`, `DDBD`, `AU`, `AUD`, `SRD`) |
| `category` | имя файла без `.csv` |
| `url_dndsu` | ссылка next.dnd.su (если была) |
| `url_ttg` | ссылка new.ttg.club (если нашлось совпадение по EN) |
| `srd` | `true` / `false` |

Дополнительно:

- `feats.csv` — `feat_category` (`origin` / `general` / `fighting_style` / `epic_boon` / `dragonmark` / `dark_gift`), `feat_category_ru`
- `spells.csv` — `level`, `school`, `classes` (через `|`)
- `weapons.csv` — `mastery`, `mastery_ru`, `equipment_group`
- `armor.csv` / `equipment.csv` — `equipment_group`
- `subclasses.csv` — `class_id`, `subclass_id`
- `creatures.csv` — `creature_type`
- `glossary.csv` — `glossary_section` (`condition`, `actions`, …)

Служебные:

- `counts.json` — ожидаемые количества по категории и книге (порог теста)
- `glossary_ru.csv` — плоский словарь id×категория → RU/EN
- `discrepancies.md` — расхождения RU между сайтами
- `excluded.md` — отсев (WoW, HB, UA, 3rd party)
- `gaps.md` — Dragon Delves, бастионы, односторонние пробелы
- `_build_from_cache.py` — необязательный пересборщик из локального кэша `/tmp/p24-00` (не нужен CI)

## Книги плана (коды)

| Код | Книга |
|---|---|
| PH24 | Player's Handbook 2024 |
| DMG24 | Dungeon Master's Guide 2024 |
| MM24 | Monster Manual 2024 |
| EFA | Eberron: Forge of the Artificer |
| FRHoF | Forgotten Realms: Heroes of Faerûn |
| FRAiF | Forgotten Realms: Adventures in Faerûn |
| NsF | Netheril's Fall |
| ABH | Astarion's Book of Hungers |
| LFL | Lorwyn: First Light |
| RTW | Ravenloft: The Horrors Within |
| DDBD | Dragon Delves |
| AU | Arcana Unleashed |
| AUD | Arcana Unleashed: Deadfall |
| SRD | SRD 5.2.1 |

## Как перепроверить

1. Открыть категорию на next.dnd.su и new.ttg.club, сравнить число официальных карточек с `counts.json` → `by_category`.
2. Выборочно сверить 5–10 имён с `glossary_ru.csv` / CSV категории.
3. Прогнать тест: из каталога `backend` — `pytest tests/test_edition_2024_sources.py -q`.
4. При обновлении сайтов — заново выгрузить списки (бережно, с паузами), обновить CSV и `counts.json` отдельным PR.

## Тест валидности

`backend/tests/test_edition_2024_sources.py` проверяет:

- уникальные `id` внутри каждого CSV категории;
- у каждой записи непустые `book` и хотя бы одна из `url_dndsu` / `url_ttg`;
- суффикс `url_ttg` (…-phb, …-efa, …-rhw, …) соответствует `book` строки; суффиксы UA (`-uaeu` и т.п.) запрещены;
- `counts.json` совпадает с фактическими количествами в CSV.
