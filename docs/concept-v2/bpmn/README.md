# BPMN-карты процессов КриD20: листы и лобби

Дата: 21.11.2026, Екатеринбург (UTC+5).  
Источник истины — код прода `origin/main` @ `80947717` (слияние PR #545, 20.11.2026, 20:23, Екатеринбург, UTC+5), не локальный чекаут `/workspace/Dvarf` (там отсоединённый `HEAD` `6527dae0` от 15.11).

Карты нужны перед концептом лобби: листы и лобби связаны плотно, одни и те же функции могут быть в двух местах. Найденные пересечения пригодятся и для концептов создания персонажа, и для классического листа.

Ничего не выдумано. Чего в коде прода нет, стоит в разделе «Не найдено на проде». Секреты и админские email сюда не входят. Мир Who — тоже нет.

Сверка дополнительно с `/workspace/dark-theme-concept/`: `PRODUCTION-PLAN.md`, `CONCEPT.md`, `DECISIONS.md` (архив `concept-archive/DECISIONS.md`), `MOBILE-FINAL.md`, `pc-sheet-buttons-prod.md`, `creation-plan.md`.

---

## Схемы

Файлы `.bpmn` — валидный BPMN 2.0 с DI (открываются в [bpmn.io](https://demo.bpmn.io/) и Camunda Modeler). Рендеры — PNG и SVG.

| № | Процесс | BPMN | PNG | SVG |
|---|---------|------|-----|-----|
| 0 | Карта верхнего уровня | [00-overview.bpmn](00-overview.bpmn) | [png/00-overview.png](png/00-overview.png) | [svg/00-overview.svg](svg/00-overview.svg) |
| 1 | Регистрация / вход → список персонажей → онбординг | [01-auth-list-onboarding.bpmn](01-auth-list-onboarding.bpmn) | [png/01-auth-list-onboarding.png](png/01-auth-list-onboarding.png) | [svg/01-auth-list-onboarding.svg](svg/01-auth-list-onboarding.svg) |
| 2 | Создание персонажа 2014 и 2024 | [02-character-creation.bpmn](02-character-creation.bpmn) | [png/02-character-creation.png](png/02-character-creation.png) | [svg/02-character-creation.svg](svg/02-character-creation.svg) |
| 3 | Жизнь ПК-листа вне игры | [03-pc-sheet-life.bpmn](03-pc-sheet-life.bpmn) | [png/03-pc-sheet-life.png](png/03-pc-sheet-life.png) | [svg/03-pc-sheet-life.svg](svg/03-pc-sheet-life.svg) |
| 4 | Классический лист (печать / PDF) | [04-classic-sheet.bpmn](04-classic-sheet.bpmn) | [png/04-classic-sheet.png](png/04-classic-sheet.png) | [svg/04-classic-sheet.svg](svg/04-classic-sheet.svg) |
| 5 | Лобби: создание, приглашение, посадка | [05-lobby.bpmn](05-lobby.bpmn) | [png/05-lobby.png](png/05-lobby.png) | [svg/05-lobby.svg](svg/05-lobby.svg) |
| 6 | Игровая сессия в лобби | [06-session-play.bpmn](06-session-play.bpmn) | [png/06-session-play.png](png/06-session-play.png) | [svg/06-session-play.svg](svg/06-session-play.svg) |
| 7 | Синхронизация лист ↔ лобби | [07-sheet-lobby-sync.bpmn](07-sheet-lobby-sync.bpmn) | [png/07-sheet-lobby-sync.png](png/07-sheet-lobby-sync.png) | [svg/07-sheet-lobby-sync.svg](svg/07-sheet-lobby-sync.svg) |

Таблица дублей и пересечений: [DUPLICATES.md](DUPLICATES.md).

Снимок этой папки лежит также в хранилище бота: `concept-archive/bpmn/`.

---

## Легенда

У каждой схемы три пула (горизонтальные дорожки):

- **Игрок** — действия владельца персонажа (и наблюдателя, где это есть на проде).
- **Мастер** — владелец лобби, сомастер, ведущий стола (`can_run_session`).
- **Система / бэкенд** — REST API и WebSocket.

Пул «Админ» в эти семь процессов не понадобился: админские маршруты `/admin` и продуктовые события учёта в связке лист↔лобби не участвуют. Кабинет (`/cabinet`: пароль, OAuth-привязка, сессии, удаление аккаунта) относится к аккаунту, не к этим процессам.

| Фигура | Смысл |
|--------|--------|
| Круг (тонкий) | Старт |
| Круг (толстый) | Конец |
| Прямоугольник с человеком | Задача человека (экран, кнопка, форма) |
| Прямоугольник с шестерёнкой | Сервисная задача (эндпоинт, запись в БД, рассылка WS) |
| Прямоугольник с жирной рамкой | Ссылка на другой процесс карты (call activity) |
| Ромб | Развилка (exclusive gateway) |
| Сплошная стрелка | Поток внутри одной роли |
| Пунктирная стрелка | Сообщение между ролями: HTTP, WebSocket, BroadcastChannel |
| Бумажка | Примечание по коду прода, не новый шаг |

Подписи на пунктире — имена запросов и событий как в коде (`join`, `sheet_version`, `party_rest`, `session_changed` и т.п.).

---

## Краткая суть процессов (по коду)

1. **Вход.** `/login`: почта+пароль или OAuth Яндекс / VK ID; регистрация с подтверждением почты; сброс пароля. После входа — `/characters`. `WelcomeDialog` сегментирует тур и **создание не запускает**. Гостю кнопки создания нет.
2. **Создание.** Входы: кнопка списка (при открытом флаге — выбор 2014/2024), черновик `/characters/create/:id`, «Создать героя для этого лобби» (только 2014), копия при конфликте лобби (`action=copy`). Черновик и «Готово» через `POST/PATCH /characters` или `POST /characters/create-2024`.
3. **Лист.** Play Desk `/characters/:id`. Владелец пишет `PATCH` с `sheet_version`; при расхождении — `409 sheet_version_conflict`. Мастер лобби только смотрит (`character_edit_forbidden`). Другая вкладка — `BroadcastChannel` `dvarf.character-sheet`.
4. **Классический бланк.** `/characters/:id/classic` или пустой `/classic/blank`. Это **не второй редактор**: пишет только `sheet.ui.classic_*`. Печать A4. BroadcastChannel нет.
5. **Лобби.** Мастер создаёт лобби и код/QR. Игрок входит с `/join`. Действия join: `join` / `transfer` / `copy`. Правила старта (уровень, запреты, источники) и совпадение редакции. «Автопосадка» — предвыбор всех членов состава при **создании** сессии. В уже идущую сессию персонаж сам не сажается.
6. **Сессия.** Инициатива, ход, две атаки (`/combat/attack` и `/combat/sheet-attack`), реакция («Объявить» / «Нет реакции» / автопропуск 10 с), концентрация, хиты с профилем видимости, спасброски смерти (скрытие по `hidden_death_saves`), кубики/журнал, состояния, партийный отдых (открывает `RestDialog` на листах, сам не применяет), закрытие сессии ± запись в журнал.
7. **Синхронизация.** Источник правды героя — `characters` + `sheet` (владелец). Источник правды боя — `PlaySession`. Источник правды стола — лобби, правила, видимость. Стол пишет в чужой sheet только своими эндпоинтами. Каналы: `sheet_version`, BroadcastChannel, WS `session_changed` / `session_event` / `party_rest` / `turn_started` / `turn_economy_reset` / `lobby_resync` / `sheet_effects_changed`.

---

## Не найдено на проде (не выдумано)

- Общего API клонирования или импорта персонажа **нет**. Единственный клон — `POST /lobbies/join` с `action=copy` (черновик « (копия)», затем форма 2014).
- Вход «создать героя для лобби» и копия **не передают** `edition=2024` (`createHeroForLobbyHref`). Это путь в форму 2014.
- **Автопосадки в уже открытую сессию при входе в лобби нет.** Игрок жмёт «Сесть за стол». Предвыбор всех членов состава есть только в UI создания новой сессии (`LobbyDetailPage`, комментарий «LOBBY-FIX C»). На бэкенде пустой `character_ids` означает «никого не сажать», не «всем».
- OAuth на текущем `main` — **Яндекс и VK ID**. Google и Telegram в этом чекауте как рабочие провайдеры входа не найдены.
- `check_character_start_rules` **не проверяет** метод характеристик и стартовый набор: в комментарии сервиса прямо сказано, что их нет на готовом листе (`backend/app/services/start_rules.py`).
- `party_rest` **не применяет** отдых на сервере: пишет событие и шлёт WS; игрок сам закрывает `RestDialog` и делает `PATCH` листа.
- У карточки врага `EnemyCard` **нет** UI спасбросков от смерти. Спасброски напарников на проде: story-компаньон и живой купленный скакун — да; зверь следопыта, primal companion, drake, призванные, конструкты, свой облик — нет (`companionUsesDeathSaves`).
- Отдельного окна дикой магии у чародея нет (это уже зафиксировано в мобильном итоге).
- Классический бланк **не** подписан на BroadcastChannel и не пишет игровые поля.
- Способности/метод старта лобби показываются в сводке правил, но автоматической сверки method/kit при join нет.

---

## Как пересобрать рендеры

Генератор и скрипт рендера лежат в `_src/` (нужны Node, Chrome, пакеты `bpmn-js` и `puppeteer-core`).

```bash
cd /workspace/dark-theme-concept/bpmn/_src
python3 generate_maps.py
# статический сервер из этой папки на :8765
python3 -m http.server 8765 --bind 127.0.0.1
node render.mjs
```

Репозиторий продукта эти файлы не меняют. В `main` сливает только Игорь.
