# P24-C10 — PHB 2024 черты, заклинания (сверх SRD)

## Сделано

- Эталон: `feats.csv` / `spells.csv` — `book=PH24`, `srd=false` → **58** черт, **69** заклинаний.
- Живые волны: `feats_ph24.json`, `spells_ph24.json` (`source=ph24` → `community_ref`).
- Именные заклинания (17) — отдельные карточки с `data.srd_alias` на SRD без эпонима.
- Списки заклинаний классов C04 пополнены PHB-сверх; ссылки подклассов C09 резолвятся.
- Все `origin_feat` предысторий C01+C09 резолвятся (в т.ч. crafter / musician / tough / healer / lucky / tavern-brawler).
- `equipment.csv` / `magic_items.csv`: PH24 сверх SRD = **0** (после C03/C06) — волн нет.
- Миграция `p24c10phb01` (после `p24c09phb01`), идемпотентный сид.
- Флаг создания 2024 не включался; каталог 2014 не менялся.

## Источник RU

`docs/edition-2024/sources/{feats,spells}.csv` (next.dnd.su; сверка ttg / `discrepancies.md`).
