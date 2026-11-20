# P24-C21 — выборка для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/).

## Объём

| Файл | Эталон | Сид |
|---|---:|---:|
| `subclasses_au.json` | 8 | 8 |
| `backgrounds_au.json` | 10 | 10 |
| `feats_au.json` | 29 | 29 |
| `spells_au.json` | 33 | 33 |
| `magic_items_au.json` | 47 | 47 |
| `creatures_au.json` | 19 | 19 |
| `magic_items_aud.json` | 14 | 14 |
| `creatures_aud.json` | 6 | 6 |

**Всего:** 166 (цель 166).

## Эталон CSV vs ТЗ

- AU: 8 подклассов, 10 предысторий, 29 черт, 33 заклинания, 47 предметов, 19 существ — совпадает с CSV.
- AUD: 14 предметов, 6 существ — совпадает с CSV.
- Виды AU/AUD: 0.

## Пропуски / pending

- Честных пропусков по недоступности страниц нет.

## Особые случаи

- `source=au` / `aud` → `community_ref`.
- Русские имена — из `docs/edition-2024/sources/*.csv` (next.dnd.su / new.ttg.club).
- Подклассы: полный текст умений с next.dnd.su/class/*; `spell_list` — slug уже принятых/AU заклинаний.
- Заклинания: damage по-русски с «к» (например «2к10 излучением»).
- Дубли уже принятых карточек не сидились (коллизий slug не было).

## Выборка для сверки

| slug | kind | Сверять |
|---|---|---|
| `cleric__arcana-domain` | subclass | next.dnd.su/class/cleric |
| `wizard__conjurer` | subclass | next.dnd.su/class/wizard |
| `agent-of-the-ninth-quill` | background | ttg agent-of-the-ninth-quill-au |
| `arcane-infiltrator` | feat (origin) | ttg / next.dnd.su feats |
| `abjuration-adept` | feat (general) | ttg / next.dnd.su feats |
| `aura-of-evasion` | spell | ttg aura-of-evasion-au |
| `arcane-chatelaine` | item | ttg arcane-chatelaine-au |
| `abjurer-archmage` | bestiary | next.dnd.su / ttg |
| `szass-tam` | bestiary AUD | next.dnd.su / ttg |
