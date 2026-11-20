# P24-M02-bard — вердикт независимого проверяющего (Доправка 1)

Ветка: `cursor/edition-p24-m02-bard` (поверх `cursor/edition-p24-m02-druid`, tip druid `8a29f5d5`). PR **#511**. Проверяющий — не автор.
ТЗ: `pack-P24-M02-bard.md`. Предыдущий вердикт: **нужна доправка**. PR не мержил, не деплоил, не закрывал.

## Вердикт: **принято**

Доправка 1 закрыла блокеры и высокие дыры прошлого REVIEW. Оставшиеся «частично» — только эффекты на карте боя без симулятора (п.9 ТЗ); они **не блокируют** приёмку по запросу Игоря на Доправку 1.

## Чек-лист прошлого REVIEW (#1–#14) после Доправки 1

| # | Было | Сейчас | Как проверил |
|---|------|--------|--------------|
| 1 | 9 упавших p24-тестов имён | **закрыто** | `pytest` C02/C03/C10/C12/N01 → **61 passed** |
| 2 | Магические тайны create-at-10+ только Бард | **закрыто** | `CreateCharacter2024Page` 4 списка + hint; бэкенд `_validate_bard_magical_secrets_prepared_2024` + cap; pytest create-at-11/at-9; скрины `fixup1/secrets-create-at-11-*` |
| 3 | Откат 10→9 не снимает off-list | **закрыто** | `_rollback_bard_state` + `SheetIdentityDialog` filter `isOffBardList2024`; pytest `test_rollback_10_to_9_drops_off_list_prepared_spells`; скрины `leveldown-sheet-10-to-9-*` (лист) |
| 4 | Нет стороны цели БВ | **закрыто** | `bardicInspirationTarget2024.ts`, grant → `pendingAllyBuff` в `SheetDialogsResources`, spend after fail в rolls/ActiveEffects; чипы КД/урон у Valor; скрины `bi-grant-ally-chip-*`, `bi-spend-after-fail-*` |
| 5 | Нет REPORT / PR | **закрыто** | `p24-m02-bard-REPORT.md` обновлён; PR #511 открыт |
| 6 | Нет живых скринов обязательных механик | **закрыто** | `fixup1/` — 46 PNG: Jack, Countercharm, Superior, Words, dance AC/урон, Valor armor, L14, resource summaries, leveldown листа |
| 7 | Обрезка подписей «Боевое вдохновение» | **закрыто** | `VALOR_COMBAT_INSPIRATION_MODES_2024` → «КД (реакция)» / «Урон атаки» (старый PNG до fixup1 не переснимали) |
| 8 | Карточки-ресурсы только имя | **закрыто** | `fixup1/resource-summary-*`: полный текст БВ / Чарующей магии / Мантии величия |
| 9 | Пробелы pytest | **закрыто** | dwarf HP, PB, heroic≠BI, multiclass slots, secrets create/reject/rollback; suite **86 passed** |
| 10 | Words 2-я цель только текстом | **закрыто** | `CastSpellDialog` + `wordsOfCreationSecondTarget2024`; скрины `words-second-target-cast-*` (Цель 1 / Цель 2) |
| 11 | Нет замены одного заговора | **закрыто** | `evaluateBardCantripChange2024` + `bardPreparedGuard` / `BARD_CANTRIP_SWAP_PICK_ID_2024` |
| 12 | «Дополнительная атака» в ленте | **закрыто** | `Bard2024CombatBlock`: «Доп. атака (Доблесть)» |
| 13 | Порядок карточек подкласса выше L1 | **не блокер** | косметика; на L14-скрине порядок всё ещё смешанный, механику не ломает |
| 14 | Регресс 390 без объяснения | **закрыто** | `p24-m02-bard-REGRESSION-2014-390.md`; пересчёт: 12 px, max Δ10 — AA |

## Что проверил лично в этом проходе

### 1. Сторона цели БВ
- Код: grant пишет `patches.grantedDieLabel` → `SheetDialogsResources` ставит `pendingAllyBuff` (`edition: '2024'`, `combatInspiration` для Доблести); `b04BuffSpecs` вешает `after_failed_d20` (+ КД/урон у Valor); `spendBardicInspirationOnTarget` списывает эффект.
- Скрины Read: на «Союзник Тордек» чип «Бардовское вдохновение 1к8» (+ «КД 1к8» / «Урон 1к8»); диалог после провала «Атлетика» — «Прибавить 1к8» (1440 и 390).
- Selfcheck `bardicInspirationTarget2024.selfcheck.ts` — ok.

### 2. Магические тайны create-at-10+
- Фронт: при `bard >= 10` `preparedListSlugs = bard/wizard/druid/cleric`, подсказка «Магические тайны: списки…».
- Бэкенд: off-list ниже 10 — отказ; с 10 — cap; откат 10→9 чистит known.
- Скрины: create-at-11 пикер с «Огненный шар»; на листе «Огненный шар» подготовлен (1440/390).

### 3. Слова Творения — 2-я цель
- `CastSpellDialog`: при bard≥20 и power-word-heal/kill — `targetCount=2`, note `WORDS_OF_CREATION_SECOND_TARGET_NOTE_RU_2024`, поля «Цель 1» / «Цель 2».
- Скрины `words-second-target-cast-1440/390` это подтверждают.

### 4. Прочее из Доправки 1
- Resource summaries с правилами (не заглушка-имя).
- Dance: КД «Защита без доспехов» = 14 (10+Лов+Хар через base 12+DEX); «Бардовский урон … 1к6+2 дробящего».
- Valor: средний доспех + щит экипированы; у не-Valor средних/щита нет (скрины fixup1).
- Countercharm: реакция, без траты вдохновения, 30 фт., Преимущество.
- Superior Inspiration: тост «…теперь 2» при инициативе L18.
- Jack: на L5 Analysis/Investigation +1 при INT 0 = ⌊БВ/2⌋ (код + selfcheck; скрин слабее как визуальный якорь, но не блокер).
- Level-down на листе 10→9 / 3→2 сняты в UI (`leveldown-sheet-*`).

### 5. Регресс 2014 @390
Документ AA принят. Личный пересчёт before/after: **12** изменённых пикселей, max channel Δ **10**, гистограмма `{1:7, 6:1, 10:4}` — совпадает с REPORT/AA-доком. Остальные пары по отчёту IDENTICAL.

## «Частично», которые остаются — не блокируют приёмку

Только п.9 ТЗ (без боевого симулятора карты):
- перемещение «Вдохновляющих движений» / «Мантии вдохновения» по клеткам;
- автотриггер реакции Контрчар / Острых слов / Несокрушимого величия на чужой бросок на поле;
- распространение «Ведущего уклонения» по позициям в 5 фт.;
- выбор второй цели Words **на карте** (в диалоге каста — уже есть).

Кнопки, пулы, формулы, подготовка, бейджи, тексты карточек за «частично» не прячутся. **Блокирующих «частично» по Доправке 1 нет.**

## Запущено

- `cd backend && python3 -m pytest tests/test_p24_m02_bard.py -q` → **86 passed**
- ранее упавшие каталоги имён → **61 passed**
- selfchecks: `bardicInspirationTarget2024`, `bard2024Features`, `bardSecrets2024` → ok
- Alembic: одна голова `p24m03pr01`
- Playwright e2e заново не гонял; проверял код + готовые PNG в `/opt/cursor/artifacts/p24-m02-bard/fixup1/`

## Итог

Пачка готова к вливанию **после #505**, по явному ок Игоря. Не мержить и не деплоить из этого ревью.
