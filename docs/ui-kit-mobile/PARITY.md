# Mobile ↔ Desktop feature parity

Цель: **каждая** функция десктопного стола / приложения достижима на `<960px`.  
Статусы на момент аудита tip `cursor/create-pipeline-kit-prod-244b` (2026-10-13).

Легенда: ✅ full · 🟡 partial (есть, но плохой UX / спрятано) · ❌ missing entry · 💀 broken path

---

## A. Play desk (цифровой лист)

| Функция (desktop Wave A) | Mobile сейчас | Целевой вход (kit) | Приоритет |
|--------------------------|---------------|--------------------|-----------|
| Mode → сцена (Бой/…) | ✅ Bottom Scene Nav | Bottom Scene Nav | P0 |
| Одна активная панель | ✅ `stageHidden` | `stageHidden` + body--mobile | P0 |
| HP урон/хил | ✅ MobileVitalsBar → HpPad | MobileVitalsBar → HpPad sheet | P0 |
| Temp HP / death pips | ✅ death card + HpPad | HpPad sheet | P0 |
| Conc check при уроне | ✅ Dialog Удержал/Сорвалось | HpPad → Удержал/Сорвалось | P0 |
| Отдых short/long + кости | ✅ Vitals → Rest | Vitals → Rest sheet | P0 |
| Состояния + истощение | ✅ HotStrip + tap истощ. → Conditions | HotStrip → Conditions | P0 |
| Концентрация chip / clear | ✅ HotStrip | HotStrip | P0 |
| Монеты CoinPad | ✅ Vitals → CoinPad | Vitals → CoinPad | P0 |
| Атаки + бросок | ✅ Tab Бой | Tab Бой | P0 |
| Расходники ★ в бою | ✅ блок под атаками | Бой → блок «Расходники» под атаками; ★ в Исследовании (до 3) | P0 |
| Заклинания Каст / upcast | ✅ Бой → Заклинания | Бой → Заклинания | P0 |
| Гримуар / Подготовить / слоты | 🟡 | Книга sheet | P1 |
| Инвентарь glance/expand | 🟡 | Tab Исследование | P0 |
| Attunement 0–3 | 🟡 панель в стеке | из summary Исследования | P1 |
| Тексты / личность | 🟡 | Tab Общение | P1 |
| Умения / ресурсы spend | 🟡 | Tab Способности | P1 |
| Напарники CRUD | 🟡 | Tab Напарники | P1 |
| Companion dock | ❌ | optional strip P2 | P2 |
| Ability rail + навыки | 🟡 всегда сверху | vitals chip → **страница** Характеристики (вариант B; без tab ЕЩЁ) | P0 |
| Сворачиваемые vitals | ❌ | «Свернуть ▴» → compact strip; ▾ развернуть | P0 |
| Владения drawer | ❌ CTA desk-only | из страницы Характеристики → sheet/вложенная | P0 |
| Identity / аватар / классы | 🟡 в стеке | who/avatar → sheet | P0 |
| Skill strips + преим/помеха | ❌ | P1 в Бою / Характеристиках | P1 |
| Split spells | ❌ N/A | segmented, не split | P1 |
| Autosave / conflict | ✅ | сохранить copy WAVE | P0 |
| XP pad / history | ❌ | vitals ⋯ / sheet | P1 |
| Speed modes (лаз/плав/полёт) | 🟡 | vitals tip/sheet | P1 |
| Level-up / архетип | 🟡 | Identity sheet | P1 |

---

## B. Приложение вокруг листа

| Функция | Mobile сейчас | Цель | Приоритет |
|---------|---------------|------|-----------|
| Список персонажей | 🟡 | density + ⋯ sheet | P1 |
| Create 2014 pipeline | 🟡 тяжёлый | StepRail + footer + Сводка sheet | P1 |
| Guided / level-up wizard | 🟡 | те же sheets | P1 |
| Classic sheet | 🟡 print | link + soft warn | P2 |
| Лобби list/create | 🟡 | Hero код+QR accordion | P1 |
| Join по коду/QR | 🟡 | thumb code entry | P1 |
| Session seat | 🟡 stub ok | honest stub | P2 |
| Auth login/register/reset | 🟡 | bottom sheets | P2 |
| Cabinet profile/avatar/sessions/theme | 🟡 | single column polish | P2 |
| Admin | n/a | out of scope mobile kit | — |

---

## C. Регрессии относительно старой MOB-линии

Ветки-референсы (не tip): `mobile-play-desk-2c91`, `mobile-abilities-tab-2c91`, `FEATURE_LOCK` на `play-desk-merge-mobile-e788`.

| Было в MOB | На tip Wave A | Действие |
|------------|---------------|----------|
| `play-desk__body--mobile` one-panel | нет | **вернуть** |
| Mode chips + panel select | нет | заменить Bottom Nav (без двойного select) |
| Abilities как panel tab | rail всегда top | sheet/tab Характеристики |
| `*-card__combat` density | CSS убран | **вернуть** под кит |
| PlayPanel Rest inline | Rest только header desk | Rest sheet из vitals |
| Manual save | autosave WAVE | оставить autosave |

---

## D. Definition of parity (приёмка)

Мобильный паритет = для каждой строки статуса ✅:

1. Пользователь находит вход **без скролла «простыни» всех панелей**.
2. Действие завершается тем же результатом, что на ≥960 (тот же handler/данные).
3. Tap target ≥44px; sheet закрывается явно.
4. K-кейсы из microflows для этой функции проходят на ширине 390px.
