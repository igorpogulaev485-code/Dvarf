# PRINT-14 — идеальная вёрстка классического листа 2014

**Ветка:** `cursor/print14-classic-2014-a398` · **база:** `main` · **не мержить без ок Игоря**

Цель: бумажный бланк D&D 5e 2014 без интерактива — типографская форма, приятная в ч/б печати. Форма 2024 и тулбар страницы печати не трогались (PR #410).

## Что сделано

1. **Статика вместо полей формы.** В теле листа 2014 нет `input` / `select` / `textarea`: значения — статичный текст (`ClassicStaticField`), пустые — линии под карандаш. Режим «Пустые поля под карандаш» сохранён.
2. **Канон способностей 2014.** Крупный модификатор в рамке, мелкий скор в овале снизу (как у официального бланка).
3. **Типографика.** Подписи капсом под значениями, единый модуль `0.08in`, тонкие рамки (hair / frame / accent), центровка чисел, перенос длинных классов/рас с autofit ≥ ~7pt.
4. **A4.** Страницы 210×297 мм, предсказуемые разрывы, overflow уходит на продолжения; пустые note-страницы на печати скрыты.
5. **Ч/б.** Чернила `#000`/`#111`, без цветных подложек на печати; заполненные пузырьки владения — сплошные.

## Границы (соблюдены)

| Не трогали | Почему |
|---|---|
| `ClassicPrint2024.tsx` | только 2014 |
| `ClassicSheetPage.tsx` / тулбар печати | параллельно PR #410 |
| Play Desk / шапка / сцены | вне scope |

## Персонажи проверки (настоящее приложение)

| Слаг | ID | Кто |
|---|---|---|
| darrack | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1` | Жрец 3 «Даррак Железный Кулак» |
| torbin | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2` | Мультикласс, длинное имя |
| sorcerer20 | `cccccccc-cccc-4ccc-8ccc-cccccccccc02` | Чародей 20, большой список |
| blank | `/classic/blank` | пустой бланк 2014 |

Сиды: `seed_uikit03_hot_chars.py` + `seed_mag01_chars.py` (логин `uikit03@example.com` / `uikit03-dev`).  
Кадры: `frontend/scripts/print14-capture.mjs` → `/opt/cursor/artifacts/print14/`.

## Сверка с официальным бланком

Ориентиры WotC: `official-2014-1.png` (P1), `official-2014-3.png` (заклинания) в том же каталоге артефактов (рендер `dnd_5e_charactersheets.pdf`).

Доведено после сравнения: иерархия модификатор/скор, подписи под линией, тонкие рамки, овал скора, пузырьки владения, ч/б без «кремовой» подложки.

## Кадры до / после + md5

Все файлы уникальны (51 md5, 0 дублей). Полный словарь: `/opt/cursor/artifacts/print14/md5s.json`.

### Экран 1440

| Кадр | md5 |
|---|---|
| before-darrack-1440.png | `af2ebf2cb6055a0b018297eaef67a868` |
| after-darrack-1440.png | `93d65e9cf10c102566e7f8d25e6327f2` |
| before-torbin-1440.png | `8e090a65d3dfd5530802c76dd4dcebf6` |
| after-torbin-1440.png | `0c2bf07d57de8fa446ce04f20aa5c1e1` |
| before-sorcerer20-1440.png | `fcb6fdb9138683bcbd117af4bc561a1a` |
| after-sorcerer20-1440.png | `341a385201266c043df6bcd90a80d509` |
| before-blank-1440.png | `7fd1fb34dd23c5e6504d1ef1df6fc560` |
| after-blank-1440.png | `d8a9e8e2c3611e6c21ba0814335868e6` |

### Print-preview / PDF page 1 (и ключевые)

| Кадр | md5 |
|---|---|
| before-darrack-print-1.png | `2bc688d94bfdfb5edeacba53537153b6` |
| after-darrack-print-1.png | `d3035849c0239cd3276dbfc1a3f301f6` |
| before-torbin-print-1.png | `f9c9fc485f0367d753c9d1d05a339d8a` |
| after-torbin-print-1.png | `b09ba519dc58833b962c49549610638b` |
| before-sorcerer20-print-1.png | `4f194ab4bcba1f2aff2b49fceecc2708` |
| after-sorcerer20-print-1.png | `c2b7f756577adb99f6b131b5deec075e` |
| after-sorcerer20-print-3.png | `cabe84c55f535d7ddd89b0d0e575f48a` |
| before-blank-print-1.png | `23ab26bb8b22038aa90a7a4d6e85904e` |
| after-blank-print-1.png | `bef498e65107a1b92000644c5176c585` |
| official-2014-1.png | `5ecb717c89acc171eb4b10379579ca9b` |
| official-2014-3.png | `53ebdae0c20ebd98f58ef094d4c48c4a` |

PDF A4: `after-{darrack,torbin,sorcerer20,blank}-a4.pdf` (+ одноимённые `before-*`).

## Проверки

- `npm run build` — ok
- `npx tsx src/features/classicSheet/classicPrint14.selfcheck.ts` — ok
- Кадры сняты с живого Vite + API, не со стендов-заглушек
