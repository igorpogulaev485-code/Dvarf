# Отчёт: доработка по аудиту PR #414 (канонические M1–M9)

Ветка: `cursor/lobby-fix-298b` · PR #414 · **в `main` не мержили, не деплоить.**  
Источник M1–M9: `artifacts/lobby-check/REPORT.md` аудитора [bc-513bc693](https://cursor.com/agents/bc-513bc693-889a-5526-a32b-94ba1f1d57e9) (извлечено [Extract M1-M9 from audit](bc-4e6697ce-c57c-521f-885e-9d38363cf092)).  
Кадры: `/opt/cursor/artifacts/lobby-audit-fix/` (1440 + 390).

---

## M1 — «← предыдущий ход» в UI

**Сделано.** Кнопка в тулбаре мастера (`action: 'prev'`).

Кадры: `m-combat-prev-turn-1440.png`, `m-combat-prev-turn-390.png`.

---

## M2 — «Благочестие ±» без бога/очков

**Сделано.** Кнопка при `mot` в `allowed_sources` **или** уже есть `piety_god` / `piety_score`.

Кадры: `m-piety-button-1440.png`, `m-piety-button-390.png`.

---

## M3 — XP-тост только получателям + `per_recipient`

**Сделано.** WS: тост только если свой id ∈ `character_ids`; сумма из `per_recipient`.

---

## M4 — автопропуск реакции не должен срезать следующую

**Сделано.** `ReactionPromptDialog`: таймер зависит от `open` + `reactionKey` (character_id + hint). Новая реакция при уже открытом диалоге перезапускает отсчёт.

---

## M5 — «Пропустить» без `reaction_character_id` не noop

**Сделано.** Fallback: `patchSessionCombat({ action: 'set_waiting_reaction', waiting_reaction: false })` в обоих `CombatTrack` (desktop + mobile).

Кадры таймера: `m-reaction-timer-*`, `p-reaction-timer-*`.

---

## M6 — API: `character_ids: []` ≠ всем членам лобби

**Сделано.** Пустой список = никого не сажаем. Тест: `backend/tests/test_session_create_empty_character_ids.py`.

---

## M7 — API: свой НПС без CR не даёт 400

**Сделано.** CR/xp необязательны; UI — «— без ПО —». На кадрах: «Страж без ПО».

---

## M8 — selfcheck `uikit-no-overrides`

**Сделано.** Убраны page-level size-overrides `.ui-button`. Команда — ok.

---

## M9 — selfcheck `enemy-pack-roster`

**Сделано.** «Показать игрокам» + стабилизация SSR. Команда — ok.

---

## Дополнительно (п.7 списка Игоря)

| Тема | Кадры |
|------|-------|
| «Ещё» / награды на 390 | `m-more-menu-*`, `m-rewards-loot-*` |
| Напарники на столе | `m-table-companions-hp-*` |
| Маскировка хитов игроку | `p-table-hp-mask-*` (мастер — цифры на combat/companions) |

---

## Проверки

| Проверка | Результат |
|----------|-----------|
| `pytest` | **387 passed** |
| `npm run build` | **ok** |
| `alembic heads` | **одна** (`p14spelru9a1b2`) |
| selfchecks (uikit-no-overrides, enemy-pack-roster, uikit02Polish, ux-sc05) | **ok** |

## Итог

Канонические **M1–M9** закрыты. В `main` не мержить, не деплоить.
