# P24-C02 — файл для ручной сверки (слой 3)

Агент, собравший данные, **не принимает** слой 3. Сверяет Игорь / отдельный проверяющий / Илья.

## Источники

| Что | С чем сверять |
|-----|----------------|
| Состав (17 черт) | SRD 5.2.1 PDF, раздел Feats; эталон `feats.csv` (`srd=true`) |
| Русские имена | next.dnd.su + `discrepancies.md` («Предложено») |
| Краткая механика | SRD 5.2.1 (EN); карточки своими словами, без копирования абзацев |

## Выборка (приоритет)

1. **Skilled** — в SRD и `srd=true` (эвристика P24-00 ошибочно ставила false).
2. **Tough** — **не** в живом сиде (PHB, не SRD).
3. **Ability Score Improvement** — general, 4+, repeatable, +2/+1/+1, cap 20.
4. **Grappler** — 4+, Сил или Лов 13+, +1 Сил/Лов.
5. **Fighting styles** — пререквизит «умение Боевой стиль».
6. **Epic boons** — 19+, ASI +1 до 30; Spell Recall ещё требует умение заклинаний.
7. Предыстории C01: `origin_feat.id` ∈ {magic-initiate, alert, savage-attacker} резолвится в карточки.

## Ожидаемые количества

- черт 2024 active (SRD): **17**
- origin 4 / general 2 / fighting_style 4 / epic_boon 7

## Карточки продукта

`backend/data/srd/2024/live/feats_srd.json`.
