# Пробелы источников (P24-00)

Дата опроса: **2026-11-15** (Asia/Yekaterinburg + агент UTC).  
Сайты: [next.dnd.su](https://next.dnd.su/), [new.ttg.club](https://new.ttg.club/).  
SRD 5.2.1 PDF: [SRD_CC_v5.2.1.pdf](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf) (для флага `srd` по английским именам).

## Dragon Delves

- В карте источников next.dnd.su есть код **DDBD** (`314`), но **ни одной карточки** в списках видов / классов / черт / заклинаний / предметов / бестиария с этим кодом на дату опроса нет.
- На new.ttg.club ярлыка Dragon Delves / DDBD в выгрузках API v2 тоже **нет**.
- На главной next.dnd.su книга не названа (это совпадает с осмотром плана 16.11).
- **Вывод:** пачку P24-C19 не выкидывать из выпуска; эталонный список пока пуст — закрывать, когда сайт(ы) опубликуют каталог, либо по решению Игоря из другого легального канала. Полные тексты приключений и карту по плану не переносим.

## Arcana Unleashed

- **Есть на обоих сайтах.**
- next.dnd.su: код **AU** (`315`), плюс **AUD** (`317`, Deadfall) у части предметов и существ.
- new.ttg.club: ярлыки `AU` / `AUD`.
- В эталоне уже есть записи AU/AUD (подклассы, предыстории, черты, заклинания, предметы, существа и т.д.).

## Сооружения бастиона

- next.dnd.su: URL [`/bastion/`](https://next.dnd.su/bastion/) отвечает 200, но **списка сооружений нет** (пустая оболочка). В глоссарии отдельных карточек помещений бастиона тоже не найдено.
- new.ttg.club: раздел [`/bastions`](https://new.ttg.club/bastions) на дату опроса в состоянии ошибки/заглушки; `GET /api/v2/bastions/search` вернул **пустой список**.
- Файл `bastions.csv` заведён с заголовком, записей **0**. Пачку P24-C12 не снимать: пробел источника.

## Чего нет ни на одном сайте (из книг плана)

| Книга / тема | Статус |
|---|---|
| Dragon Delves (каталог) | Нет содержимого |
| Сооружения бастиона (DMG) | Нет списка |
| Отдельный полный каталог Adventures in Faerûn сверх уже размеченных карточек | Частично: на сайтах есть ярлык FRAiF у предметов/существ/глоссария, но «весь бандл» как отдельный оглавление не выгружался |

## Только на одном сайте

Сверка «есть официальная карточка на A, нет на B» (по английскому имени, только книги плана):

- **next.dnd.su богаче** по объёму официальных карточек в заклинаниях, магических предметах и бестиарии (в эталон взяты списки dnd.su; ttg использован для русских имён и перекрёстной проверки).
- **new.ttg.club** иногда даёт карточку, которой нет в официальном срезе dnd.su после отсева — такие 3rd/UA/HB ушли в `excluded.md`, в эталон не брались.
- Подклассы: эталон собран с страниц классов **next.dnd.su** (в HTML есть `class__subclass__holder` + источник). Детальные страницы классов ttg в Nuxt на дату опроса не отдали вложенный список подклассов в SSR.
- **Elf (Lorwyn / LFL):** на ttg есть отдельная карточка [`elf-lfl`](https://new.ttg.club/species/elf-lfl); на next.dnd.su отдельного вида «Эльф» из LFL нет (только PH24 `/species/elf`). В эталон добавлена строка `elf__lfl` только со ссылкой ttg.
- **Черты EFA без карточки книги на ttg:** у 14 черт next.dnd.su помечает книгу EFA, а на ttg есть только вариант с суффиксом `-uaeu` (Unearthed Arcana). UA в эталон не входит → `url_ttg` пустой:

  `aberrant-dragonmark`, `boon-of-siberys`, `greater-aberrant-mark`, `greater-mark-of-handling`, `greater-mark-of-passage`, `greater-mark-of-shadow`, `greater-mark-of-storm`, `mark-of-detection`, `mark-of-hospitality`, `mark-of-passage`, `mark-of-sentinel`, `mark-of-shadow`, `mark-of-storm`, `mark-of-warding`.

- **Ссылки ttg другой книги (очищены, чтобы суффикс = книга строки):** `windskiff` (FRHoF, на ttg только `-fraif`), `potion-of-healing` PH24 (на ttg только `-dmg`), `will-o-wisp` MM24 (slug `-dmg`), `phaerimm-agent` / `phaerimm-hatchling` NsF (на ttg `-fraif`).

Примеры расхождений состава (не названий): см. также `counts.json` и таблицу в README/PR.

## Перевод ещё дорабатывается

По заявлениям на главной next.dnd.su (и подтверждено при обходе):

- **Магические предметы DMG 2024** — перевод описаний дорабатывается.
- **Бестиарий MM 2024** — перевод описаний дорабатывается.

Для слоя 3 (ручная сверка) такие категории — приоритет выборки.

## Технические сбои при опросе

- Оба сайта периодически рвали TLS/соединение; запросы шли с паузами и повторами.
- Удалось получить полные списки категорий next.dnd.su (включая `window.LIST` для spells/feats/items/bestiary).
- У new.ttg.club рабочие `GET /api/v2/{category}/search` для classes, species, backgrounds, feats, spells, items, magic-items, bestiary, glossary; bastions — пусто.
- Отдельные страницы оружия next.dnd.su для мастерства — все 38 официальных оружий с свойством mastery получены.

## SRD 5.2.1

- Полные тексты SRD **не копировались** в репозиторий.
- Флаг `srd=true/false` проставлен эвристикой по **английским именам**, извлечённым из TOC/таблиц PDF SRD 5.2.1 (локальный разбор). Это не замена полному оглавлению WotC; при сомнении сверять PDF.
- Сайты почти не маркируют карточки кодом SRD (`311`), поэтому полагаться только на сайт-тег нельзя.
- **P24-C01 (2026-11-15):** в `backgrounds.csv` у `guard` и `noble` флаг `srd` ошибочно был `true` (совпадение с именами бестиария Guard/Noble в PDF). В официальном Character Origins SRD 5.2.1 только **Acolyte, Criminal, Sage, Soldier**. Флаги исправлены на `false`; книжные предыстории — в P24-C09.
- **P24-C02 (2026-11-15):** в `feats.csv` эвристика `srd` ошибалась. По разделу Feats SRD 5.2.1 ровно **17** черт: Origin — Alert, Magic Initiate, Savage Attacker, **Skilled** (был `false`); General — Ability Score Improvement, Grappler; Fighting Style — Archery, Defense, Great Weapon Fighting, Two-Weapon Fighting; Epic Boon — Combat Prowess, Dimensional Travel, Fate, Irresistible Offense, Spell Recall, the Night Spirit, Truesight. **Tough** был `true` ошибочно (PHB, не SRD) → `false`. Флаги выровнены под PDF/оглавление SRD.
- **P24-C03 (2026-11-15):** эвристика `srd` для **Armor** и **Adventuring Gear / Tools** была почти полностью `false` (в `armor.csv` только `shield=true`; в `equipment.csv` — **0** `true`). По разделу Equipment SRD 5.2.1:
  - **Weapons:** все **38** уже были `true` (включая Musket/Pistol) — без правки флагов.
  - **Armor:** все **13** строк (12 доспехов + Shield) → `srd=true`.
  - **Equipment:** все PH24 строки из эталона, которые есть в SRD → `srd=true` (**134** после дописки); FRHoF (12) остаются `false`.
  - **Пробелы эталона (добавлены в `equipment.csv`):** Alchemist's Fire, Alchemist's Supplies, Burglar's Pack, Climber's Kit, Healer's Kit, Mason's Tools, Painter's Supplies, Potter's Tools, Smith's Tools, Traveler's Clothes.
  - **Не добавляли в equipment (есть в SRD Adventuring Gear, но ведутся как магия):** Potion of Healing, Spell Scroll (Cantrip / Level 1) — уже в `magic_items.csv` (DMG24); сид C03 их не берёт. Закрывать в пачке магических предметов.
  - Кнопки мастерства оружия и логика боя **не** в этой пачке (M01 / поздние механики).
- **P24-C04 (2026-11-15):** эвристика `srd` для **подклассов** PH24 ошибалась относительно SRD 5.2.1 (в SRD ровно **один** подкласс на каждый из 12 классов):
  - **Должны быть `true`:** Path of the Berserker, College of Lore, Life Domain, Circle of the Land, Champion, **Warrior of the Open Hand**, **Oath of Devotion**, Hunter, Thief, **Draconic Sorcery**, Fiend Patron, Evoker.
  - **Были `true` ошибочно → `false`:** Light Domain, Warrior of Shadow, Assassin (есть в PH24, нет в SRD 5.2.1).
  - **Были `false` ошибочно → `true`:** Warrior of the Open Hand, Oath of Devotion, Draconic Sorcery.
  - Классы (12 PH24, без Artificer) уже были `srd=true` — без правки.
  - Автоматизация стола/листа (ресурсы, кнопки) **не** в этой пачке (M02). Список заклинаний классов — C05.
- **P24-C05 (2026-11-15):** эвристика `srd` для **заклинаний** ошибалась относительно раздела Spells SRD 5.2.1 (**339** карточек; сверка с Open5e `document=srd-2024` и числом `Casting Time` в PDF):
  - **Были `false` ошибочно → `true` (22):** Commune, Conjure Celestial, Contingency, Counterspell, Delayed Blast Fireball, Divine Word, Gaseous Form, Guards and Wards, Hallow, Harm, Haste, Lightning Bolt, Magic Jar, Phantasmal Force, Phantom Steed, Planar Ally, Prismatic Spray, Resurrection, Sequester, Storm of Vengeance, Transport via Plants, Wind Wall.
  - **Имена SRD без эпонима (17):** в PHB/на сайтах — Melf’s Acid Arrow, Bigby’s Hand, …; в SRD 5.2.1 — Acid Arrow, Arcane Hand, Arcane Sword, Arcanist’s Magic Aura, Black Tentacles, Faithful Hound, Floating Disk, Freezing Sphere, Hideous Laughter, Instant Summons, Irresistible Dance, Magnificent Mansion, Private Sanctum, Resilient Sphere, Secret Chest, Telepathic Bond, Tiny Hut. В эталон **добавлены** строки с SRD-id (`acid-arrow` и т.д., `srd=true`); эпонимические PH24 остаются `srd=false` (книжные имена — C10).
  - Живой сид: `spells_srd.json` (339), `spell_list` у 8 кастеров C04 и у Life/Land/Devotion/Fiend; без Artificer. Книжные заклинания AU/FR/EFA — C10+.
- **P24-C06 (2026-11-15):** эвристика `srd` для **магических предметов** в `magic_items.csv` была полностью `false` (0). По разделу Magic Items A–Z SRD 5.2.1 засеяно **285** карточек (`srd=true`):
  - **Были `false` → `true`:** 285 строк после сверки с PDF (было **0** — эвристика P24-00 не разметила предметы).
  - **Имена SRD без эпонима (добавлены):** Apparatus of the Crab, Dragon Orb, Efficient Quiver, Feather Token, Handy Haversack, Instant Fortress, Iron Bands, Marvelous Pigments, Mysterious Deck.
  - **Семейства развернуты:** Potions of Healing×4, Spell Scroll×10, Ammunition/Armor/Weapon/Shield +1..+3, Wand of the War Mage +1..+3, Potion of Giant Strength×6.
  - **Эпонимы остаются `false`:** Apparatus of Kwalish, Orb of Dragonkind, Quaal’s Feather Token, Heward’s Handy Haversack, Daern’s Instant Fortress, Iron Bands of Bilarro, Nolzur’s Marvelous Pigments, Deck of Many Things.
  - Зелья лечения (4) и свитки заклинаний (cantrip–9) сидятся здесь (C03 их отдал). Книжные предметы сверх SRD — C11+.
- **P24-C07 (2026-11-15):** сверка `creatures.csv` с разделами SRD 5.2.1 **Monsters A–Z** (235) и **Animals** (95). Добавлена колонка `srd_section` (`monsters` / `animals`). Сид C07 — только Monsters (235); Animals → P24-C08. Эвристика P24-00 по сумме 330 совпала с оглавлением; типы «Зверь» в Monsters (например Axe Beak) остаются в C07, не в C08.
- **P24-C08 (2026-11-15):** сид раздела SRD 5.2.1 **Animals** (95 карточек) в `animals_srd.json`. Без пересечения slug с Monsters C07 (235). Поле `beast_tags`: `wild_shape_ok` (зверь, ПО≤1, не рой), `mount`, `has_fly` / `has_swim` — данные без логики стола.
- **P24-C10 (2026-11-15):** PHB сверх SRD — **58** черт (`feats_ph24.json`) и **69** заклинаний (`spells_ph24.json`), `source=ph24` → `community_ref`. Именные заклинания (17) связаны с безымянными SRD через `data.srd_alias` (не слияние). `equipment.csv` / `magic_items.csv` для PH24 `srd=false` = **0** после C03/C06 — волн предметов нет. Списки классов C04 пополнены; `origin_feat` всех предысторий C01+C09 резолвятся. Книжные AU/FR/EFA и магия DMG сверх SRD — следующие пачки.

- **P24-C13 (2026-11-15):** волна 1 MM24 сверх SRD (`srd=false`, `name_en` < «Kuo-toa Archpriest»): 86 карточек, source=`mm24` → community_ref. Последнее существо волны: Kuo-toa. C12 (бастионы) пропущена. Остаток алфавита → P24-C14.
- **P24-C14 (2026-11-15):** волна 2 MM24 сверх SRD (`srd=false`, `name_en` ≥ «Kuo-toa Archpriest»): 87 карточек, source=`mm24` → community_ref. Первое: Kuo-toa Archpriest; последнее: Yuan-ti Malison (Type 3). Доправка C07 (summary + spell_refs). C12 (бастионы) пропущена.

- **P24-C07R (2026-11-15):** пересборка текстов C07 Monsters (235) и C08 Animals (95) с next.dnd.su; формат как C13/C14; стат-диффов 19; пропусков scrape 0.
