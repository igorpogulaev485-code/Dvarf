# LOBBY-TOUR-2 — тур лобби под влитый #414 (main)

**Дата:** 2026-11-15  
**Ветка:** `cursor/lobby-tour-2`  
**База:** свежий `main` (после merge #414)  
**Issue:** #439  
**Основа переноса:** PR #415 / ветка `cursor/lobby-tour-dab0`  
**Приложение:** локальный Vite `:5173` + API `:8000`, сиды `uikit03@example.com` / `player02@example.com`  
**Сегмент кадров:** «Я впервые в D&D» (`dnd_new`)

Онбординг = подсказки интерфейсу (как TOUR-01). Логику и вёрстку лобби не меняли — только якоря `data-onboarding`, тексты тура, кнопка «Справка» и `JoinIntroCard` на `/join`. CSS-переопределений нет.

## Что взято из #415

- Переписанный `LobbyTour` (мастер 5 / игрок 4, surface hub|session, `lobbyTourSeenSteps`)
- `JoinIntroCard` + `JOIN_INTRO`
- Якоря и `ensureLobbyTourSurface` / `resolveLobbyTourAnchor`
- Проводка в `LobbyDetailPage` / `SessionDetailPage` / `JoinLobbyPage`
- Selfcheck `lobby-tour` + правки onboarding-copy/sync
- Скрипт кадров (пути → `lobby-tour2`)

## Что изменено относительно #415 (сверка с UI main после M1–M9)

| Шаг | Правка |
|-----|--------|
| Мастер «Бой» | Добавлены «← предыдущий ход»; явно: «Бросить за оставшихся» только когда бой уже идёт (очередь инициативы) |
| Мастер «Ещё» | Добавлено «Благочестие ±» — только если в кампании включено благочестие и у героя есть бог |
| Игрок «Твой ход» | Явно: одна строка «Действие / Бонусное / Реакция» с галкой |
| Пропуск якоря | Шаг без видимого якоря пропускается (`onStepSeen`), coachmark с `__missing__` не показывается |

## Тексты тура мастера (хаб → стол)

| # | id | surface | Якорь | Заголовок |
|---|----|---------|-------|----------|
| 1 | `invite` | hub | `lobby-invite` | Приглашение |
| 2 | `roster` | hub | `lobby-roster` | Состав |
| 3 | `live_tabs` | session | `lobby-live-tabs` | Живой стол |
| 4 | `combat` | session | `lobby-combat` | Бой |
| 5 | `more_help` | session | `lobby-more` | «Ещё» и награды |

## Тексты тура игрока (после посадки)

| # | id | Якорь | Заголовок |
|---|----|-------|-----------|
| 1 | `table` | `lobby-own-card` | Стол |
| 2 | `your_turn` | `lobby-own-card` | Твой ход |
| 3 | `reaction` | `lobby-own-card` | Реакция |
| 4 | `rewards` | `lobby-own-card` | Опыт и добыча |

## Карточка /join

| | |
|--|--|
| Заголовок | Что здесь |
| Кнопка | Понятно |
| Якорь | `lobby-join` |

## Сегменты и сброс

- Показ: `dnd_new` / `product_new`. При сегменте `skip` — нет.
- Один раз на аккаунт (`lobbyTourDone` + сервер ONB-03); прогресс шагов хаб↔стол — локально `lobbyTourSeenSteps`.
- Сброс: «Показать подсказки снова» в «Справка».
- Повторный вход после завершения — тура нет; после сброса — есть.

## Кадры (`/opt/cursor/artifacts/lobby-tour2/` → `artifacts/lobby-tour2/` → `docs/audit/frames/lobby-tour2/`)

Все md5 уникальны (28 кадров).

| Кадр | md5 |
|------|-----|
| `join-intro-1440.png` | `3f0abb6e5159aedb228a66d34212fd6c` |
| `join-intro-390.png` | `cc8f52a773e96e3460d910c9e9c618e2` |
| `m-01-invite-1440.png` | `62b4dde43d81783d44846c06fd8d4f0a` |
| `m-01-invite-390.png` | `2c37adb5ec3467495f489c57e88aa63d` |
| `m-02-roster-1440.png` | `ee7b9d1ba0947514e0eb1e5944bbda13` |
| `m-02-roster-390.png` | `a53eabf4c4fc0ad6914d18d198884eb3` |
| `m-03-live-tabs-1440.png` | `f95d24b0346b3df0f42afb0963752c34` |
| `m-03-live-tabs-390.png` | `b5b1665738aec38fcd4ddd2f67f9cdf8` |
| `m-04-combat-1440.png` | `8bc0e6f6b1bddbc825ae4be1dca9c787` |
| `m-04-combat-390.png` | `a0c7df06859b35e2b33afa83563900a3` |
| `m-05-more-help-1440.png` | `f025014c55ec8a547bb874a727020044` |
| `m-05-more-help-390.png` | `e5d9e6052d1f22d45246fe20c8f0ddfe` |
| `m-after-restart-1440.png` | `09206aee9da3aad3f5c158b8530155d9` |
| `m-after-restart-390.png` | `e43b1b67ed0b536934f8761417978562` |
| `m-reentry-no-tour-1440.png` | `7404b668d49f9c3a33116f5881de17b4` |
| `m-reentry-no-tour-390.png` | `77c39645b04aa62686d03c65ac15566c` |
| `m-skip-no-tour-1440.png` | `c557b77360b3cb351500cbcb45ffdd1b` |
| `m-skip-no-tour-390.png` | `094f47d93acc2c4ddf400eb23ccfc3a7` |
| `p-01-table-1440.png` | `28f15d1cf8531c10a64fd529e7639553` |
| `p-01-table-390.png` | `27bb2dff93baf105f7571db9753ddaab` |
| `p-02-your-turn-1440.png` | `5c0c2d656d9ff2e6355040759189ce38` |
| `p-02-your-turn-390.png` | `949a8839799b30327566c8c54a094eb5` |
| `p-03-reaction-1440.png` | `e9a021aba879f783aaa37de69e58783a` |
| `p-03-reaction-390.png` | `4a775d0f71a2919aef30412b11222cd1` |
| `p-04-rewards-1440.png` | `0d012f94c3bf385ea3d4c26bb80f42b3` |
| `p-04-rewards-390.png` | `5d06860154c24f3b053009b35b2f2c9a` |
| `p-reentry-no-tour-1440.png` | `e9dfb78d5b93b058e9ef1fc495526276` |
| `p-reentry-no-tour-390.png` | `b2956a8d5e853b26bc12fe267a22f562` |

Скрипт: `frontend/scripts/lobby-tour-capture.mjs`.

## Проверки

- `npm run build` — ok  
- selfcheck: 68/70 ok; падают на main без наших файлов: `m01-mobile-header`, `ux-sc03-other-scenes`  
- целевые: `lobby-tour`, `onboarding-copy`, `onboarding-sync`, `onboarding-display`, `tour01`, `uikit-no-overrides`, `ux-sc05-gm-toolbar` — ok  
- `pytest` — 387 passed  
- `python -m alembic heads` — одна голова `p14spelru9a1b2`  

## #415

После мержа этого PR в `main` ветка/PR #415 не нужны — закрывает владелец (этот агент #415 не закрывает).
