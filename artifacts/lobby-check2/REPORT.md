# Повторный независимый аудит PR #414 (после M1–M9)

**Дата:** 2026-11-15  
**Ветка:** `cursor/lobby-fix-298b` @ `0c318ca00f9f4e1ed6451428940bfdcca69d85fc`  
**База:** `origin/main` @ `0034daf30d6d0205a71ea87ee248cedd2e7c724c`  
**PR:** https://github.com/igorpogulaev485-code/Dvarf/pull/414  
**Авторский отчёт фиксов:** `docs/audit/LOBBY-AUDIT-FIX-M1-M9.md`  
**Первый аудит:** `artifacts/lobby-check/REPORT.md` (вердикт «нельзя»)  
**Аудитор:** Auto (независимо; кадры автора не использовались как доказательство)  
**Правки продукта:** не вносились. Прод не трогался. В `main` не мержили.

---

## Вердикт

# **можно**

Канонические блокеры **M1–M9** с первого аудита закрыты живой проверкой (браузер + API). Ветка **0 коммитов позади** `main`, **18 впереди**. Полный `pytest` / `build` / selfchecks / одна голова Alembic / PRINT-14 — зелёные. Регресс 17 (+1) live API-сценариев — **18/18 PASS**.

Остаточные замечания — **INFO / soft UX**, не блокеры мержа (см. ниже).

---

## Матрица M1–M9

| ID | Тема | Статус | Как проверено | Кадры / логи |
|---|---|---|---|---|
| **M1** | «← предыдущий ход» в UI | **PASS** | Playwright: кнопка видна + клик; API `action=prev` откатывает active_index | `03-combat-toolbar-1440.png`, `05-after-prev-1440.png`; API `initiative_roll_remaining_prev_api_new_fight` |
| **M2** | «Благочестие ±» без бога/score (MOT) | **PASS** | UI: кнопка на карточках; API first award → score=1 | `01-filled-desk-1440.png`, `26-player-companions-death-saves.png` (кнопка «Благочестие ± 1»); API `piety_backend_first_award` |
| **M3** | XP-тост только получателю + `per_recipient` | **PASS** | Dual-client: watcher только по toast-узлам (не лента). Игрок: `+40 опыта`; игрок-2: пусто. API `per_recipient` | `16-xp-toast-player.png`, `17-xp-toast-player2.png`; `api-logs/ui_focused.json` |
| **M4** | Таймер реакции сбрасывается на новую реакцию | **PASS** | Dual-client: после 2-го удара `seconds_left=8`, диалог не сорван старым таймером | `13-reaction-dialog-player.png`, `15-reaction-timer-after-second-hit.png` |
| **M5** | «Нет» / «Пропустить» без cid | **PASS** | UI «Нет реакции»; API `set_waiting_reaction` без cid очищает флаг; автопропуск закрывает диалог | `13`–`15`, `14-master-waiting-reaction.png`; API `m5_skip_waiting_reaction_without_cid` |
| **M6** | `character_ids: []` → 0 seats | **PASS** | Live API: empty seats=0, filled seats при явном списке | `session_create_empty_character_ids_seats_nobody` |
| **M7** | Свой НПС без CR не 400 | **PASS** | Live API: без CR ok; CR1 → xp 200 | `custom_npc_cr_optional_and_xp_from_table` |
| **M8** | `selfcheck:uikit-no-overrides` | **PASS** | Команда EXIT:0 | `frontend-selfchecks.log` |
| **M9** | `selfcheck:enemy-pack-roster` | **PASS** | Команда EXIT:0 | `frontend-selfchecks.log` |

---

## П.3 — Напарники (death saves 2014 + путаница «Волк»)

| Проверка | Статус | Факт |
|---|---|---|
| Зверь-напарник: UI «Успехи/Провалы» | **не нужны и не показываются** — **PASS** | Даже при **0/11 HP** нет death-save pips. По 2014 зверь/существо при 0 хитах обычно выбывает/умирает без death saves (это механика героев). Продукт согласован с правилами. |
| Сюжетный спутник: death saves | **PASS** | Есть «Успехи» / «Провалы» |
| Подпись «Волк-напарник · ход хозяина» | **PASS** (при корректном `initiative_mode=with_master`) | Отдельной строки инициативы у зверя нет; подпись под хостом. Кадр `27-initiative-host-label.png` |
| Путаница с вражеским «Волк» | **PASS с INFO** | При `with_master` зверь не отдельный ход; враг «10 Волк · Враги» — отдельная строка. Имена похожи, но роли различаются (`· ход хозяина` vs `Враги`). Soft UX: при желании переименовать врага/зверя. |
| Кадры автора `m-table-companions-hp` ≡ `m-piety-button` | **подтверждено как ошибка съёмки автора** | Наши независимые кадры `26` / `27` / `23` **побайтно разные**. Ранние `01≡02`, `03≡04` в этом прогоне — тоже дубль харнесса (отмечено); доказательные кадры — `16–17`, `23–27`, `13–15`. |

**Замечание (INFO, не блокер):** запись companions через `PATCH /characters` с snake_case `initiative_mode` в sheet **не** мапится бэкендом (ждёт camelCase `initiativeMode`) → на seat приходит `initiative_mode: null` → seed боя вставляет **отдельную** строку (safe default). UI/API создания спутника (`SeatCompanionCreate` / лист с `initiativeMode`) работают. В первом UI-кадре `04` как раз был null-mode → «Волк» рядом с «Волк-напарник» без «ход хозяина».

---

## П.4 — «Награды → Добыча» на 390, обрезка футером

| Проверка | Статус |
|---|---|
| Открытие «Ещё» → «Добыча» на 390 | **PASS** (`DetailsMenu` summary, не `<button>`) |
| Под «Сундук пуст» кнопки обрезаны футером? | **ОПРОВЕРГНУТО — PASS** |

Метрики (Playwright): body scrollable (`scrollHeight` 712 > `clientHeight` 538); «Выдать» / «Положить на стол» под пустым сундуком **выше** футера (`footerTop≈628`), `underFooter=false`, `occluded=[]`. Кадры: `22-rewards-loot-390.png`, `23-rewards-loot-390-scrolled.png`, `24-rewards-loot-390-dialog.png`.

---

## П.5 — Синхрон с main / PRINT-14 / полный набор проверок

| Проверка | Результат |
|---|---|
| `origin/main...HEAD` | **0 позади / 18 впереди** (было 22/14 на первом аудите) |
| Tip | `0c318ca0` — `fix(lobby): audit M4–M5 — reset reaction timer, skip without cid` |
| `alembic heads` | **одна:** `p14spelru9a1b2` |
| `pytest` | **387 passed**, 21 warnings |
| `npm run build` | **OK** (в т.ч. `ClassicPrint2024-*.js`) |
| `selfcheck:uikit-no-overrides` | OK |
| `selfcheck:enemy-pack-roster` | OK |
| `selfcheck:uikit02-polish` | OK |
| `selfcheck:ux-sc05-gm-toolbar` | OK |
| `classicPrint14.selfcheck` | **OK** — лист/печать 2014 не сломаны этим срезом |
| Лист sync (HP/cond/XP/inv) | **PASS** (live API + concurrent patch) |

Логи: `pytest-full.log`, `npm-build.log`, `frontend-selfchecks.log`, `alembic-heads.txt`.

---

## П.6 — Регресс 17 live-сценариев (+ расширения)

Источник: `artifacts/lobby-check2/scripts/live_api_audit_v2.py` → `api-logs/live_api_results.json`.

| # | Сценарий | Статус |
|---|---|---|
| 1 | bootstrap join / код / observer | **PASS** |
| 2 | invite meta требует auth | **PASS** |
| 3 | session create `character_ids:[]` → 0 seats | **PASS** |
| 4 | setting attach | **PASS** |
| 5 | custom NPC CR optional + XP table | **PASS** |
| 6 | enemy pack 1 POST → 1 card ×3 | **PASS** |
| 7 | initiative roll / remaining / prev / new fight | **PASS** |
| 8 | damage / heal / temp / death / sheet sync | **PASS** |
| 9 | M5 skip waiting_reaction без cid | **PASS** |
| 10 | conditions lobby→sheet | **PASS** |
| 11 | XP award persists + `per_recipient` | **PASS** |
| 12 | inventory grant coins/items | **PASS** |
| 13 | party short rest | **PASS** |
| 14 | concurrent lobby→sheet patch | **PASS** |
| 15 | piety backend first award | **PASS** |
| 16 | companions beast+story | **PASS** |
| 17 | player/observer permissions | **PASS** |
| 18 | session close → journal | **PASS** |

**Итого API: 18 PASS / 0 FAIL.**

### Dual-client UI (мастер + игрок + игрок-неполучатель)

| Сценарий | Статус |
|---|---|
| XP-тост только получателю | **PASS** (после фильтра toast-DOM; первая попытка ловила ленту — ложный FAIL) |
| Реакция: диалог / «Нет» / таймер / автопропуск | **PASS** |
| У игрока нет кнопки «Бой» | **PASS** |

---

## Регресс матрицы первого аудита (17 продуктовых тем)

| # | Тема | Было | Стало |
|---|---|---|---|
| 1–5 | invite / seats / session / setting / initiative | PASS | **PASS** |
| 6 | Prev-ход UI | **FAIL (M1)** | **PASS** |
| 7 | враги / CR | PASS / FAIL M7 | **PASS** |
| 8 | реакции | PASS / FAIL M4–M5 | **PASS** |
| 9–10 | урон / состояния | PASS | **PASS** |
| 11 | напарники | NOT TESTED | **PASS** (+ INFO по именам) |
| 12 | XP toast | FAIL M3 | **PASS** |
| 13 | награды/добыча UI 390 | NOT TESTED | **PASS** (обрезка опровергнута) |
| 14–18 | rest / close / rights / sheet / concurrent | PASS | **PASS** |
| — | M8/M9 selfchecks | FAIL | **PASS** |
| — | sync с main | 22 behind | **0 behind** |

---

## Кадры (канон этого прогона)

Каталог: `artifacts/lobby-check2/screenshots/`

| Файл | Содержание |
|---|---|
| `03` / `05` | Бой: «← предыдущий ход», «Следующий ход» |
| `13`–`15` | Реакция игрока, мастер waiting, таймер после 2-го удара |
| `16` / `17` | Dual XP: получатель vs неполучатель |
| `22`–`24` | Награды→Добыча на 390, «Сундук пуст», кнопки над футером |
| `25`–`26` | Напарники на столе (зверь 0 HP без death saves; сюжетный с pips) |
| `27` | Инициатива: «Волк-напарник · ход хозяина» под хостом; враг «Волк» отдельно |

Не использовать как proof: `01≡02`, `03≡04`, `18≡19` (дубли харнесса); `09`/`19` ранние — не диалог добычи.

---

## Итог для Игоря

1. **Можно мержить** PR #414 в `main` с точки зрения повторного аудита M1–M9 и регресса live-сценариев.  
2. Деплой / merge — только по вашей команде (прод не трогали).  
3. Soft follow-up (не блокер): (а) похожие имена «Волк» / «Волк-напарник» в ленте; (б) при желании принимать snake_case `initiative_mode` в sheet-парсере так же, как camelCase.
