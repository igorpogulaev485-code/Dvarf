# LOBBY-FIX — правки по аудиту LOBBY-AUDIT (PR #413)

**Дата:** 2026-11-15  
**Ветка:** `cursor/lobby-fix-298b`  
**База:** `main`  
**Приложение:** локальный Vite `:5173` + API `:8000`, сиды `uikit03@example.com` / `player02@example.com`  
**Правила:** только UI-кит; лист / печать / тур / шапку листа не трогали. D&D 5e 2014. В `main` не мержить.

Аудит «до»: `docs/audit/LOBBY-AUDIT.md`, кадры `docs/audit/frames/lobby/` (ветка `cursor/lobby-audit-849b`).

---

## Решения Игоря

| Решение | Как сделано |
|---------|-------------|
| Реакция: «Нет реакции» + автопропуск ~10 с | `ReactionPromptDialog` — secondary «Нет реакции», отсчёт; у мастера на треке кнопка skip. |
| Урон герою открывает диалог игроку | `patch_seat_combat`: выставляет `waiting_reaction` **и** `reaction_character_id` + hint. |
| «Бросить за оставшихся» без автотаймера | `CombatInitiativeRequest.mode=roll_remaining`; кнопка на `CombatTrack`. |
| Свой НПС: обязательное ПО → XP 2014 | `combatant_cr_required`; `xp_from_cr`; Select ПО в `AddCombatantDialog`. |
| Хиты: мастеру цифры, игрокам по L-08 | без смены контракта скрытности; на карточке стола — `x/макс`. |

---

## Пачки A–E

| Пачка | Сделано |
|-------|---------|
| **A** | Реакция не зависает; «Урон»/«Лечение» равного веса + «Введите число» при пустом. |
| **B** | «Завершить бой» → `pending_rewards.xp_pool` из ПО/XP поверженных; тост/лента «+N XP»; сундук в «Награды». |
| **C** | Создание сессии: пустой список мест → все из состава; «Кто пришёл» — правка. |
| **D** | Скелетон стола вместо голого «Загрузка…»; «Назад» / «⋯» ≥44px на 390. |
| **E** | `/join` и карточка: раса · класс · уровень · HP из листа (fallback summary). |

---

## Визуал 1–13

| # | Статус |
|---|--------|
| 1 | «Назад» китовая кнопка на столе |
| 2 | Заголовок = имя лобби/сессии |
| 3 | Шапка одна строка; бой: «Следующий ход» + «Завершить»; остальное в «Ещё» |
| 4 | Плашка «С телефона…» убрана |
| 5 | Хиты x/макс, бейджи словами, «Временные хиты» |
| 6 | Правая колонка свёрнута по умолчанию |
| 7–10 | «Награды»: короткая подсказка, китовые селекты, монеты словами, категория одной, disabled с причиной |
| 11–12 | `/join`: подзаголовок без «→», правила ровными строками |
| 13 | Правила кампании: ToggleChip, редкие свёрнуты, служебные тексты убраны |

---

## Кадры after (настоящее приложение)

Каталог: `/opt/cursor/artifacts/lobbyfix/` (+ копии `docs/audit/frames/lobby-fix/`).  
**28 кадров, 28 уникальных md5** (без дублей под разными именами).  
Скрипты: `frontend/scripts/lobby-fix-capture.mjs`, `frontend/scripts/lobby-fix-capture-extra.mjs`.

| Кадр | md5 | Зачем |
|------|-----|--------|
| `m-hub-after-1440.png` | `a95219a8e24864087b09451f91b10ff0` | хаб мастера после |
| `m-hub-after-390.png` | `602d50bd886b7d893ce232bdc6233deb` | хаб 390 |
| `m-campaign-rules-1440.png` | `95bd7cf77c9caff838262e475172e49d` | правила кампании (ToggleChip) |
| `m-campaign-rules-390.png` | `4eebc246f5b5e12490c3722fac54862a` | правила 390 |
| `p-join-1440.png` | `99155bb8c2d9aa5f5a64376e4a3b2739` | вход по коду; сводка персонажа |
| `p-join-390.png` | `3ab47cdc6a81e8b94da8e08297bf2582` | join 390 |
| `m-session-loading-390.png` | `eb576bd853d9542ab4627eff479ac0f7` | скелетон загрузки |
| `m-session-empty-1440.png` | `c680122c2c9fddf113a6222be5efca38` | стол: Назад, имя, урон/лечение |
| `m-session-empty-390.png` | `d3c0fe252b4540de82394e331bdd7705` | стол 390 |
| `m-session-empty-760.png` | `ea2e9ac8a1bed678ca1daf4b9aaf0180` | стол 390×760 |
| `m-custom-npc-cr-1440.png` | `d74fca52c01964c70690379586b9084a` | свой НПС + ПО → 50 XP |
| `m-custom-npc-cr-390.png` | `830539b24a540f0d1488ce084910afe1` | CR dialog 390 |
| `m-combat-pending-init-1440.png` | `83f9d5a2e09cedab853a2ffa62597358` | бой, ожидание инициативы |
| `m-combat-pending-init-390.png` | `49bd2a62466e387691d2e48fe9074a25` | pending init 390 |
| `m-after-roll-remaining-1440.png` | `aa9bccab63bb8c8461c72ca5d13d6dac` | после «Бросить за оставшихся» |
| `m-after-roll-remaining-390.png` | `a7be2dd3821edcc61f429fbcf444b598` | roll remaining 390 |
| `p-combat-live-1440.png` | `7c2d643617f3125fb6ccc4cbf8820a0f` | стол игрока в бою |
| `p-combat-live-390.png` | `010b7daed28730c7c747970afc9c5c1e` | игрок бой 390 |
| `m-damage-empty-1440.png` | `4724d2fb06cdd1f2351bafaaa39814b0` | «Введите число» |
| `m-damage-empty-390.png` | `68e4571573f7f8f93d68870e2e79cfcc` | empty damage 390 |
| `m-waiting-reaction-1440.png` | `e0f7452a922c938bbbfb5b4f82065155` | мастер: ждём реакцию |
| `m-waiting-reaction-390.png` | `eb104d58b74408cc1b1f6aeb64c68ffc` | waiting 390 |
| `p-reaction-1440.png` | `6a5f0e38ff39ec9fb7af1d50212cd6c0` | диалог «Есть ли реакция?» + отсчёт |
| `p-reaction-390.png` | `cdbbda6702e4ac825d3ce31fd31f79e6` | реакция 390 |
| `m-rewards-after-end-1440.png` | `70457d2f7f7e378a3b0d457cd460cdba` | награды: пул 100 XP из CR 1/4×2 |
| `m-rewards-after-end-390.png` | `022b6f121e0d202d5a82ab43be53d5c1` | награды 390 |
| `p-after-xp-1440.png` | `c247f65b4901fa99693f6a2527b5d4de` | игрок: +100 XP в ленте |
| `p-after-xp-390.png` | `e08f3d881675af2899a5143b4793ea75` | after XP 390 |

Кадры «до» — в `docs/audit/frames/lobby/` (аудит).

---

## Проверки

- `npm run build` (frontend) — ок  
- `npx tsx` lobbyVisualLv01–06, uxSc05GmToolbar — ок  
- `python3 -m pytest tests/test_lobby_fix_initiative_xp.py` — 4 passed  
- `python3 -m alembic heads` — одна голова `onb03usr9c2e1`

## Вопросы / не в scope

- На хабе лобби остаётся текстовая ссылка «← Все лобби» (не стол сессии; визуал 1 касался шапки **стола**).  
- Лист / печать / тур / шапка листа — не менялись.  
- Тост «в сундуке N предметов» виден только если в сундуке есть предметы; в кадре после XP — пустой сундук + запись опыта в ленте.
