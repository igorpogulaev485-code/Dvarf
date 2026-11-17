# DICE-02b — отчёт (доправка 1 к PR #504)

## PR / ветка

- Ветка: `cursor/dice-roller-v2b-905d` (от `main` после DICE-02a / #499).
- PR: #504 → `main`. **Не мержить, не деплоить.**
- Зависимость: DICE-02a уже в `main`.

## Что сделано

### 1. Цифровой бросок на сервере

- `POST /sessions/{session_id}/rolls/digital` — формула + режим + подпись + `character_id` + `master_hidden`.
- Итог/кости считает сервер (`app/services/dice_formula.py`, `secrets.randbelow`); `total`/`breakdown` с клиента не принимаются.
- Единый клиентский путь: `postSheetRollToSession` / `recordDigitalRoll` (за столом ждёт ответ сервера).
- Вне сессии / «Только себе» — клиентский `fairRandom`, как в 02a.
- Анти-спам: ≤15 / 10 с и ≤300 / час на пользователя в сессии → 429 «Слишком много бросков, подождите немного» (digital и живой куб).
- Обрезка: если `roll`-событий > 1000 — удаляются самые старые `roll` в той же транзакции.

### 2. Общий лог партии

- Та же `SessionEventFeed` + WS `session_event`.
- У цифровых — плашки костей (`DiceFaces`); живой куб — 🎲.
- В панели d20 вкладка **«Стол»** при `open_session_id`.
- На странице сессии — `SessionDigitalRollPanel` (у ведущих — «Скрытый бросок»).

### 3. Скрытый бросок мастера и раскрытие

- `master_hidden` в payload; скрытый → заглушка «Мастер бросил скрыто».
- `POST /sessions/{session_id}/events/{event_id}/reveal` — только ведущие.
- `event_history`: Активно / Без бросков мастера / Выключено — как в ТЗ (раскрытый виден даже при hide_master_rolls).
- До раскрытия игрок **не** получает число/формулу/кости в HTTP `GET …/events` и в WS (stub payload).

### 4. Хранение / миграция

- Alembic `dice02b01widenroll` ← `admqf01bootstrapsrc`: `formula` 200, `breakdown` 500.
- Одна голова: `python -m alembic heads` → `dice02b01widenroll (head)`.

## Скрины (`/opt/cursor/artifacts/dice-v2/`)

Снято живьём: API `:8000` + Vite `:5173`, сессия из `/tmp/dice02b-live.json`.  
Два игрока + мастер — отдельные `browser.newContext()` (токены через `storageState`/initScript), без ручного переключения окон.  
Вьюпорты: **1440×900** и **390×844**, `deviceScaleFactor=1`, `screenshot scale=css`. Тур «За столом N из 4» закрыт перед съёмкой (onboarding done + Пропустить + снятие backdrop).

| Файл | Что видно |
|------|-----------|
| `skill-to-feed-{1440,390}.png` | Клик навыка «Магия» на листе Торина → строка «Магия» в ленте у мастера (итог + кости). |
| `attack-to-feed-{1440,390}.png` | Атака/урон «Урон: Боевой посох» в ленте мастера (формула `1d6+2`, кости). |
| `party-log-master-{1440,390}.png` | Лента у мастера: несколько бросков партии (в т.ч. «Сводка стола», навык Элары). |
| `party-log-player-{1440,390}.png` | Та же лента у второго игрока (отдельный browser context). |
| `sheet-tab-table-{1440,390}.png` | Панель d20 на листе, вкладка **«Стол»**, лог бросков за столом. |
| `dice-on-table-{1440,390}.png` | Режим «Кубики на столе» + запись **Живой куб** с итогом 17 и 🎲. |
| `hidden-master-{1440,390}.png` | Скрытый бросок у мастера: полный итог/формула/кости + кнопка «Раскрыть». |
| `hidden-player-{1440,390}.png` | У игрока заглушка «Мастер бросил скрыто», без числа; **без** оверлея тура. |
| `revealed-player-{1440,390}.png` | После «Раскрыть»: та же строка «Скрытая проверка» с тем же итогом/костями, что у мастера. |
| `sheet-2014-before-{1440,390}.png` | `origin/main` worktree, sample Торин Камнебород волшебник 5, без FAB, scrollTop=0. |
| `sheet-2014-after-{1440,390}.png` | Та же ветка/тот же sample (`/dev/dice-roller-preview?edition=2014&clean=1`), scrollTop=0. |
| `sheet-2014-diff-{1440,390}.png` | Попиксельный diff before↔after. |

`CAPTURE_REPORT.md` удалён (противоречил файлам). Дублирующие/лишние кадры убраны. Все перечисленные live-кадры имеют **разные md5**.

### Регресс 2014

| | 1440 | 390 |
|--|------|-----|
| размер | 1440×900 | 390×844 |
| before md5 | `9018e0090c2687192bd9fa2ec76294e2` | `8d2954ce950489d6a7bb11ed6cd268c6` |
| after md5 | `b84e94dd759d708f110e7107734e362d` | `0490b44fc8ec93e6a259f5705b669859` |
| DIFF | да, ~0.81% пикселей | да, ~6.36% пикселей |

**Объяснение DIFF:** один и тот же персонаж (Торин Камнебород, волшебник 5, sample classic 2014). Before снят с `origin/main` без FAB; after — с ветки DICE, на листе появляется FAB кубиков (и связанные слои панели). Шапка/создание/level-up не трогались. Ожидаемый визуальный diff только из DICE UI, не из поломки бланка 2014.

Before: `scripts/dice-before-from-main.sh` + `e2e/dice-before-from-main.spec.ts` (Pixel5 `deviceScaleFactor` принудительно 1, `scale: 'css'`).

### Скрытый payload (без токенов)

Файл: `/opt/cursor/artifacts/dice-v2/hidden-payload-proof.json`.

До раскрытия игрок получает:

```json
{
  "title": "Мастер бросил скрыто",
  "total": null,
  "formula": null,
  "breakdown": null,
  "payload": {
    "master_hidden": true,
    "revealed": false,
    "hidden_stub": true,
    "category": "roll",
    "digital": true
  }
}
```

После раскрытия — тот же `total` / `dice`, что у мастера (в proof: total `9`, d20=`7`).

## Тесты

| Проверка | Результат |
|----------|-----------|
| `pytest` `test_dice_02b_digital_rolls.py` + `test_dice02b_migration.py` | 16 passed |
| в т.ч. `test_player_api_payload_has_no_total_before_reveal` | stub без total/dice/formula |
| `test_master_hidden_broadcasts_stub` | WS stub игроку |
| анти-спам `test_rate_limit_burst` | 429 |
| `alembic heads` | одна голова `dice02b01widenroll` |
| frontend build | см. CI / локальный `npm run build` |
| live capture | multi-context Playwright, кадры выше |

Замечание: тост атаки на листе при бою со столом может кратко показать локальный расчёт до ответа сервера; навыки/панель/урон в ленте — серверные.

## Вопросы

Нет блокирующих. Не мержить и не деплоить по запросу.
