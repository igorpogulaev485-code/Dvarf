# P24-C10 — файл для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/); полные тексты книги не копировать.

## Объём

| Категория | PH24 srd=false | Сид |
|-----------|----------------|-----|
| Черты | 58 | `feats_ph24.json` |
| Заклинания | 69 | `spells_ph24.json` |
| Снаряжение | 0 | — (всё PH24 уже в C03 / srd=true) |
| Магические предметы | 0 | — (PHB сверх SRD в эталоне нет; DMG24 → отдельная пачка) |

## Выборка для сверки

1. **Мастеровой / Музыкант / Крепкий / Лекарь / Везучий / Дебошир** — черты происхождения предысторий C09; карточки должны резолвиться.
2. **Актёр** — https://next.dnd.su/feats/321-actor — общая, ур. 4+, ХАР 13+, +1 ХАР.
3. **Сражение вслепую** — боевой стиль, слепое зрение 10 фт.
4. **Кислотная стрела Мельфа** — отдельная карточка с `srd_alias=acid-arrow` (не слияние с SRD).
5. **Доспех Агатиса / Руки Хадара / Расщепление разума** — списки колдуна / подклассов C09.
6. **Удар стального ветра / Ореол крестоносца** — ссылки домена войны C09.

## Именные заклинания (17) → `srd_alias`

`melfs-acid-arrow` → `acid-arrow`; `bigbys-hand` → `arcane-hand`; `mordenkainens-sword` → `arcane-sword`; `nystuls-magic-aura` → `arcanists-magic-aura`; `evards-black-tentacles` → `black-tentacles`; `mordenkainens-faithful-hound` → `faithful-hound`; `tensers-floating-disk` → `floating-disk`; `otilukes-freezing-sphere` → `freezing-sphere`; `tashas-hideous-laughter` → `hideous-laughter`; `drawmijs-instant-summons` → `instant-summons`; `ottos-irresistible-dance` → `irresistible-dance`; `mordenkainens-magnificent-mansion` → `magnificent-mansion`; `mordenkainens-private-sanctum` → `private-sanctum`; `otilukes-resilient-sphere` → `resilient-sphere`; `leomunds-secret-chest` → `secret-chest`; `rarys-telepathic-bond` → `telepathic-bond`; `leomunds-tiny-hut` → `tiny-hut`.

Без SRD-пары (отдельные PHB): `jallarzis-storm-of-radiance`, `tashas-bubbling-cauldron`, `yolandes-regal-presence`.

## Источник русских имён

`docs/edition-2024/sources/{feats,spells}.csv` (волна 0, next.dnd.su; при расхождении с ttg — `discrepancies.md` / `name_ru_pending`).
