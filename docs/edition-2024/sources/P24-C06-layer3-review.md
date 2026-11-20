# P24-C06 — выборка для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Сверять с SRD 5.2.1 PDF
(Magic Items A–Z) и русскими именами next.dnd.su / new.ttg.club.

## Выборка

| id | EN | RU | Что сверить |
|----|----|----|-------------|
| `potion-of-healing` | Potion of Healing | Зелье лечения | 2d4+2, ordinary; C03 handoff |
| `potion-of-supreme-healing` | Potion of Supreme Healing | Зелье превосходного лечения | 10d4+20, very rare |
| `spell-scroll-cantrip` | Spell Scroll (Cantrip) | Свиток заклинания (заговор) | common; ссылка на круг |
| `spell-scroll-level-9` | Spell Scroll (Level 9) | Свиток заклинания (9-й уровень) | legendary |
| `bag-of-holding` | Bag of Holding | Сумка хранения | uncommon, без настройки |
| `wand-of-fireballs` | Wand of Fireballs | … | 7 зарядов, attune spellcaster, `spell_refs` → fireball |
| `staff-of-fire` | Staff of Fire | … | attune druid/sorcerer/warlock/wizard; spell_refs |
| `armor-1` / `weapon-3` | Armor +1 / Weapon +3 | … | бонус КД / атаки; base categories → C03 |
| `apparatus-of-the-crab` | Apparatus of the Crab | Аппарат краба (предложено) | SRD-имя без Kwalish; `name_ru_pending` |
| `armor-of-vulnerability` | Armor of Vulnerability | … | cursed=true |
| `holy-avenger` | Holy Avenger | … | attune paladin; +3 |
| `mysterious-deck` | Mysterious Deck | Таинственная колода (предложено) | SRD rename vs Deck of Many Things |

## Источники

- SRD 5.2.1 PDF: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
- RU имена эталона: `docs/edition-2024/sources/magic_items.csv` (next.dnd.su)
- Живой сид: `backend/data/srd/2024/live/magic_items_srd.json` (285)
