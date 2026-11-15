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
| Реакция: «Нет реакции» + автопропуск ~10 с | `ReactionPromptDialog` — secondary «Нет реакции», отсчёт; у мастера на треке статус + «Пропустить». |
| Урон герою открывает диалог игроку | `patch_seat_combat`: выставляет `waiting_reaction` **и** `reaction_character_id` + hint. |
| «Бросить за оставшихся» без автотаймера | `CombatInitiativeRequest.mode=roll_remaining`; кнопка на `CombatTrack`. |
| Свой НПС: обязательное ПО → XP 2014 | `combatant_cr_required`; `xp_from_cr`; Select ПО в `AddCombatantDialog`. |
| Хиты: мастеру цифры, игрокам по L-08 | без смены контракта скрытности; на карточке стола — `Хиты x/макс`. |

---

## Пачки A–E

| Пачка | Сделано |
|-------|---------|
| **A** | Реакция не зависает; «Урон»/«Лечение» равного веса + «Введите число» при пустом. |
| **B** | «Завершить бой» → `pending_rewards.xp_pool` из ПО/XP поверженных; тост/лента «+N опыта»; сундук в «Награды». |
| **C** | Создание сессии: пустой список мест → все из состава; «Кто пришёл» — правка. |
| **D** | `SessionTableSkeleton` для чанка маршрута (`Suspense`) и данных сессии. |
| **E** | `/join` и карточка: раса · класс · уровень · HP из листа (fallback summary). |
| **E+** | `/join`: уровень ≠ старту лобби — warn-плашка (не danger); лист не меняем. |

---

## Доправка fix2 (после просмотра кадров)

| # | Правка | Статус |
|---|--------|--------|
| 1 | Скелетон стола для чанка + данных | ок |
| 2 | Тост «+N опыта» (+ «в сундуке N», если есть) | ок |
| 3 | Одна строка шапки: Назад · название · ⋯ | ок |
| 4 | Одна «Следующий ход»; у игрока «Твой ход» один раз | ок |
| 5 | Мастер: статус реакции в треке, без тоста | ок |
| 6 | Благочестие только при боге/очках; «Хиты»; сеттинг в ⋯; чипы только на активном ходе | ок |
| 7 | Чип наград контрастный; Бонус без обрезки | ок |
| 8 | `/join`: без висящего ⋯; warn-плашка уровня | ок |
| 9 | Кампания: без служебных текстов; кит-раскрывашка «Редкие правила» | ок |

### Кадры fix2 (до → после)

Каталог: `/opt/cursor/artifacts/lobbyfix/` (+ копии `docs/audit/frames/lobby-fix/`).

| Пункт | До | md5 | После | md5 |
|------|----|-----|--------|-----|
| 1 загрузка | `m-session-loading-fix2-before-390.png` | `eb576bd853d9542ab4627eff479ac0f7` | `m-session-loading-after-390.png` | `3093d2d7616111704e51498f4da0fccf` |
| 1 | — | — | `m-session-loading-after-1440.png` | `246f3b064adabc98da39580f5d94e5bf` |
| 2 XP-тост | `p-after-xp-fix2-before-390.png` | `e08f3d881675af2899a5143b4793ea75` | `p-after-xp-after-390.png` | `ef0afd273cab6b154e3772d807d45f30` |
| 2 | — | — | `p-after-xp-after-1440.png` | `0a57a32b943350535e97dfc8523c9094` |
| 3 шапка | `m-chrome-before-390.png` | `d3c0fe252b4540de82394e331bdd7705` | `m-chrome-after-390.png` | `6355e6be579a87f6d685da40e9e4fb43` |
| 3 | `m-chrome-before-1440.png` | `c680122c2c9fddf113a6222be5efca38` | `m-chrome-after-1440.png` | `a734a2d653ab11bbb87ebd6c18b7850e` |
| 4 ход | `p-your-turn-before-390.png` | `010b7daed28730c7c747970afc9c5c1e` | `p-your-turn-after-390.png` | `66bad335af38cadb8d2e4d31b282046a` |
| 4 | — | — | `p-your-turn-after-1440.png` | `a9197da1088bea06f2a6ae7907a798ea` |
| 4 мастер | (дубль Next) | — | `m-combat-after-390.png` | `15c1d1afe16b6a82eff08fa04bf59ed2` |
| 4 | — | — | `m-combat-after-1440.png` | `1d43b84f99eb43179d778b0eaeb44719` |
| 5 реакция | `m-waiting-reaction-fix2-before-390.png` | `eb104d58b74408cc1b1f6aeb64c68ffc` | `m-waiting-reaction-after-390.png` | `ab2c91421ead3f964dc10c067022b3e7` |
| 5 | — | — | `m-waiting-reaction-after-1440.png` | `062413ec65f3391e5a633d16b980ca32` |
| 6 карточка | `m-session-empty-fix2-before-390.png` | `d3c0fe252b4540de82394e331bdd7705` | `m-chrome-after-390.png` | `6355e6be579a87f6d685da40e9e4fb43` |
| 7 награды | `m-rewards-after-end-fix2-before-390.png` | `022b6f121e0d202d5a82ab43be53d5c1` | `m-rewards-after-390.png` | `c3d8a8ad820fbf5d2d6b23e4ebad6cd2` |
| 7 | — | — | `m-rewards-after-1440.png` | `4e7c93b6bcafe4a75659fb4af58bb267` |
| 8 /join | `p-join-fix2-before-390.png` | `3ab47cdc6a81e8b94da8e08297bf2582` | `p-join-warn-after-390.png` | `d59fcc9c3f6d4d540bc7e0be414eadb9` |
| 8 | `p-join-fix2-before-1440.png` | `99155bb8c2d9aa5f5a64376e4a3b2739` | `p-join-warn-after-1440.png` | `a420bf8e669b7046d88a4be756a19281` |
| 9 кампания | `m-campaign-rules-fix2-before-390.png` | `4eebc246f5b5e12490c3722fac54862a` | `m-campaign-rules-after-390.png` | `734ac079c78c410ed58157d1fc1dc848` |
| 9 | `m-campaign-rules-fix2-before-1440.png` | `95bd7cf77c9caff838262e475172e49d` | `m-campaign-rules-after-1440.png` | `8cbb2efc8437a47cad1284976166e925` |

---

## Визуал 1–13

| # | Статус |
|---|--------|
| 1 | «Назад» китовая кнопка на столе |
| 2 | Заголовок = имя лобби/сессии |
| 3 | Шапка одна строка; бой: «Следующий ход» + «Завершить»; остальное в «Ещё»/⋯ |
| 4 | Плашка «С телефона…» убрана |
| 5 | Хиты x/макс словом, бейджи словами, «Временные хиты» |
| 6 | Правая колонка свёрнута по умолчанию |
| 7–10 | «Награды»: короткая подсказка, китовые селекты, монеты словами, категория одной, disabled с причиной |
| 11–12 | `/join`: подзаголовок без «→», правила ровными строками; warn уровня |
| 13 | Правила кампании: ToggleChip, редкие кит-раскрывашкой, служебные тексты убраны |

---

## Кадры after (пакет A–E, до fix2)

Каталог: `/opt/cursor/artifacts/lobbyfix/` (+ копии `docs/audit/frames/lobby-fix/`).  
Скрипты: `frontend/scripts/lobby-fix-capture.mjs`, `frontend/scripts/lobby-fix-capture-extra.mjs`.

| Кадр | md5 | Зачем |
|------|-----|--------|
| `m-hub-after-1440.png` | `a95219a8e24864087b09451f91b10ff0` | хаб мастера после |
| `m-hub-after-390.png` | `602d50bd886b7d893ce232bdc6233deb` | хаб 390 |
| `m-custom-npc-cr-1440.png` | `d74fca52c01964c70690379586b9084a` | свой НПС + ПО → 50 XP |
| `m-custom-npc-cr-390.png` | `830539b24a540f0d1488ce084910afe1` | CR dialog 390 |
| `m-combat-pending-init-1440.png` | `83f9d5a2e09cedab853a2ffa62597358` | бой, ожидание инициативы |
| `m-combat-pending-init-390.png` | `49bd2a62466e387691d2e48fe9074a25` | pending init 390 |
| `m-after-roll-remaining-1440.png` | `aa9bccab63bb8c8461c72ca5d13d6dac` | после «Бросить за оставшихся» |
| `m-after-roll-remaining-390.png` | `a7be2dd3821edcc61f429fbcf444b598` | roll remaining 390 |
| `m-damage-empty-1440.png` | `4724d2fb06cdd1f2351bafaaa39814b0` | «Введите число» |
| `m-damage-empty-390.png` | `68e4571573f7f8f93d68870e2e79cfcc` | empty damage 390 |
| `p-reaction-1440.png` | `6a5f0e38ff39ec9fb7af1d50212cd6c0` | диалог «Есть ли реакция?» + отсчёт |
| `p-reaction-390.png` | `cdbbda6702e4ac825d3ce31fd31f79e6` | реакция 390 |
| `p-join-level-before-1440.png` | `b2f7c5dbfe8d6a5caf3ccac4ac6859a3` | E+: join до предупреждения |
| `p-join-level-before-390.png` | `71d8fb4964435538d776be7dd5c8b2d2` | E+: до 390 |
| `p-join-level-after-1440.png` | `bfd8a71535db599a81f4b9addcd96e22` | E+: ранний after (заменён warn в fix2) |
| `p-join-level-after-390.png` | `03f496a5d7a81332e00b6a9424c8b3cc` | E+: ранний after 390 |

Кадры «до» (аудит лобби) — в `docs/audit/frames/lobby/`.

---

## Проверки

- `npm run build` (frontend) — ок  
- `npx tsx` lobbyVisualLv04–05, lobbyFixJoinLevel — ок  
- `python3 -m pytest tests/test_lobby_fix_initiative_xp.py` — 4 passed (ранее)  
- `python3 -m alembic heads` — одна голова `onb03usr9c2e1`

## Вопросы / не в scope

- На хабе лобби остаётся текстовая ссылка «← Все лобби» (не стол сессии; визуал 1 касался шапки **стола**).  
- Лист / печать / тур / шапка листа — не менялись.  
- Тост «в сундуке N предметов» виден только если в сундуке есть предметы; в кадре после XP — пустой сундук + «+100 опыта».
