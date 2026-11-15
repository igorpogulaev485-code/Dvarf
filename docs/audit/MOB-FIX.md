# MOB-FIX — правки по аудиту MOB-AUDIT (доправка PR #410)

**Дата:** 2026-11-15  
**Ветка:** `cursor/mob-fix-c099`  
**База:** `main`  
**Приложение:** локальный Vite `:5173` + API `:8000`, сиды `uikit03@example.com`  
**Правила:** только UI-кит; десктоп 1440 без изменений кроме печати; шапка — только текст/перенос имени на `<960`.

---

## Доправка по кадрам (этот проход)

| # | Проблема | Решение |
|---|----------|---------|
| 1 | Дубли md5 кадров | Пересняты отдельные сцены: свёрнутая шапка / Бой / тост на листе / create до и после раскрытия источников; print media для 2014/2024. |
| 2 | Стрелки ScrollRow 44px серые круги поверх чипов | Видимый шеврон ~20px (outline); hit 44px через `::after`; gutter только справа (`--edge-right`), слева — лишь при `--edge-left` (прокрутка). |
| 3 | «Концентрация: Щит…» режется | Стек из 2 строк: kicker «Концентрация» + `<strong>Щит веры</strong>` целиком. |
| 4 | Welcome: два пропуска | Оставлены × и один «Пропустить подсказки»; нижнюю ссылку «Пропустить» убрали. |
| 5 | Печать: active ≠ макет | Корневая причина: `:hover` перебивал `.is-active`. Active = cream+тёмный текст (и на `:hover`); inactive читаемые; `aria-pressed`; optimistic `layoutOverride`. |
| 6 | Создание: 3 колонки в topbar | На `<960` — колонка: «← К списку», текст, подсказка. |

---

## Кадры after (настоящее приложение)

Каталог: `/opt/cursor/artifacts/mob-fix/` (+ копии в `/opt/cursor/artifacts/`).  
Все md5 уникальны (26 кадров).

| Кадр | md5 | Зачем |
|------|-----|--------|
| `after-01-chars-welcome-390.png` | `19d0442c52797b9814d75a9a51e6e3aa` | × + «Пропустить подсказки» |
| `after-01-chars-list-390.png` | `41f0f57861c935c85e60c28e44b9a1ce` | список после закрытия |
| `after-02-sheet-header-collapsed-390.png` | `2f409c078213e14d8efcbde0542e4187` | свёрнутая шапка; концентрация 2 строки |
| `after-06-scene-combat-390.png` | `b1bf799a4c83bed66a4d1eff23ef9b6d` | сцена Бой; концентрация 2 строки |
| `after-toast-sheet-390.png` | `bc7213dd72bc2d6ce5d9e74a80a7fdfc` | тост броска на листе |
| `after-86-transfer-dialog-390.png` | `d362f650162cf554396ff67a6d0def28` | валюты / передать |
| `after-c13-create-start-390.png` | `51bbd2fdb1e7b000e3263715e7de4c94` | старт; «← К списку» через `.back-link` |
| `after-c13-create-filters-collapsed-390.png` | `524f08d22166e01defa3528ea79ce50a` | после раскрытия источников (chips) |
| `after-c13f-race-dialog-390.png` | `97986cf6bcfdd3b67c6bb6663cba91e7` | настройка расы |
| `after-c13f-race-dialog-gender-390.png` | `acd3b5b529921e32336000ecf398d7d9` | пол / имя |
| `after-c13f-toast-bg-390.png` | `37bdf700fa48230943df6b59e198ba16` | тост над футером создания |
| `after-c14-classic-toolbar-390.png` | `4a4e4f191aa7888a66fe0de1784cb1f9` | тулбар печати 2014 |
| `after-c14-classic-2014-390.png` | `9f17c644f793a4ce1f440a8aef1dd751` | макет 2014 экран |
| `after-c14-classic-2014-print-390.png` | `d1217b0383e613dcf2ce01546c6147c3` | 2014 `media: print` |
| `after-c14-classic-2024-390.png` | `249e11ec49214341cab31951773a9165` | макет 2024 экран |
| `after-c14-classic-2024-print-390.png` | `24b67d28bbdb6c054c67230e5554eea8` | 2024 `media: print` |
| `after-c14-blank-layout2024-390.png` | `85ecf5ffc62653269e21ef39a87594fb` | blank `?layout=2024` |
| `after-toast-over-nav-760.png` | `c433aeceac6cd9f9164a3a9fe47f1950` | тост над nav 760 |
| `after-117-transfer-footer-760.png` | `816982431215f612d2e31ce2554b1cc6` | футер диалога 760 |
| `after-desk-header-1440.png` | `e7cbe16da0301b0d65ec500d8d003d9f` | десктоп шапка; «Концентрация: Щит веры» |
| `after-desk-combat-1440.png` | `e547e3d5b9004c5ef5ee0f4bfafc46dd` | десктоп бой; «Концентрация: Щит веры» |
| `after-c14-classic-2014-1440.png` | `23919e6860b021ab719d973d2291c052` | 2014 на 1440 |
| `after-c14-classic-2014-print-1440.png` | `337a2c44fcf7e9f94d01d3fdebe543be` | 2014 print 1440 |
| `after-c14-classic-2024-1440.png` | `c81edf2010d78f668f59274fe8e62f27` | 2024 на 1440 (active=cream) |
| `after-c14-classic-2024-print-1440.png` | `e41d3d45e2b4dace757c7919a8e28bfc` | 2024 print 1440 |
| `after-c14-blank-2024-1440.png` | `2a81273c4ebfee60435d3795e14c2b1a` | blank 2024 1440 |

Скрипт пересъёмки: `frontend/scripts/mob-fix-capture.mjs`.

---

## Проверки

- `npm run build` (frontend) — ок  
- `npx tsx src/pages/classicSheetFix01.selfcheck.ts` — ок  
- Геометрия ScrollRow (Playwright): `scrollerRight` < `chevLeft` (~12px зазор), шеврон 20×20, shell pad 44px.

## Не в scope

- Каст / цель атаки / строка хода / Напарники / Способности / Общение — без переделки.  
- Создание редакции D&D 2024 — не возвращали.
