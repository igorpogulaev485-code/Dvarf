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

## Pass 8 — шапка 2024 Торбин, смерть, монеты, отчёт HP PATCH

1. **2024 шапка.** Поля предыстория/класс/раса/подкласс — `ClassicFitInput` + autofit как в 2014 (≥7 pt, затем перенос; при длинном мультиклассе до 4 строк, без обрезки слов).
2. **СМЕРТЬ.** Кружки в группе `.classic-death-bubbles` с зазором от «Усп./Пров.» (не `margin-right: auto` из 2014).
3. **Монеты.** Ряд 3+2, кроп всех 5 ячеек: Торбин 2014 и пустой бланк.
4. **HP PATCH (бэкенд, уже в pass 7).** См. ниже. Тест: `tests/test_character_sheet_patch_hp.py`. Больше бэкенд не трогали.

### Почему обнулялись хиты (простыми словами)

При сохранении **только листа** (`PATCH /characters/{id}` с полем `sheet`, без `hp_current`/`hp_max`) сервис подтягивал хиты из `sheet.combat`. В боевом блоке этих чисел часто нет (классическая печать пишет туда layout/карандаш/шрифт, а не HP). Тогда в колонки персонажа записывался `null` — хиты на бланке становились пустыми.

**Кто задевался:** любой, кто открывал классическую печать и менял настройки (макет 2014/2024, линии под карандаш, гарнитуру и т.п.). На проде это реальные игроки с такими действиями, не только сиды PRINT-14. Хиты в Play Desk/основном листе после этого тоже могли показываться пустыми, пока их снова не выставят.

### Кадры pass 8

| Кадр | md5 |
|---|---|
| after-torbin-2024-print-1.png | `6e2baefe728ddcae40ff7793f7e99639` |
| after-torbin-2014-print-1.png | `20d828ee1cfcf3b2ece9acaeaf1cc1f2` |
| after-torbin-crop-coins.png | `71a5234a88320589cd87ed8cdbfca671` |
| after-blank-2014-print-1.png | `8d56ad90a10044819cc3a1cbc3497705` |
| after-blank-crop-coins.png | `7e0e920873dfbed347a18acf515b3f36` |

Каталоги: `pass8-before/` · `pass8-after/`.

---

## Pass 9 — пустой бланк без цифр; навыки без растяжки

1. **Пустой бланк 2014/2024.** Фикстура `classic-blank`: `level: 0`, без `abilities`/`proficiency.bonus`. Рендер (`isClassicBlankCharacter`) не пишет производные: ур., 10/+0, PB, КД, инициатива, кости хитов, пассивная мудрость, бонусы спасбросков/навыков. На 2024 также пустая «Кость» (без дефолта `к6`).
2. **Навыки 2014.** `.classic-check__name`: `word-spacing: normal; text-align: left` — без двойных пробелов от выключки.

### Кадры pass 9

| Кадр | md5 |
|---|---|
| after-blank-2014-print-1.png | `955048e300f6fdb6262e59fff06cc7f6` |
| after-blank-2024-print-1.png | `b610f0861d898bd9dd042441a3351111` |
| after-torbin-crop-skills.png | `f1260254ea7e8e97475a73811a63f8cd` |

Каталог: `pass9-after/`. Скрипт: `frontend/scripts/print14-pass9-capture.mjs`.

---

## Pass 9b — высота пустых ячеек; без «—» в оружии

1. **МОД. / поля.** `min-height` у `.classic-lss-ability__modbox strong` и score/input ячеек 2024 (и пол пустых полей LSS); у 2014 — пол у `.classic-ability__mod` / score. Пустое значение не сжимает ячейку.
2. **Оружие 2024.** Убраны `placeholder="—"` в строках «Оружие и боевые заговоры».

### Кадры pass 9b

| Кадр | md5 |
|---|---|
| after-blank-2014-print-1.png | `be9f28257f9fe50544463178f500606b` |
| after-blank-2024-print-1.png | `8e7142f33f5b7a24de74f1d163e32d90` |

Каталог: `pass9b-after/`.

---

## Проверки

- `frontend`: `npm run build` — ok
- selfcheck: classicPrint14, classicPrintSettings — ok
- `backend`: `pytest` — 380 passed (incl. HP sheet-patch)
- Alembic: одна голова
- Кадры pass8/pass9/pass9b: Vite + API, Chromium PDF + pdftoppm
