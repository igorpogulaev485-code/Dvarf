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

## Проверки

- `frontend`: `npm run build` — ok
- selfcheck: classicPrint14, classicPrintSettings, classicSheetFix01 — ok
- `backend`: `pytest` — 378 passed (ранее в срезе)
- Кадры: Vite + API, Chromium PDF + pdftoppm, **0 дублей**
