# P24-C05 — файл для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверяет Игорь / отдельный проверяющий / Илья.

## Источники

- SRD 5.2.1 PDF (CC-BY 4.0): https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf — раздел Spell Descriptions + Class Spell Lists.
- RU имена: `docs/edition-2024/sources/spells.csv` (next.dnd.su / new.ttg.club, волна 0).
- Механика карточек: структурированные поля Open5e `document__key=srd-2024` (не копировать длинный `desc` в продукт).

## Ожидаемые количества

| Что | Число |
|-----|------:|
| `srd=true` в `spells.csv` | 339 |
| `spells_srd.json` | 339 |
| Заговоры (level 0) | 27 |
| Кастеры с непустым `spell_list` | 8 |
| Не-кастеры с пустым списком | 4 |

## Выборка для сверки с SRD PDF

| slug | EN (SRD) | На что смотреть |
|------|----------|-----------------|
| `acid-arrow` | Acid Arrow | Имя без Melf; Wizard; 2 круг; атака; усиление ячейкой |
| `acid-splash` | Acid Splash | Заговор; спас ЛОВ; рост 5/11/17 |
| `counterspell` | Counterspell | Реакция (не «Магия»); `magic_action=false` |
| `fireball` | Fireball | Действие «Магия»; 8d6; таблица слотов |
| `eldritch-blast` | Eldritch Blast | Рост лучами ×1/×2/×3/×4 |
| `tiny-hut` | Tiny Hut | SRD-имя, не Leomund’s; ритуал |
| `wish` | Wish | 9 круг; Wizard/Sorcerer |
| `commune` | Commune | Было false → должно быть в SRD |

## Выборка RU / pending

| slug | Ожидание |
|------|----------|
| `fireball` | RU из csv (`Огненный шар` и т.п.) |
| `acid-arrow` | Предложено «Кислотная стрела», `name_ru_pending` |
| `arcane-hand` | Предложено «Чародейская длань», `name_ru_pending` |
| Записи из `discrepancies.md` (spells) | `name_ru_pending` или принятое «Предложено» |

## Изоляция 2014

- `backend/data/srd/2014/spells_enriched_v1.json` и `frontend/public/spells-2014.json` не менялись.
- Пикеры с `edition=2014` не должны видеть карточки `rules_edition=2024`.

## Классовые списки

Сверить несколько slug у Wizard / Cleric / Bard с таблицами Class Spell Lists в PDF и с `data.classes` на карточке заклинания.
