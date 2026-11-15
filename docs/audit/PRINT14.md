# PRINT-14 — идеальная вёрстка классического листа 2014

**Ветка:** `cursor/print14-classic-2014-a398` · **база:** `main` · **не мержить без ок Игоря** · **PR:** #411

Цель: бумажный бланк D&D 5e 2014 без интерактива — типографская форма, приятнее официального в ч/б. Форма 2024 и тулбар печати не трогались (PR #410).

## Корневые правки

1. **Подписи блоков.** Капшены в normal flow (footer панели) — без наложения «П СНАРЯЖЕНИЕ…».
2. **Характеристики.** SVG-рамка + овал скора на нижней границе; кегль подписей уменьшен, поля одинаковые (в т.ч. ТЕЛОСЛОЖЕНИЕ).
3. **КД.** SVG-щит с боковым врезом — белая заливка только у path, серая колонка видна по бокам; высота ряда с Инициативой/Скоростью.
4. **Навыки.** Полные названия; тег `(лов)/(муд)/…` меньшим кеглем с зазором; колонка характеристик сужена.
5. **Смертные / атаки / монеты.** Кружки на линии; 3×3 серые ячейки; полные RU-названия монет полосой.
6. **Карандашные линии.** `line-height` = шаг фона; линия на `1.48em` в тайле `1.5em` (подобрано по Chromium PDF / pdftoppm): базовая линия на волоске, выносные касаются; `0.5pt` `#c8c8c8`.
7. **Торбин / чародей 20.** Проверены p1 (мультикласс) и лист заклинаний.

## Кадры

Скрипт: `frontend/scripts/print14-capture.mjs` → `/opt/cursor/artifacts/print14/`.  
**0 дублей**, полный словарь `md5s.json`.

### Side-by-side

| Кадр | md5 |
|---|---|
| after-compare-darrack-p1.png | `98f82e0ab49b0ecb7c9c0b89cb6f548b` |
| after-compare-blank-p1.png | `597063968ca045f58beb50f309732813` |
| after-compare-spells.png | `9b4f4c9c27ba8f99c517f87f28985810` |
| official-2014-1.png | `5ecb717c89acc171eb4b10379579ca9b` |

### Кропы PDF (Даррак)

| Кадр | md5 |
|---|---|
| after-darrack-print-1.png | `535299147ee39f7e173ff60b3ba186cd` |
| after-darrack-crop-equip.png | `d37860f7b189835632bd6414245170c4` |
| after-darrack-crop-skills.png | `77d2b9f3c0cb62ad77915c120689a68e` |
| after-darrack-crop-combat.png | `4ac05ba2f8ffafeed720c3f8f15c7873` |
| after-darrack-crop-abilities.png | `8b59617dffe9100e38de6b17e28cefe9` |
| after-darrack-crop-left-bottom.png | `4f640fce3f57dc1d6cbf991c4fb2c9a0` |
| after-darrack-crop-traits.png | `39053a36e78d8a1ab4a8f32b7eee1929` |

### Торбин / чародей

| Кадр | md5 |
|---|---|
| after-torbin-print-1.png | `15eb2892ebfb487446e50dd116dc3efb` |
| after-sorcerer20-print-3.png | `caa64fdfa562d81f823911de90b0e4bb` |
| after-sorcerer20-crop-spells.png | `03a5f67acfe336efc1878e725dee85bc` |

## Проверки

- `npm run build` — ok
- `npx tsx src/features/classicSheet/classicPrint14.selfcheck.ts` — ok
- Кадры с живого Vite + API; сверка baseline на PDF (не только screenshot элемента)
