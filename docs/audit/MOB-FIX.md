# MOB-FIX — правки по аудиту MOB-AUDIT

**Дата:** 2026-11-15  
**Ветка:** `cursor/mob-fix-c099`  
**База:** `main` @ `8a5df3c7`  
**Приложение:** локальный Vite `:5173` + API `:8000`, сиды `uikit03@example.com`  
**Правила:** только UI-кит (токены/модификаторы в `frontend/src/styles/` + компоненты кита); без CSS по месту; десктоп 1440 без изменений кроме печати 2024; шапка — только текст/перенос имени на `<960`.

---

## Что сделано (по пунктам пакета)

| # | Проблема | Решение |
|---|----------|---------|
| 1 | Печать 2024 убрана | Вернули переключатель **2014 / 2024** на `/characters/:id/classic` и `/classic/blank` (`?layout=2024`). Путь создания 2024 не возвращали. |
| 2+5 | Тосты накрывают футер / Bottom Scene Nav | В ките: `.ui-toast` поднимается через `:has(.mobile-scene-nav)` / `:has(.create-pipeline__footer)` + safe-area; z-index 55. |
| 3 | Обрезка подписей ресурсов + мелкие стрелки | На мобилке `hot-res-name` / `hot-label` — до 2 строк; шевроны ScrollRow ≥ `--tap-min` 44px. |
| 4 | Имя «Даррак Ж… Кулак» | В свёрнутых vitals: перенос по словам (`overflow-wrap: break-word`), без mid-glyph. Десктоп не трогали. |
| 6 | Чипы валют / футер «Передать» | Модификатор `session-combatant-mode--coins` (сетка 5); padding футера диалога с запасом safe-area на `<960`. |
| 7 | Tap &lt; 44px | Токены `--tap-min` / `--nav-h`; шевроны, `⋯` topbar, tool-кнопки атак, close диалога. |
| 8 | Онбординг без явного выхода | `WelcomeDialog`: `showClose` (×) + ссылка «Пропустить». |
| 9 | Плотный тулбар списка | На `<960` сетка 2×2: Создать+Справка / размеры+Теги — первая карточка в первом экране. |
| 10 | Создание: фильтры / языки / пол | Источники свёрнуты (`create-pipeline__source-toggle`); языки `chip-row--compact`; явная подсказка «Для генератора имени нужен пол». |

---

## Кадры (настоящее приложение)

Каталог: `/opt/cursor/artifacts/mob-fix/` (+ копии в `/opt/cursor/artifacts/`).  
Before — из ветки аудита `cursor/mob-audit-c9ac` (`docs/audit/frames/`).

### Before (аудит)

| Кадр | md5 |
|------|-----|
| `before/01-chars-list-390.png` | `94c03d70b30638e860e3e2500590dc61` |
| `before/01-chars-list-onboarding-390.png` | `94c03d70b30638e860e3e2500590dc61` |
| `before/02-sheet-header-collapsed-390.png` | `fbd6ad13fc1add0b8aa8cbfca2763071` |
| `before/06-scene-combat-390.png` | `2dd8906865768cc29fb2e8a6ea28297e` |
| `before/86-transfer-dialog-390.png` | `6b1c6baeadc24506c54ad840916e1305` |
| `before/117-transfer-footer-760.png` | `9d1c77b7d40ac522904a30decc790ab4` |
| `before/c13f-07-after-bg-390.png` | `1e6a45e03292abfbe67ca89b16d8f907` |
| `before/c13f-03-race-dialog-390.png` | `5ead024ed3c7aec9ec5e41f709fdc44e` |
| `before/c14-08-blank-toolbar-390.png` | `4423bc50976e867c48c2f56919d1ed60` |
| `before/c14-02-classic-2014-1440.png` | `fd3e41de0182339f8e67dadea2b56d4b` |

### After (MOB-FIX)

| Кадр | md5 | Зачем |
|------|-----|--------|
| `after-01-chars-welcome-390.png` | `570f1fb69a87ec7bdd26425ebe23ce22` | × + «Пропустить» |
| `after-01-chars-list-390.png` | `618c85dc5448c87374f571231fd983bf` | уплотнённый тулбар |
| `after-02-sheet-header-collapsed-390.png` | `3e56b53aefcf778c7137fc17495782c7` | имя целиком |
| `after-06-scene-combat-390.png` | `3e56b53aefcf778c7137fc17495782c7` | бой 390 |
| `after-86-transfer-dialog-390.png` | `891db7df4afee0ef684020e2b2a762f2` | валюты в ряд |
| `after-117-transfer-footer-760.png` | `bf2b096a44778569cdeb655f002182fc` | футер на 760 |
| `after-c13f-toast-bg-390.png` | `c122c51462f90c2f9cc6e5d5bf556821` | тост над CTA предыстории |
| `after-c13f-race-dialog-gender-390.png` | `7269f88cc12a1ad3c709b39fe936fd13` | пол у генератора + языки |
| `after-c13-create-start-390.png` | `4b98619678b86301ea4fba69ece84d67` | фильтры источников свёрнуты |
| `after-c14-classic-2014-390.png` | `1a5415b13303a4f1b196a59d54182b67` | печать 2014 |
| `after-c14-classic-2024-390.png` | `d4f37790dbae3b59c05aa046a24343dd` | печать 2024 |
| `after-c14-blank-layout2024-390.png` | `a9fb645b606e83641f0eb01325fb6182` | `?layout=2024` |
| `after-c14-classic-2014-1440.png` | `a80c91147ae3d61fc6cd00d5471e29e8` | 2014 на 1440 |
| `after-c14-classic-2024-1440.png` | `0997e5c6d683cbcb052399dab4ed3694` | 2024 на 1440 |
| `after-c14-blank-2024-1440.png` | `2f8bbf309b3e0b650ac9c28e95206032` | blank 2024 1440 |
| `after-desk-combat-1440.png` | `cbdc4c403e5f6ad5fa57615a9f6716c7` | контроль десктопа |
| `after-desk-header-1440.png` | `ea66f938d571ce659ce2c57e4677eede` | шапка десктопа без сдвигов |

---

## Проверки

- `npm run build` (frontend) — ок  
- `npx tsx src/pages/classicSheetFix01.selfcheck.ts` — ок (ожидает 2014+2024)  
- Десктопный лист на 1440 снят отдельно; правки CSS ограничены `@media (max-width: 959px)` / мобильными селекторами, кроме печати и общих атомов тоста/диалога/chevron.

## Не в scope

- Каст / цель атаки / строка хода / Напарники / Способности / Общение / Исследование — без переделки.  
- Создание редакции D&D 2024 — не возвращали.
