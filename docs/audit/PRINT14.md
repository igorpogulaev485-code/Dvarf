# PRINT-14 — идеальная вёрстка классического листа 2014 + настройки текста

**Ветка:** `cursor/print14-classic-2014-a398` · **база:** `main` · **не мержить без ок Игоря** · **PR:** #411

Цель: бумажный бланк D&D 5e 2014 без интерактива — типографская форма. Форма 2024 и переключатель макета на тулбаре на месте (как в `main`).

Кадры: `frontend/scripts/print14-capture.mjs` → `/opt/cursor/artifacts/print14/`.  
**0 дублей** в отчётном словаре · полный `md5s.json`.

---

## Часть A — доправка вёрстки (pass-4 + тулбар)

1. **Тулбар 2014/2024.** Восстановлены страницы из `main` (запретный FIX-01 снят).
2. **КД.** Подпись вне SVG-щита; щит крупнее; цифра с зазором.
3. **Кости хитов.** Формула без CON + autofit.
4. **Снаряжение.** `stripTrailingItemQty` — ×N один раз.
5. **Навыки / монеты / подписи.** ≥6–7 pt.

---

## Часть B — настройки текста печати

Решения Игоря выполнены: гарнитура на все значения; Marck Script для имени; без Pinyon / жирных-курсивов / общего масштаба; линии под карандаш отдельно от доп. страниц заметок; ЧБ/Цвет; общие для 2014 и 2024.

---

## Pass 6 — регрессии после прогона 5

1. **Характеристики.** `ClassicFitCaption`: полные «ЛОВКОСТЬ», «ТЕЛОСЛОЖЕНИЕ», …; кегль/трекинг ≥6 pt; колонка 0.84in.
2. **Имя.** Две строки + autofit (`wrap` + фиксированная высота 2.55rem); рукописное длинное имя без обрезки.
3. **Щит КД.** Шире path, выше ряд, цифра с padding ≥2pt; подпись под щитом.
4. **«СПАСБРОСКИ ОТ СМЕРТИ».** `classic-caption--wrap`, целиком в две строки.
5. **Тулбар / панель.** UI-kit: `SegmentedControl`, `ToggleChip`, `Select`+`Field`, `Button` степпер; один баннер «Только для печати»; «Пустой бланк» — кнопка.
6. **Глазной проход (DOM width-overflow).** Проверены Торбин, Даррак, чародей 20, пустой бланк — **0 усечений** по подписям/имени/монетам/формуле костей/навыкам.

### Кадры pass 6 (запрошенные)

| Кадр | md5 |
|---|---|
| after-torbin-print-1.png | `ba20e405fde024fa4adec36c0d979724` |
| after-darrack-print-1.png | `095349b18f211e7a2ffb4fd3a89bdbfd` |
| after-torbin-crop-combat.png | `13d244ea508b0c2490223b7c05a4bfef` |
| after-darrack-crop-combat.png | `76f3984010305cdcc61cb2c351d8b821` |
| after-toolbar-switch-toolbar.png | `ed72105dfb034d121b1591f075907f82` |
| after-settings-panel.png | `e7dc1fdfad24f88e4f1f29a520d9db98` |
| after-settings-name-script-long.png | `d59ffd3a7f67cc7097f3dd2112598070` |

### Глазной проход — что смотрел

| Лист | Страницы / зоны | Результат |
|---|---|---|
| Торбин | p1 header/abilities/skills/combat/equip/traits; имя; кости; смерть | без усечений слов |
| Даррак | p1 целиком + combat crop | без усечений |
| Чародей 20 | p1 + лист заклинаний (capture) | без усечений width-overflow |
| Пустой бланк | p1 abilities/combat/captions | без усечений |

---

## Pass 7 — 2024 шапка/хиты, навыки, монеты, тулбар

1. **2024 Хиты.** `Тек.` / `Макс.` из колонок персонажа (+ fallback `combat`); sheet-only PATCH больше не обнуляет HP (`CharacterService.update`).
2. **2024 Шапка.** Подкласс из `classes[].subclass_name`; подписи Предыстория/Класс/Раса/Подкласс; блок смерти без обрезки правым краем A4.
3. **Навыки 2014.** `letter-spacing: 0` + увеличенный `word-spacing`; `ClassicFitCaption` без отрицательного трекинга; глазной проход «слипшиеся слова» в `print14-pass7-capture.mjs`.
4. **Монеты.** Подписи `Медь / Серебро / Электрум / Золото / Платина` в одну строку ≥6.5pt (2014, 2024, бланк); без hyphenation.
5. **Тулбар.** `Печать / PDF` — primary справа в первом ряду (grid); «Распечатать пустой бланк» — secondary link; «Линии под карандаш» — ToggleChip с Вкл/Выкл; 390 без горизонтальной обрезки.

### Кадры pass 7 (до / после)

Каталоги: `/opt/cursor/artifacts/print14/pass7-before/` · `pass7-after/` · полный `md5s.json` в каждом.

| Кадр | md5 after |
|---|---|
| after-darrack-2024-print-1.png | `11d3ac6ca04b1a13f49c5be192264182` |
| after-torbin-2024-print-1.png | `ca52d5b9d2857438d25c3eaa7a006a5e` |
| after-torbin-crop-skills.png | `b9739cd41a39d5c5e4bc61c893c97795` |
| after-torbin-crop-equip.png | `0e73bd9a66e4c1695934acd6e8c9a5c2` |
| after-toolbar-1440.png | `8cdd41f50cdbe09902eb7ef6001b4b87` |
| after-toolbar-390.png | `5b658620a49f06a4c0e5cc2b090fbbc3` |

### Глазной проход pass 7

| Лист | Зоны | Результат |
|---|---|---|
| Даррак 2024 | p1–p4, хиты, смерть, подкласс | хиты 24/27; смерть без clip; подкласс «Домен бури» |
| Торбин 2024 | p1–p4 | хиты 58/62 |
| Торбин 2014 | skills + coins crop | пробелы в навыках; монеты без переносов |
| Тулбар | 1440 + 390 | Print primary справа; blank secondary; switch Вкл/Выкл |

---

## Проверки

- `frontend`: `npm run build` — ok
- selfcheck: classicPrint14, classicPrintSettings — ok
- `backend`: `pytest` — 378 passed
- Alembic: одна голова
- Кадры pass7: Vite + API, Chromium PDF + pdftoppm; stuck-words = 0
