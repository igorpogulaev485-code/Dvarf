# Отчёт: доработка по аудиту PR #414 (M1–M9 / пункты 1–7)

Ветка: `cursor/lobby-fix-298b` · PR #414 · **в `main` не мержили, не деплоить.**  
Кадры: `/opt/cursor/artifacts/lobby-audit-fix/` (по 1440 и 390).  
Полный `lobby-check/REPORT.md` агента `bc-513bc693` из этой среды недоступен — закрывали явный список Игоря (1–7) как M1–M9.

---

## M1 / п.1 — «← предыдущий ход»

**Сделано.** Кнопка в тулбаре мастера при активном бое (`action: 'prev'`). Подпись CombatTrack согласована.

| Кадр | Путь |
|------|------|
| 1440 | `/opt/cursor/artifacts/lobby-audit-fix/m-combat-prev-turn-1440.png` |
| 390 | `/opt/cursor/artifacts/lobby-audit-fix/m-combat-prev-turn-390.png` |

---

## M2 / п.2 — «Благочестие ±» без бога/очков

**Сделано.** Кнопка, если `allowed_sources` содержит `mot` **или** уже есть `piety_god` / `piety_score`. First-award на бэке без изменений.

| Кадр | Путь |
|------|------|
| 1440 | `/opt/cursor/artifacts/lobby-audit-fix/m-piety-button-1440.png` |
| 390 | `/opt/cursor/artifacts/lobby-audit-fix/m-piety-button-390.png` |

(На кадре партии также виден «Волк-напарник» — тот же crop карточки.)

---

## M3 / п.3 — XP-тост только получателям + `per_recipient`

**Сделано.** `SessionDetailPage` WS: тост только если свой `character_id` ∈ `payload.character_ids`; сумма из `per_recipient`, иначе fallback на `awarded_each`. Ref: `ownCharacterIdsRef`.

Кадров UI нет (событие WS); проверка кодом + pytest.

---

## M4 / п.4 — API: пустой `character_ids` и CR своего НПС

**Сделано.**
- `create_session`: `character_ids: []` → **никого** (не всем членам лобби).
- Свой НПС без CR: снят обязательный CR; в UI опция «— без ПО —».
- Тесты: `backend/tests/test_session_create_empty_character_ids.py`, правки в `test_lobby_fix_initiative_xp.py`.

На кадрах мастера: карточка **«Страж без ПО»** без значения ПО.

---

## M5 / п.5 — selfchecks uikit-no-overrides + enemy-pack-roster

**Сделано.** Убраны size-overrides с `.ui-button`; `enemyPackRoster` / `uikit02Polish` зелёные.

`npm run selfcheck:uikit-no-overrides` · `enemy-pack-roster` · `uikit02-polish` · `ux-sc05-gm-toolbar` — **ok**.

---

## M6 / п.6 — merge свежего `main`

**Сделано.** Merge `origin/main` (в т.ч. PRINT-14) без конфликтов.  
`python3 -m alembic heads` → одна голова: **`p14spelru9a1b2`**.

---

## M7 / п.7 — непроверенные аудитом + кадры

| Тема | Статус | Кадры |
|------|--------|-------|
| Подвал наград / «Ещё» на 390 | ok | `m-rewards-loot-{1440,390}.png`, `m-more-menu-{1440,390}.png` |
| Таймер реакции мастер + игрок | ok (мастер: «Ждём реакцию…», игрок: «Реакция · N с») | `m-reaction-timer-*`, `p-reaction-timer-*` |
| Напарники на столе | ok («Волк-напарник») | `m-table-companions-hp-*` (+ в piety crop) |
| Маскировка хитов игроку / мастеру цифры | ok (игрок: «Хиты · Здоров/Без сознания»; мастер: `N/M`) | `p-table-hp-mask-*`, `m-table-companions-hp-*` / prev-turn |
| XP-тост двум клиентам | код M3 | — |

---

## M8 — проверки

| Проверка | Результат |
|----------|-----------|
| `pytest` | **387 passed** |
| `npm run build` | **ok** |
| `alembic heads` | **одна** (`p14spelru9a1b2`) |
| selfchecks | **ok** |

---

## M9 — ограничения

- Текст аудита `bc-513bc693` / `artifacts/lobby-check/REPORT.md` здесь не читался.
- На кадрах реакции счётчик мог успеть дойти до `0 с` из‑за networkidle; строка таймера и различие мастер/игрок видны.

---

## Итог

Пункты **1–7 / M1–M9** закрыты в ветке PR #414. **В `main` не мержить, не деплоить.**
