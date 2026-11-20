# P24-M02-paladin — вердикт независимого проверяющего

Ветка: `cursor/edition-p24-m02-paladin` (поверх `cursor/edition-p24-m02-bard`, tip bard `57a970b1`). Tip пачки (продукт под ревью): `fecb9dd7`. Проверяющий — **не автор**.
ТЗ: `pack-P24-M02-common.md` + `pack-P24-M02-paladin.md` (блок **ИТОГОВЫЕ ИМЕНА**). Отчёт автора: [`p24-m02-paladin-REPORT.md`](./p24-m02-paladin-REPORT.md). PR не мержил, не деплоил, не закрывал.

## Вердикт: **принято**

Доправка 1 к PR #512 (Blessed Warrior → лист + «Оружейное мастерство» + артефакты) закрыта. Блокеров нет. PR **не мержить и не деплоить** здесь; вливать после **#511**.

---

## Повторное ревью (Доправка 1 к PR #512)

Проверяющий снова **не автор**. Источник: коммиты `b04ccd9e` / `fecb9dd7` (fix + e2e shots/REPORT). Задача: приёмка трёх пунктов Доправки 1 к #512.

### Вердикт: **принято**

### Чек-лист трёх пунктов

| # | Тема | Статус | Как проверил сейчас |
|---|------|--------|---------------------|
| 1 | Артефакты `artifacts/p24-m02-paladin/` 1440+390 | **ok** | Пары create-at-1/5/11; levelup 4→5 и 10→11 (модал «Повышение уровня» + sheet-after); leveldown 20→19 / 11→10 / 3→2; Glory@7 «Аура рвения»; Ancients@7 «Аура опеки»; Devotion@20 «Священный нимб»; LoH «Восстанавливающее касание»; Radiant «+ 1к8 излучением»; regression-2014 before/after md5 — **хеши PNG совпадают** (before==after content); top-level 63 базы, 0 неполных пар |
| 2 | Blessed Warrior end-to-end | **ok** | `edition_2024_create.py`: validate ровно 2 cleric cantrips; `_sync_blessed_warrior_picks` зеркалит `fighting_style_paladin` + cantrips (underscore+kebab); known spells always-prepared CHA; pytest `test_create_paladin_blessed_warrior_*` ассертит **sheet** (не только wizard); e2e `create-at-5 blessed warrior` — feature_picks + known Указание/Священное пламя; `blessedWarrior.ts` sync |
| 3 | Паладин-only «Оружейное мастерство» | **ok** | Create2024Picks / preview / DetailPanel / validation (`createPipeline2024State`) / LevelingForks: `slug === 'paladin'` → «Оружейное мастерство», иначе «Мастерство оружия»; OCR step3 create-at-1: «Оружейное мастерство (2/2)»; e2e expect на create |

### Что закрыто (подтверждено лично)

1. **Артефакты** — все требуемые пары на месте; PNG OCR: Glory «Аура рвения», Ancients «Аура опеки», Devotion@20 «Священный нимб» (390), LoH Restoring Touch, Radiant +1к8, levelup modal «Повышение уровня».
2. **Blessed Warrior** — create валидирует 2 cantrips; feature_picks оба spelling; sheet.known prepared/locked CHA; тесты смотрят sheet.
3. **Мастерство** — create UI паладин ≠ fighter/ranger/barbarian label.

### Запущено в этом проходе

- `cd backend && python3 -m pytest tests/test_p24_m02_paladin.py -q` → **57 passed**
- `cd frontend && P24_E2E_PORT=5191 npm run test:e2e:p24-m02-paladin` → **40 passed** (0 failed), ~8.6m; desktop-1440 + phone-390, в т.ч. blessed warrior / create-at-1/5/11 / Glory / Ancients / levelup / leveldown / Radiant / Restoring / 2014
- Личный просмотр PNG (Read/OCR): glory-aura-alacrity-1440, create-at-1-step3-mastery-1440, ancients-features-1440, loh-restoring-touch-1440, radiant-formula-1440, devotion-capstone-390, levelup-4to5-features-1440
- Регенерацию PNG от прогона e2e **не коммитил** (откат `git checkout -- artifacts/…`); в коммите только этот REVIEW

### Итог

Дыр из минимума Доправки 1 к #512 нет. Приёмка — **принята** (мерж по-прежнему после #511, не этим агентом).

---

## Повторное ревью (Доправка 1b) — архив

Проверяющий снова **не автор**. Источник: REPORT §«Доправка 1» строки 7–8 + коммит `d8b05c73`. Playwright заново не гонял; лично сверил код, PNG (OCR) и pytest.

### Вердикт: **принято**

### Чек-лист двух дыр Доправки 1

| # | Тема | Статус | Как проверил сейчас |
|---|------|--------|---------------------|
| 1 | `Paladin2024UseDialog` — Обет вражды | **ok** | `CHANNEL_OPTION_TEXT['vow-of-enmity']` = «при действии Атака … в 30 фт. (1 мин.)»; слова «бонусное» у этого ключа нет (у inspiring-smite / peerless-athlete — корректно остаётся) |
| 2 | Glory@7 «Аура рвения» на PNG | **ok** | focused shot `create-at-7-glory-aura-alacrity-1440/390`: OCR «Аура рвения», «Клятва славы», «+скорость вам»; + `auraOfAlacritySpeedBonusFt2024` → +10 в `useSheetEditorPart2` только для edition 2024 |

### Что закрыто (подтверждено лично)

1. **Диалог Обета вражды** — diff `d8b05c73` заменил «(1 мин., бонусное)» на «при действии Атака — … в 30 фт. (1 мин.)». Текущий файл совпадает.
2. **Скрин Glory@7** — карточка «Аура рвения» (L7, подкласс, пассив) видна на 1440 и 390; e2e снимает focused shot после scroll/expand.
3. **+10 скорости** — `auraOfAlacritySpeedBonusFt2024` + wiring в `displaySpeedAuto`; selfcheck `aura_of_alacrity` → 10, чужой id → 0.

### Запущено в этом проходе

- `cd backend && python3 -m pytest tests/test_p24_m02_paladin.py -q` → **56 passed**
- Личный просмотр + OCR `create-at-7-glory-aura-alacrity-*`; чтение `Paladin2024UseDialog.tsx` / `paladin2024Features.ts` / `useSheetEditorPart2.ts`
- Playwright / `npm run build` / alembic заново не гонял

### Итог

Дыр из минимума REVIEW нет. Приёмка по слайсу — **принята** (мерж по-прежнему после #511, не этим агентом).

---

## Повторное ревью (Доправка 1) — архив

Проверяющий снова **не автор**. Источник: REPORT §«Доправка 1 (закрыто)» + коммиты `ab81ec15` / `f6b72813`. Playwright заново не гонял; лично сверил PNG (в т.ч. OCR) и pytest.

### Вердикт повторного прохода: **нужна доправка**

### Чек-лист после Доправки 1

| # | Тема | Статус | Как проверил сейчас |
|---|------|--------|---------------------|
| 1 | Умения 1–20 + FINAL имена | **ok** | pytest; LoH Restoring Touch@14 PNG; Radiant в формуле; L18/L20 на create-at-20 (нимб на 390) |
| 2 | Клятвы Glory / Ancients / L20 | **частично** | Ancients@7: «Аура опеки» на PNG; Devotion@20: «Священный нимб» есть на **390**, на 1440 обрезан; **Glory@7: «Аура рвения» на PNG нет** |
| 3 | Ресурсы LoH / канал / free smite/steed | **ok** | без регресса с первого прохода |
| 4 | create-at-1 / 5 / 11 | **ok** | без регресса |
| 5 | Live 4→5 и 10→11 | **ok** | `levelup-4to5-features-*`: «Повышение уровня» + Доп. атака / Верный скакун; `levelup-10to11-*`: Сияющие удары; sheet-after с умениями |
| 6 | Live 20→19 / 11→10 / 3→2 | **ok** | before/after identity + sheet: L20→19 LoH 100→95, «Паладин 19»; L11→10 канал 3→2, Сияющих нет; L3→2 канал/клятва сняты, LoH 10/10 |
| 7 | Регресс 2014 | **ok** | без регресса |
| 8–12 | Divine Health / кара / бейджи / имена / флаг | **ok** | без регресса |
| 13 | §9 карта боя | **не блокер** | как в REPORT |
| — | Pytest rollback | **ok** | `test_rollback_3_to_2_*`, `11_to_10_*`, `20_to_19_*`, `2_to_1_*` |
| — | Обет вражды текст | **дыра** | catalog + `channelOptionFeed` исправлены; **диалог нет** |

### Что закрыто (подтверждено лично)

1. **Live прокачка 4→5 / 10→11** — модал «Повышение уровня» с именами умений; sheet-after с Доп. атакой / Сияющими ударами.
2. **Live откаты 20→19 / 11→10 / 3→2** — identity «−1» + sheet before/after; канал/капстоун/подкласс снимаются по смыслу скринов.
3. **Pytest rollback** — `cd backend && python3 -m pytest tests/test_p24_m02_paladin.py -q` → **56 passed** (было 52).
4. **Ancients@7** — OCR: «Аура опеки» на `create-at-7-ancients-features-1440`.
5. **Devotion@20** — OCR: «Священный нимб» на `create-at-20-devotion-capstone-**390**` (на 1440 список обрывается на «Эпический дар»).
6. **Restoring Touch** — `loh-dialog-restoring-touch-conditions-*`: блок «Восстанавливающее касание» + флажки состояний, пул 70/70.
7. **Radiant Strikes в формуле** — `radiant-strikes-attack-formula-*`: `+ 1к8 излучением` на строках атаки; канал 3/3.
8. **Catalog / feed Обета вражды** — `subclasses_ph24.json` `summary_ru` = действие Атака, 30 фт.; `channelOptionFeed` = «при действии Атака… 30 фт. (1 мин.)».

### Оставшиеся дыры

1. **`Paladin2024UseDialog.tsx` — «Обет вражды» всё ещё «бонусное».**  
   `CHANNEL_OPTION_TEXT['vow-of-enmity']` = «…(1 мин., **бонусное**)». Это тот же диалог траты канала, на который указывал первый REVIEW. Каталог и `channelOptionFeed` уже с «при действии Атака»; игрок при «Потратить…» снова видит неверную подпись. Нужна одна правка строки (+ при желании 30 фт.).

2. **Скрин Glory@7 без «Аура рвения».**  
   REPORT обещает `create-at-7-glory-*` с «Аура рвения». OCR по `…-glory-features-1440` и `…-390`: клятва славы и L3-опции канала есть, **строки «Аура рвения» нет** (tall-shot обрывается до пассивов L5–L7). Переснять так, чтобы на PNG была видна карточка «Аура рвения» (как у Ancients с «Аура опеки»).

### Запущено в этом проходе

- `cd backend && python3 -m pytest tests/test_p24_m02_paladin.py -q` → **56 passed**
- Личный просмотр + OCR PNG в `/opt/cursor/artifacts/p24-m02-paladin/` (level-up/down, glory/ancients/L20, LoH Restoring, radiant formula)
- Playwright / `npm run build` / alembic заново не гонял

### Итог повторного прохода

После правки текста в `Paladin2024UseDialog` и скрина Glory с видимой «Аура рвения» — можно снова звать проверяющего. Остальное из минимума первого REVIEW закрыто.

---

## Первый проход (архив)

Вердикт тогда: **нужна доправка**. Каркас 2024 (таблица, L1 без «Божественного чувства», канал с 3-го, имена FINAL, LoH бонусным, отдыхи, create-at-1/5/11, регресс 2014 md5, флаг закрыт) выглядел собранным; не хватало живых level-up/down, клятв 7/20, pytest rollback и был дефект текста «Обета вражды».

### Чек-лист первого прохода

| # | Тема | Статус тогда | Как проверил |
|---|------|--------------|--------------|
| 1 | Умения класса 1–20 (имена FINAL) | частично | pytest; create-at-1/5/11; нет L14/L18/L20 живых |
| 2 | 4 клятвы PHB | частично | live только Devotion@5/11 и Vengeance@5 |
| 3 | Ресурсы | ok | rests + LoH dialog |
| 4 | create-at-1 / 5 / 11 | ok | e2e + PNG |
| 5 | Live 4→5 / 10→11 | дыра | не было |
| 6 | Live откаты | дыра | не было |
| 7 | Регресс 2014 | ok | md5 пар |
| 8–12 | прочее | ok | как выше |
| 13 | §9 | не блокер | — |

### Дыры первого прохода (для истории)

1. Обет вражды — «бонусное» в catalog / feed / dialog.
2. Нет live откатов 20→19 / 11→10 / 3→2.
3. Нет live прокачки 4→5 / 10→11.
4. Нет живых Glory / Ancients / листов 7/15/20.
5. Нет pytest rollback.
6. Нет скрина Restoring Touch.
7. Нет скрина Radiant Strikes в формуле атаки.

pytest тогда: **52 passed**.
