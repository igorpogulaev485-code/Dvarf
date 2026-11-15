# TOUR-01 — тур листа (5 шагов) + карточки «что здесь»

**Дата:** 2026-11-15  
**Ветка:** `cursor/tour01-sheet-tour-a0f2`  
**База:** `main` после #410 (`7b39856f`)  
**Приложение:** локальный Vite `:5173` + API `:8000`, сиды `uikit03@example.com`  
(воин `…aaa5`, жрец `…cc05`, пустые напарники `…cd01`)

## Что сделано

- Тур листа: **5 шагов** — Шапка → Хот-панель → Сцены → Ход в «Бою» → Справка.
- Без бейджа «Нужно настроить»; без автозапуска при открытии любого листа (welcome на листе больше не `armSheetTour`).
- Перед шагом «Ход» тур сам переключает на «Бой» и (на 390 у кастера) на «Атаки»; якорь — `turn-actions`, не переключатель «Атаки / Заклинания».
- Свёрнутая мобильная шапка: якорь `combat-vitals` остаётся на collapsed.
- Одноразовые карточки сцен: Исследование / Общение / Способности / Напарники; сегменты `dnd_new` + `product_new`; сброс «Показать подсказки снова»; `skip` — нет.

## Тексты тура (desktop; на 390 у сцен — «зажми», у хода — уточнение про сцену «Бой»)

| # | id | Заголовок | Текст |
|---|----|-----------|-------|
| 1 | `combat_header` | Шапка | Хиты, КД, скорость и отдых — живые числа сверху. Нажми плитку, чтобы изменить значение. |
| 2 | `hot_bar` | Хот-панель | Полоска под шапкой: запасы, концентрация, состояния и «Следующий раунд» для таймеров эффектов. Это не сцена — всегда на месте. |
| 3 | `desk_modes` | Сцены | Пять вкладок — пять ситуаций за столом: Бой, Исследование, Общение, Напарники, Способности. Наведи на вкладку — коротко напомним, что внутри. |
| 4 | `turn_actions` | Ход в «Бою» | Единая строка «Действие / Бонусное / Реакция»: нажми — появятся варианты, потраченное отмечается галкой. |
| 5 | `help` | Справка | Кнопка «Справка» вверху: карта листа, словарь и «Показать подсказки снова», если захочешь пройти тур ещё раз. |

## Тексты карточек сцен

| Сцена | Заголовок | Текст |
|-------|-----------|-------|
| Исследование | Исследование | Здесь ноша, кошелёк и предметы: что несёшь и что надето. Снаряжение — до или после стычки, не в середине хода. |
| Общение | Общение | Внешность и личность под рукой для ролевых сцен — без боевой панели. |
| Способности | Способности | Умения класса и расы, фильтры и кнопка «Использовать», когда мастер спросит «что умеешь». |
| Напарники | Напарники | Спутники и призывы рядом с тобой. Кнопка «Призвать» — когда класс или заклинание даёт компаньона. |
| Напарники (пусто) | Напарники | Пока пусто — нормально, если класс не даёт спутника. Когда появится фамильяр или призыв, управление будет здесь, включая «Призвать». |

Кнопка карточки: **Понятно**.

## Кадры (`/opt/cursor/artifacts/tour01/`)

Все md5 уникальны (40 кадров).

| Кадр | md5 |
|------|-----|
| `tour-01-header-fighter-1440.png` | `cc6d864e5dd7cc54f353c72c5c5abd0a` |
| `tour-01-header-fighter-390.png` | `ee5acd13237a4320e106fe91d93db189` |
| `tour-01-header-cleric-1440.png` | `ebbedca7cfa5af996d9f8a4c70ef4962` |
| `tour-01-header-cleric-390.png` | `42f35a39144aa199261842a92c471ea4` |
| `tour-02-hot-fighter-1440.png` | `67cc1d47ffc538043197b6e88c36c3fb` |
| `tour-02-hot-fighter-390.png` | `5421872735d51b191e31764c1f7e9f23` |
| `tour-02-hot-cleric-1440.png` | `b9a7efc9a262e18947f7645c3b0e0a43` |
| `tour-02-hot-cleric-390.png` | `45cce90b7e74fc49dbf7635d091948c0` |
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
| `scene-explore-intro-1440.png` | `7622fed254be5a73755dd06575a1def2` |
| `scene-explore-intro-390.png` | `68d2aae30d3bcc08acf048eb2c7483c9` |
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
| `scene-companions-intro-1440.png` | `3d06ce811469a3774b6c6bf15ed13cb9` |
| `scene-companions-intro-390.png` | `92652a477a0a3b39c15b9f7ecdeff44c` |
| `scene-companions-again-1440.png` | `86cd7171806dbe01a80483515bc1fb1a` |
| `scene-companions-again-390.png` | `7265f7892901385096f01e7abb15b620` |
| `scene-explore-after-restart-1440.png` | `8ed24cb453e0a30a881de1b77d8ea099` |
| `scene-explore-skip-390.png` | `9927644fc8f07456633e0498adaecbdc` |

Скрипт: `frontend/scripts/tour01-capture.mjs`.

## Проверки

- `npm run build` — ok  
- `npm run selfcheck:onboarding-copy` / `onboarding-display` / `onboarding-sync` / `tour01` — ok  
- `python -m alembic heads` → одна голова `onb03usr9c2e1` (без новых миграций)
