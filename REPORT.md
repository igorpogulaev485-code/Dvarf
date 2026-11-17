# Отчёт: астральный эльф + магпредметы 2014 (доправка 1)

## Прод: причина

Проверка БД creed20.tech — **только SELECT**, без UPDATE/DELETE/миграций. Секреты/почты/личные данные не выгружались.

### Астральный эльф

| character_id | edition | level | class | race_catalog_id | raceGrant | racialSpells / traitCards | Звёздный шаг |
|---|---|---|---|---|---|---|---|
| `4e11a57d-866e-4651-874a-a97a11f2b3e7` | 2014 | 8 | Чародей | astral_elf | **нет** | 0 / 0 | 0 |

На проде есть catalog id расы, но нет выдачи `raceGrant` / заговора / trait cards.

### Посох силы

| character_id | item_id | source | equipped | wear_slot | attuned | effects | resource | grant_spell |
|---|---|---|---|---|---|---|---|---|
| `4e11a57d-…` | `80d1962e-…` | catalog `staff_of_power` | true | held_main | **false** | 16 (I05 полный) | max 20, `2d8+4` | 9 |
| `0ac3fee8-…` | `75d2e307-…` | catalog тот же | true | held_main | **false** | 16 | max 20, `2d8+4` | 9 |

**Вердикт бага посоха в коде:** не регрессия после I05, не устаревшая копия effects (I23), не free-text. Данные полные. Свойства молчат, потому что **`isGearEffectActive` требует equipped ∧ attuned**, а `attunements=[]`.

Поведение без настройки: подсказка на карточке инвентаря  
`свойства не действуют · настройте, чтобы получить бонусы`  
(см. `staff-unattuned-hint-1440.png` / `390`). После настройки — КД+2, спас+2, атака заклин.+2, заряды и grant_spell.

### Арбалеты на проде (тот же астральный)

| item_id | source | комментарий |
|---|---|---|
| `807cc5be-…` | free_text | «Лёгкий арбалет» без +1 |
| `9075a981-…` | free_text | «Болты арбалета» |

---

## Баг атаки «Лёгкий арбалет +1» (+1 вместо +4)

**Симптом:** волшебник 5, Лов 10, БМ +3, арбалет +1 → на Play Desk было **+1**, ожидалось **+4**.

**Причины (две):**

1. Play Desk брал только `attack.is_proficient`, не пересчитывал через `isWeaponProficient` (в отличие от AttacksPanel).
2. `reconcileDruidStartWeapons` при **пустых** `classGrants` сбрасывал `proficiency.weapons.simple` в `false` и автосейв затирал лист — владение «Простое» пропадало.

**Фикс:** live-пересчёт PB на Play Desk + не трогать weapons, если друид-grant не переписывался. Selfcheck: wizard crossbow +1 → +4; fighter longsword +1 → +6.

---

## Что сделано в PR

### Баг 2 — без второго механизма I05

Авто-attune при экипировке; hint «настройте, чтобы получить бонусы»; held_main «В руках»; I23 client refresh; selfcheck посоха.

### Баг 1 — астральный эльф

`spell_choices` / trait_cards / `race-res:starlight_step`; banner «… · нужен выбор»; high_elf / half_elf_high / drow; миграция `n0a1b2c3d4e5` ← `dice02b01widenroll` (одна голова).

### Merge

`origin/main` (#498/#499/#504) merge-коммитом, без force-push.

---

## Аудит рас 2014 с расовыми заклинаниями

| Раса | Было | В PR |
|---|---|---|
| astral_elf | prose | spell_choices + resource Звёздный шаг |
| high_elf | prose | spell_choices wizard_cantrips |
| half_elf_high | prose | spell_choices wizard_cantrips |
| drow | prose | fixed racial_spells |
| forest_gnome, pale_elf, tiefling*, mark_*, aasimar… | уже racial_spells | без изменений |
| kobold_draconic_sorcery | мёртвое `cantrip_note_ru` | **не** этот механизм |

---

## Таблица предметов каталога (заряды / заклинания)

Движок один (I03/I05): `resource` + `grant_spell` (+ бонусы). Работают при **equipped ∧ attuned** (если attunement required).

| slug | grant_spell | resource | attune | заметка |
|---|---|---|---|---|
| staff_of_power | 9 | 20 / 2d8+4 | да | чинили активацию |
| staff_of_the_magi | 19 | да | да | тот же движок |
| staff_of_fire / frost / healing / woodlands / … | 2–8 | да | да | тот же |
| wand_of_magic_missiles / fireballs / … | 1+ | да | чаще да | тот же |
| weapon_1 / _2 / _3 | 0 | нет | нет | attack/damage +N после base choice |

Полный список staff_/wand_ с `grant_spell`/`resource` — в локальном каталоге (десятки строк); отдельного второго движка нет.

---

## Доказательства (живые, не seed)

Артефакты: `/opt/cursor/artifacts/`.

| Файл | Что видно |
|---|---|
| astral-elf-desk-1440 / 390 | астральный заговор, Звёздный шаг, посох, КД 12 |
| crossbow-plus1-1440 / 390 | атака **+4**, урон 1к8+1 |
| longsword-plus1-1440 / 390 | воин, меч +1 атака **+6** |
| staff-unattuned-hint-1440 / 390 | «настройте, чтобы получить бонусы», КД без +2 посоха |
| staff-unequipped-bonuses-gone-1440 | снял из рук → КД **10**, нет gear-spell |
| needs-choice-astral-1440 / 390 | banner «Астральное пламя · нужен выбор» |
| needs-choice-after-pick-1440 | Священное пламя · астральный, Звёздный шаг 2/2, banner нет |
| create-astral-cantrip-step-1440 | RaceSetup: Пляшущие/Свет/Священное пламя |
| staff-recharge-2d8-1440 | инвентарь посоха, заряды×20, attuned+в руках |
| starlight-spent / restored | ресурс Звёздный шаг |
| regression-before/after-baseline-1440/390 | md5 **совпали** (worktree main :5174 vs ветка :5173) |

### Регресс md5 (один персонаж «Обычный Воин», scrollTop=0)

| | 1440 | 390 |
|---|---|---|
| before (main worktree) | `edb6546b629dde8564e3b692c1cafe83` | `ed18d644e9366e85885ee59237e12a51` |
| after (ветка) | тот же | тот же |
| diff | нет | нет |

UI kit lock md5 = main: `index.css` `31936aa1…`, `26-lobby-hub-lock.css` `0e69be02…`.

Selfcheck: `staffOfPower`, `gearCatalogRefresh`, `raceSpellChoices`, `needsSetup`, `equipmentProficiency` (+ reconcileDruid).  
`npm run build` — ok. Alembic: одна голова `n0a1b2c3d4e5`.
