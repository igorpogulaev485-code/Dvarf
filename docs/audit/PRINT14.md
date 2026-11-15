# PRINT-14 — идеальная вёрстка классического листа 2014

**Ветка:** `cursor/print14-classic-2014-a398` · **база:** `main` · **не мержить без ок Игоря** · **PR:** #411

Цель: бумажный бланк D&D 5e 2014 без интерактива — типографская форма, приятнее официального в ч/б. Форма 2024 и тулбар печати не трогались (PR #410).

## Корневые правки этой итерации

1. **Подписи блоков.** Причина «П СНАРЯЖЕНИЕ ИЯ И ЯЗЫКИ»: `position: absolute` + `nowrap` + `overflow: visible` — длинные капшены трёх колонок на одной базовой линии наезжали друг на друга. Исправление: подписи в **normal flow** (footer панели), `overflow: hidden` на `.classic-panel`. PDF: ПРОЧИЕ / СНАРЯЖЕНИЕ / УМЕНИЯ на разных x.
2. **Характеристики.** SVG-рамка с вырезами + овал скора снизу, модификатор крупно в центре (clip-path в Chromium PDF ломался → SVG).
3. **КД / имя.** Щит КД — SVG; подпись «Класс доспеха» в одну строку внутри щита. Имя — лента, **одна строка** с autofit (без wrap).
4. **Спасброски / навыки.** Подписи в своём поле; навыки в одну строку (значение на линии, имя + серый тег `сил/лов/…`).
5. **Смертные спасброски.** Кружки + соединяющая линия через центры.
6. **Атаки.** 3 серые ячейки на строку × 3 слота (Название / Бонус / Урон), дальше линии.
7. **Монеты.** Полные RU-названия, 5 равных ячеек, фиксированная высота подписи (одна строка), числа на одной сетке. Снаряжение — по предмету на строку, линии до низа.
8. **Карандашные линии.** Ruled background на всех text-блоках (и пустых, и с данными).
9. **«Darr…P1».** Это была подпись side-by-side монтирования, не печать; подписи compare укорочены. На бланке — только бренд «КриD20».

## Кадры (сверка с official-2014-1)

Скрипт: `frontend/scripts/print14-capture.mjs` → `/opt/cursor/artifacts/print14/`.  
**0 дублей**, полный словарь `md5s.json`.

### Side-by-side

| Кадр | md5 |
|---|---|
| after-compare-darrack-p1.png | `e4892ce8cc3a689915eeca29d8865327` |
| after-compare-blank-p1.png | `cbdd235055e41ccab0bf9abf51fa8ca9` |
| official-2014-1.png | `5ecb717c89acc171eb4b10379579ca9b` |

### Крупные кропы PDF (Даррак)

| Кадр | md5 |
|---|---|
| after-darrack-crop-abilities.png | `f38ca73390701b8031935c9725babeda` |
| after-darrack-crop-combat.png | `6f16e63c330cb3ee1c3a94f40b78029a` |
| after-darrack-crop-attacks.png | `eabcea3fb4ba47d79220cbfb67fffa6f` |
| after-darrack-crop-equip.png | `335340b3f682703b6e5e7a6812b96cf2` |
| after-darrack-crop-left-bottom.png | `d5756003572948c2db38a3f558c56c2d` |
| after-darrack-equip-close.png | `35a9c264ed02ff4c5392da381b83c178` |
| after-darrack-print-1.png | `599e885d4206b33e478c92f0925e2b15` |

### Крупные кропы PDF (пустой бланк)

| Кадр | md5 |
|---|---|
| after-blank-crop-abilities.png | `bb1f0f15fb817d045c622af03a79e238` |
| after-blank-crop-combat.png | `8122458c4a294f2e2fd7bea4ef1fd141` |
| after-blank-crop-attacks.png | `a5da0192429a427f7b90e860dfc3773b` |
| after-blank-crop-equip.png | `ad310a3535dad44a368a479f98aebc8d` |
| after-blank-crop-left-bottom.png | `4d52fa8054eb9a5a3ffcd07ee39eb963` |
| after-blank-equip-close.png | `3715f00cee7406a4ed1b7a28dc64328e` |
| after-blank-print-1.png | `5e8d8df06c7b8ed097a32f64abd91e1a` |

## Проверки

- `npm run build` — ok
- `npx tsx src/features/classicSheet/classicPrint14.selfcheck.ts` — ok
- Кадры с живого Vite + API
