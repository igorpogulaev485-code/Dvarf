# Отчёт: астральный эльф + магпредметы 2014

## Прод: причина

Проверка БД creed20.tech — **только SELECT**, без изменений. Секреты/почты/личные данные не выгружались.

### Астральный эльф

| character_id | edition | level | class | race_catalog_id | raceGrant | racialSpells | traitCards | race spells on sheet | Звёздный шаг resource |
|---|---|---|---|---|---|---|---|---|---|
| `4e11a57d-866e-4651-874a-a97a11f2b3e7` | 2014 | 8 | Чародей | `11111111-1111-4111-8111-111111111158` (astral_elf) | **нет** | 0 | 0 | 0 | 0 |

Вывод: на проде у персонажа стоит catalog id астрального эльфа, но в листе нет `raceGrant`, расовых заговоров и trait cards — дыра данных/выдачи расы (баг 1).

### Посох силы

| character_id | item_id | source | catalog_id | equipped | wear_slot | requires_attunement | attuned | effects_n | resource | grant_spell | gear-res / gear-spell на листе |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `4e11a57d-866e-4651-874a-a97a11f2b3e7` | `80d1962e-6cbb-468a-b67a-899dc4dc9528` | catalog | `36e02216-1073-5041-b147-8072f6373db9` | **true** | held_main | true | **false** | 16 (I05 полный) | max 20, `2d8+4` | 9 | 0 / 0 |
| `0ac3fee8-527d-4e9c-836f-0bdd3168cdfe` | `75d2e307-3ae8-49e9-a092-afdbb0f27980` | catalog | тот же | **true** | held_main | true | **false** | 16 | max 20, `2d8+4` | 9 | 0 / 0 |

Каталог на проде: `staff_of_power` — attunement sorcerer/warlock/wizard, 16 effects, recharge `2d8+4`. У обоих `attunements = []`.

**Вердикт бага 2:** не регрессия I05 и не устаревшая копия effects (I23). Данные посоха полные. Свойства молчат, потому что **нет настройки** (`isGearEffectActive` требует equipped **и** attuned).

### Арбалеты у астрального эльфа

| item_id | source | effects | комментарий |
|---|---|---|---|
| `807cc5be-5a48-4bc1-b495-2444775c29c2` | free_text | 0 | «Лёгкий арбалет» — обычный, не +1 |
| `9075a981-76af-45e8-823b-095b36eaa044` | free_text | 0 | «Болты арбалета» |

Магического арбалета (+1 / `weapon_1` + база) на этом листе нет.

---

## Что сделано в PR

### Баг 2 (магпредметы) — без второго механизма

Причина на проде = **не настроен**. Фикс потока:

- авто-настройка при экипировке, если слот свободен и класс проходит `attunementChoiceReason`;
- подсказка «свойства не действуют · нужна настройка / не в руке»;
- toast после добавления из справочника;
- `held_main` → «В руках» / участие в руках;
- live refresh effects из каталога (I23 client) для строк с `catalog_id`;
- selfcheck `staffOfPower.selfcheck.ts` + `gearCatalogRefresh.selfcheck.ts`.

### Баг 1 (астральный эльф)

- catalog: `trait_cards`, `spell_choices` (Астральное пламя), `racial_resources` (Звёздный шаг);
- тот же механизм: high_elf / half_elf_high (заговор волшебника), drow (фиксированные `racial_spells`);
- RaceSetupDialog + needsSetup «… · нужен выбор»;
- banner `sheet-banner` (шапка UIKIT-02 без NeedsSetupIndicator) + кнопка «Выбрать» → RaceSetup;
- `race-res:starlight_step` с max = ПБ;
- миграция `n0a1b2c3d4e5`.

### Аудит других рас 2014 с расовыми заговорами

| Раса | Было | В этом PR |
|---|---|---|
| astral_elf | только prose | spell_choices + trait_cards + resource |
| high_elf | prose «заговор волшебника» | spell_choices `wizard_cantrips` |
| half_elf_high | prose | spell_choices `wizard_cantrips` |
| drow | prose | racial_spells (пляшущие огоньки / огонь фей / тьма) |
| forest_gnome, pale_elf, tiefling*, mark_*, aasimar… | уже `racial_spells` | без изменений |
| kobold_draconic_sorcery | `cantrip_note_ru` мёртвое поле | **не** тем же механизмом (отдельный slice) |

---

## Таблица предметов (баг 2)

| Предмет | Данные зарядов/заклинаний/бонусов | Почему |
|---|---|---|
| Посох силы (`staff_of_power`) | уже I05: 20 / 2d8+4 / 9 заклинаний / +2 КД, спас, атака заклин. | чинили активацию (настройка), не данные |
| Оружие +1 (`weapon_1`) + база арбалет | attack/damage +1 после выбора базы | данных хватало; selfcheck покрывает |
| Свободный текст «арбалет +1» | нет effects | нужен справочник / `weapon_1` |

---

## Доказательства (живые сценарии)

Локально: живые персонажи через API (не seed-скрипт), Vite + API, Playwright 1440×900 и 390×844.

| Артефакт | Что видно |
|---|---|
| `/opt/cursor/artifacts/astral-elf-desk-1440.png` | Астральный волшебник 5: «Пляшущие огоньки» + тег «астральный», «Звёздный шаг» 3/3 (=ПБ), посох 20/20, заклинания с тегом «Посох силы», КД 12 (+2), арбалет +1 «в руках» |
| `/opt/cursor/artifacts/staff-power-active-1440.png` | Тот же стол — активные заряды/заклинания посоха после настройки |
| `/opt/cursor/artifacts/astral-elf-desk-390.png` | Mobile: «Звёздный шаг» 3, «Посох силы: заряды» 20/20, «Лёгкий арбалет +1» в руках |
| `/opt/cursor/artifacts/needs-choice-astral-1440.png` | Старый астральный без picks: banner «Астральное пламя · нужен выбор» + «Выбрать» |
| `/opt/cursor/artifacts/needs-choice-astral-390.png` | То же на 390 |
| `/opt/cursor/artifacts/baseline-fighter-1440.png` | Обычный воин без магпредметов — без gear-spell загрязнения |

Selfcheck:

- `npx tsx src/features/characters/staffOfPower.selfcheck.ts` → ok
- `npx tsx src/features/characters/gearCatalogRefresh.selfcheck.ts` → ok
- `npx tsx src/shared/dnd/raceSpellChoices.selfcheck.ts` → ok
- `npx tsx src/features/characters/needsSetup.selfcheck.ts` → ok

Регресс UI kit lock (md5 = `main`):

- `frontend/src/index.css` → `31936aa1fd5709718ed05a8ebf707f2d`
- `frontend/src/styles/26-lobby-hub-lock.css` → `0e69be021d061d701ec041f404370f75`

`npm run build` (frontend) — зелёный.
