# Mobile ↔ Desktop feature parity

Цель: **каждая** функция десктопного стола / приложения достижима на `<960px`.

**Аудит tip:** `cursor/buffs-ac-slice-244b` (live 2026-10-14) · бандл `CharacterDetailPage-DFLWQXEV.js`  
**Mobile код:** ветки `cursor/mobile-ui-kit-0ed9` / `cursor/mobile-spells-m11-0ed9` — **не на проде**.  
Колонка «Mobile сейчас» = статус **в mobile-ветках** (не live phone на Timeweb).

Легенда: ✅ full · 🟡 partial (есть, но плохой UX / спрятано) · ❌ missing entry · 💀 broken path

---

## A. Play desk (цифровой лист)

| Функция (desktop tip) | Mobile сейчас (ветки) | Целевой вход (kit) | Приоритет |
|-----------------------|----------------------|--------------------|-----------|
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
| Расходники ★ в бою | ✅ блок под атаками | Бой → блок «Расходники» | P0 |
| Заклинания Каст / upcast | ✅ Бой → Заклинания → Бой | Бой → Заклинания → Бой | P0 |
| Гримуар / Подготовить / слоты | ✅ Книга sheet (M1.1) | Книга sheet | P1 |
| Cast: нет ячеек (K14) | ✅ Отдых… / сброс договора | inline recovery | P1 |
| Инвентарь glance/expand | 🟡 | Tab Исследование | P1 · M1.2 |
| Attunement 0–3 | 🟡 | из summary Исследования | P1 · M1.2 |
| Тексты / личность | 🟡 | Tab Общение | P1 · M1.3 |
| Умения / ресурсы spend | 🟡 | Tab Способности | P1 · M1.3 |
| Напарники CRUD | 🟡 | Tab Напарники | P1 · M1.3 |
| Companion dock | ❌ | optional strip | P2 |
| Ability rail + навыки | ✅ страница B + tip rail | vitals → страница B | P0 |
| LSS rail: pip + число→бросок | ✅ (tip AbilitySkillsColumn) | страница Характеристики | P0 · M0.6 |
| Сворачиваемые vitals | ✅ compact strip | «Свернуть ▴» | P0 |
| Владения drawer | ✅ sheet из Характеристики | sheet / вложенная | P0 |
| Identity / аватар / классы | ✅ who/avatar → sheet | who/avatar → sheet | P0 |
| Identity **Черты** + мастер выдал | ✅ (tip §2k) | секция в Identity sheet | P0 · M0.4b |
| XP pad / history / level-up CTA | ✅ в Identity (`XpProgressField`) | Identity sheet | P0 |
| Skill strips + преим/помеха | ❌ | Бой + Характеристики | P1 · M1.4 |
| История бросков «броски» | ❌ (desk tip 10-14) | sticky Бой → sheet | P1 · M1.4 |
| Безрассудная → преим. | ❌ / 🟡 desk-only wiring | Бой compact | P1 · M1.4 |
| Split spells | ✅ сегмент Атаки/Заклинания + Бой/Книга | segmented, не split | P1 |
| Autosave / conflict | ✅ | copy WAVE | P0 |
| Speed modes (лаз/плав/полёт) | 🟡 | vitals tip/sheet | P1 |
| Витал **Прыж.** long/high | ✅ MobileVitalsBar | chip в MobileVitalsBar | P0 · M0.5 |
| Чип **щит** под КД | ✅ MobileVitalsBar | под КД в vitals | P0 · M0.5 |
| Разборка КД (бафы) | ✅ tap КД → sheet | tap КД → sheet | P0 · M0.5 |
| Разборка инициативы | ✅ tap Иниц. → sheet | tap Иниц. → sheet | P0 · M0.6 |
| Разборка СЛ / атаки закл. | ✅ в Книге (tip) | из Книги / compact stats | P0 · M0.6 |
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
| Cabinet theme persist | 🟡 desk fixed 10-14 | single column + smoke `<960` | P1/P2 |
| Admin | n/a | out of scope mobile kit | — |

---

## C. Регрессии относительно старой MOB-линии

Ветки-референсы (не tip): `mobile-play-desk-2c91`, `mobile-abilities-tab-2c91`, `FEATURE_LOCK` на `play-desk-merge-mobile-e788`.

| Было в MOB | На tip Wave A (раньше) | Действие |
|------------|------------------------|----------|
| `play-desk__body--mobile` one-panel | не было | **вернуть** (сделано в mobile-ветках) |
| Mode chips + panel select | не было | Bottom Nav (без двойного select) |
| Abilities как panel tab | rail всегда top | страница Характеристики |
| `*-card__combat` density | CSS убран | **вернуть** под кит |
| PlayPanel Rest inline | Rest только header desk | Rest sheet из vitals |
| Manual save | autosave WAVE | оставить autosave |

**Новое (2026-10-14):** mobile-ветки отстают от tip `buffs-ac-slice-244b`.  
До следующего кода — **merge tip**, иначе ship затрёт прыжок/щит/бафы/историю бросков.

---

## D. Definition of parity (приёмка)

Мобильный паритет = для каждой строки статуса ✅:

1. Пользователь находит вход **без скролла «простыни» всех панелей**.
2. Действие завершается тем же результатом, что на ≥960 (тот же handler/данные).
3. Tap target ≥44px; sheet закрывается явно.
4. K-кейсы из microflows для этой функции проходят на ширине 390px.
5. Фичи desk tip 10-14 (прыжок, щит, бафы, LSS rail, броски, Черты) **не** остаются desktop-only.
