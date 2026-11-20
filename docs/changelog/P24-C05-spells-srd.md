# P24-C05 — Заклинания SRD 2024

## Сделано

- Эталон `spells.csv`: `srd=true` = **339** (после сверки с SRD 5.2.1).
- Живая волна `backend/data/srd/2024/live/spells_srd.json` (339 карточек `kind=spell`, `rules_edition=2024`).
- `spell_list` у классов C04 и у подклассов Life / Land / Devotion / Fiend.
- Миграция `p24c05spell01` (идемпотентный upsert).
- Флаг создания 2024 не включался; 2014 каталог заклинаний не трогался.

## Источник RU

`docs/edition-2024/sources/spells.csv` (next.dnd.su; сверка ttg в волне 0). Для 17 SRD-имён без эпонима — предложенные короткие RU + `name_ru_pending`.
