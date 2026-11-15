# PRINT-14 — идеальная вёрстка классического листа 2014 + настройки текста

**Ветка:** `cursor/print14-classic-2014-a398` · **база:** `main` · **не мержить без ок Игоря** · **PR:** #411

Цель: бумажный бланк D&D 5e 2014 без интерактива — типографская форма. Форма 2024 и переключатель макета на тулбаре на месте (как в `main`).

Кадры: `frontend/scripts/print14-capture.mjs` → `/opt/cursor/artifacts/print14/`.  
**0 дублей** в отчётном словаре · полный `md5s.json`.

---

## Часть A — доправка вёрстки (pass-4 + тулбар)

1. **Тулбар 2014/2024.** Восстановлены `ClassicSheetPage` / `ClassicBlankSheetPage` / `classicSheetFix01.selfcheck` из `main` (с ветки убрали запретный FIX-01 «только 2014»). Переключатель на месте.
2. **КД.** Подпись «Класс доспеха» **вне** SVG-щита; щит крупнее; цифра с зазором от контура.
3. **Кости хитов.** Только формула костей (`3к10+3к8+2к6`), без CON; поле с autofit — без обрезки.
4. **Снаряжение.** `stripTrailingItemQty` — зелье печатается один раз (`Зелье лечения ×2`, не `×2 ×2`).
5. **Навыки.** Зазор у кружка экспертизы; теги `(лов)` ≥ 6.5 pt.
6. **Монеты.** Полные RU-названия, padding, микротег ≥ 6.5 pt с переносом.
7. **Подписи.** На листе 2014 подписи ≥ 7 pt (микротеги ≥ 6 pt).

### Кадры A

| Кадр | md5 |
|---|---|
| after-toolbar-switch-toolbar.png | `da8803a7483a48e8170ca2feae593a47` |
| after-compare-darrack-p1.png | `2edd99577d870475467c0752a01f67dc` |
| after-compare-blank-p1.png | `2614a06094b13f53097ccd8f232bc20a` |
| after-compare-spells.png | `a83352422ac9041a8aa571c22476dba6` |
| after-darrack-crop-combat.png | `6d7ed20e6f98bbc9a1d019058661e4e0` |
| after-darrack-crop-skills.png | `9a76b25d404469b70df3369192605c04` |
| after-darrack-crop-equip.png | `d04e8e935365941ecadcddcb9c1d2458` |
| after-darrack-crop-abilities.png | `461eb36cdddfef17682ab3205505f458` |
| after-torbin-crop-combat.png | `b258306f0d088e242a1febb1e2f0810d` |
| after-torbin-crop-equip.png | `a5ed07be4d685d79bfe1b85e5a41fc33` |
| after-torbin-crop-skills.png | `e534b1099bcb662e8c7a610d481aa729` |
| after-darrack-2024-print-1.png | `2f6ce36a30b432650c71cd938899bd7a` |

---

## Часть B — настройки текста печати

Решения Игоря (pack `pack-PRINT14-settings.md`) — выполнены точно:

1. **Гарнитура** на все вписанные значения (`--classic-ink-font`); подписи бланка не трогаем.
2. **Pinyon Script убран.** Галка «Имя рукописным» → **Marck Script** (кириллица), только имя, autofit сохраняется. Legacy `fontFamily: 'script'` → serif + `nameScript`.
3. Список: **Source Serif 4** (вес 400 подключён) и **IBM Plex Sans**; системные запасные с кириллицей.
4. Удалены галки «Жирные/курсив заголовков»; старые поля в сохранённом `ui` игнорируются.
5. **«Линии под карандаш»** отдельно от счётчика **«Доп. страницы заметок»**. Запрошенные доп. страницы печатаются (без `classic-page-notes--empty` / не скрываются в `@media print`). PDF notes2: **7 страниц**.
6. Переключатель **Чёрно-белая / Цвет**. По умолчанию ЧБ. Цвет — кремовый бланк. Экран и PDF отражают выбор.
7. **«Общий масштаб» убран.** Остаётся размер блока 7–14 pt и autofit до 7 pt.
8. Подписи ≥ 7 pt, микротеги ≥ 6 pt.
9. Настройки общие для 2014 и 2024; переключатель макета на месте; 2024 печатается.

### Кадры B — Настройки

| Кадр | md5 |
|---|---|
| after-settings-panel.png | `ee5bafa42054fe1c41689d589c41989b` |
| after-settings-name-serif.png | `7e04673d90b38ad8a004b78e820db9d2` |
| after-settings-name-sans.png | `cad395821de47775e01507e82794ccd2` |
| after-settings-name-script-long.png | `877d71f72509d2b9205e74d871587018` |
| after-settings-name-script-short.png | `f9bc665f3a604fa3f1ed03cedbe1249b` |
| after-settings-torbin-sans-print-1.png | `9fd2c7e4f814ae45439cb84ff4b8fa8e` |
| after-settings-color-print-1.png | `d19598c6ddd0c477cb573b08462738dd` |
| after-settings-bw-print-1.png | `981c9fe54f06d56b71886122463dc27f` |
| after-settings-pencil-off-toolbar.png | `16e8d50be3a8c79fe5787b28ddb39bb9` |
| after-settings-pencil-on-toolbar.png | `9dc8b0bc6521bcb35af443fbbbc3be0d` |
| after-settings-notes2-print-5.png | `9d09aee395a419afbbb0954a8f2b3a51` |
| after-settings-notes2-print-6.png | `37bc09063c6f0d3698e349af01cf0d80` |
| after-settings-2024-print-1.png | `82b29f16b7833defed10e165f625e031` |

---

## Проверки

- `frontend`: `npm run build` — ok
- `npx tsx src/features/classicSheet/classicPrint14.selfcheck.ts` — ok
- `npx tsx src/features/classicSheet/classicPrintSettings.selfcheck.ts` — ok
- `npx tsx src/pages/classicSheetFix01.selfcheck.ts` — ok
- `backend`: `pytest` — 378 passed
- `alembic heads` — одна голова
- Кадры с живого Vite + API; PDF Chromium + `pdftoppm`
