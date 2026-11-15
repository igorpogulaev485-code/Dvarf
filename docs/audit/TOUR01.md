# TOUR-01 — тур листа (5 шагов) + карточки «что здесь»

**Дата:** 2026-11-15 (доправка кадров #412)  
**Ветка:** `cursor/tour01-sheet-tour-a0f2`  
**База:** `main` после #410  
**Приложение:** локальный Vite `:5173` + API `:8000`, сиды `uikit03@example.com`  
(воин `…aaa5`, жрец `…cc05`, пустые напарники `…cd01`)

## Доправка после кадров #412

1. **Шапка (шаг 1):** якорь `combat-vitals` — union mid+right на desktop (плитки КД/скорость/иниц. + монеты/Отдых + хиты). На 390 — collapsed vitals с хитами в подсветке. Вид шапки не менялся.
2. **Напарники:** нейтральный текст (без «класс не даёт»); карточка `below-start` под блоком слева; если снизу нет места (390) — над блоком, не поверх футера.
3. **Исследование:** текст про справочник / надетое / авто КД и вес (подтверждено кодом: `CatalogCombobox`, `equipInventoryItem`, `armorClass` от надетого, вес в панели).
4. **Хот-панель:** «Она видна в любой сцене» вместо «Это не сцена — всегда на месте».

## Тексты тура

| # | id | Заголовок | Текст |
|---|----|-----------|-------|
| 1 | `combat_header` | Шапка | Хиты, КД, скорость и отдых — живые числа сверху. Нажми плитку, чтобы изменить значение. |
| 1′ | `combat_header` (390, свёрнутая) | Шапка | Сверху имя и хиты. Нажми хиты, чтобы изменить, а стрелку — чтобы увидеть КД, скорость и отдых. |
| 2 | `hot_bar` | Хот-панель | Полоска под шапкой: запасы, концентрация, состояния и «Следующий раунд» для таймеров эффектов. Она видна в любой сцене. |
| 3 | `desk_modes` | Сцены | Пять вкладок — пять ситуаций за столом: Бой, Исследование, Общение, Напарники, Способности. Наведи на вкладку — коротко напомним, что внутри. |
| 3′ | `desk_modes` (390) | Сцены | … Зажми вкладку — коротко напомним, что внутри. |
| 4 | `turn_actions` | Ход в «Бою» | Строка «Действие / Бонусное / Реакция»: нажми — появятся варианты, потраченное отмечается галкой. |
| 4′ | `turn_actions` (390) | Ход в «Бою» | В сцене «Бой» строка «Действие / Бонусное / Реакция»: нажми — появятся варианты, потраченное отмечается галкой. |
| 5 | `help` | Справка | Кнопка «Справка» вверху: карта листа, словарь и «Показать подсказки снова», если захочешь пройти тур ещё раз. |

## Тексты карточек сцен

| Сцена | Заголовок | Текст |
|-------|-----------|-------|
| Исследование | Исследование | Добавляй вещи из справочника, отмечай надетое — КД и вес посчитаются сами. |
| Общение | Общение | Внешность и личность под рукой для ролевых сцен — без боевой панели. |
| Способности | Способности | Умения класса и расы: фильтры и кнопка «Использовать», когда мастер спросит «что умеешь». |
| Напарники | Напарники | Здесь спутники, фамильяры и призванные существа: их хиты, атака и команды. Если пусто — подсказка выше скажет, как их получить. |

Кнопка карточки: **Понятно**. Отдельного empty-варианта больше нет.

## Кадры (`/opt/cursor/artifacts/tour01/`)

Все md5 уникальны (40 кадров). Пересняты после доправки: шаг 1–2 (fighter/cleric × 1440/390), `scene-explore-intro-*`, `scene-companions-intro-*`.

| Кадр | md5 |
|------|-----|
| `tour-01-header-fighter-1440.png` | `fede478b1bf86708992fa0e838e504fa` |
| `tour-01-header-fighter-390.png` | `d4e630bafa4453600e810fd6f58c1992` |
| `tour-01-header-cleric-1440.png` | `61146f9a6bd4cb2ae78c3d9baae8f4d8` |
| `tour-01-header-cleric-390.png` | `d9ee5c3041c3a89e39ce43c019da1ae0` |
| `tour-02-hot-fighter-1440.png` | `afcc6b41ed04475fe2388ef838defb32` |
| `tour-02-hot-fighter-390.png` | `c35392eb9fd6dd7da85fa77d674f46bb` |
| `tour-02-hot-cleric-1440.png` | `30d78014355e5277a93fe517ccbccae8` |
| `tour-02-hot-cleric-390.png` | `80135abf640caca2853e6344a6504326` |
| `tour-03-scenes-fighter-1440.png` | `300081dad0f14d480a29f3142890cb76` |
| `tour-03-scenes-fighter-390.png` | `44b1bd5bbf52a7bc209177da95525639` |
| `tour-03-scenes-cleric-1440.png` | `f8646f04630ff6e8d8f70c730a4c1261` |
| `tour-03-scenes-cleric-390.png` | `44aa50cfefaed0cb55b184ee13544e46` |
| `tour-04-turn-fighter-1440.png` | `96208896c25db92b5e61ae7dd6d52377` |
| `tour-04-turn-fighter-390.png` | `b78adcbbc0c441906095ec68da072710` |
| `tour-04-turn-cleric-1440.png` | `df5d2da7c7584ab882fbe34d6864a310` |
| `tour-04-turn-cleric-390.png` | `4df66d5f21de32cf43cf52f0fd707807` |
| `tour-05-help-fighter-1440.png` | `5f76ca2bfe25e11604d11e046edc245d` |
| `tour-05-help-fighter-390.png` | `ae5beb4095fdfdf705ef4ecec24c6fe1` |
| `tour-05-help-cleric-1440.png` | `da25e2f82a8469729ae55ca1edcd5e0b` |
| `tour-05-help-cleric-390.png` | `95ad070fc0ed20c15e9e7249aa5a8051` |
| `tour-help-restart-turn-1440.png` | `532b877a8c97892e9fab524aae434e25` |
| `tour-help-restart-turn-390.png` | `b9501871bd577b2de38a1046b63b33ed` |
| `scene-explore-intro-1440.png` | `7b29532859bf09fb0fcb6b51ed2936c3` |
| `scene-explore-intro-390.png` | `f0a313d0ce9e635737034e471a927a2f` |
| `scene-explore-again-1440.png` | `b025b2946017a296cad246162323f971` |
| `scene-explore-again-390.png` | `9e5f7c2ee03689dc922f5282892b8cc0` |
| `scene-social-intro-1440.png` | `1e07c85f0d9cdc5b8ba3529895ed80bd` |
| `scene-social-intro-390.png` | `27632db5206fe9de568d98d4899f589e` |
| `scene-social-again-1440.png` | `f1d8166a0c020bf740868caff197cb6e` |
| `scene-social-again-390.png` | `568937b8defc98e7eb07a804c0a5526a` |
| `scene-features-intro-1440.png` | `67bbdec440d84c901d56f73f944e63c9` |
| `scene-features-intro-390.png` | `3631df2094b7aaf8f5caec3889230916` |
| `scene-features-again-1440.png` | `09e0f29c04b396bec6a306a17b9d5f5e` |
| `scene-features-again-390.png` | `6442a81232b078b66d2416e2e0e29b19` |
| `scene-companions-intro-1440.png` | `41ca938c040f311070d1ac7b4fc85d8f` |
| `scene-companions-intro-390.png` | `1779df364a49faba5bad036792f6033f` |
| `scene-companions-again-1440.png` | `86cd7171806dbe01a80483515bc1fb1a` |
| `scene-companions-again-390.png` | `7265f7892901385096f01e7abb15b620` |
| `scene-explore-after-restart-1440.png` | `8ed24cb453e0a30a881de1b77d8ea099` |
| `scene-explore-skip-390.png` | `9927644fc8f07456633e0498adaecbdc` |

Скрипт: `frontend/scripts/tour01-capture.mjs`.

## Проверки

- `npm run selfcheck:onboarding-copy` / `onboarding-display` / `tour01` — ok  
- Spotlight assert: desktop HP+Отдых в hole; 390 collapsed HP в hole  
- `python -m alembic heads` — без новых миграций (одна голова)
