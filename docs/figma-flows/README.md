# Figma flows — Dvarf

Блок-схемы всех задокументированных user flow в SVG для импорта в Figma / FigJam.

## Как импортировать

1. Открой Figma (Design или FigJam).
2. Перетащи файл `.svg` на холст **или** `File → Place image…` / `Shift+Ctrl+K`.
3. Каждый файл = один фрейм (artboard). При необходимости `Ungroup` / Outline — узлы остаются векторными.
4. Шрифт в файлах: IBM Plex Sans (фолбэк Inter/Arial). Подключи Plex в файле Figma для пиксель-мэтча.

## Легенда

| Форма | Значение |
|-------|----------|
| Тёмная капсула | Старт / финиш |
| Зелёный прямоугольник | Экран / маршрут |
| Песочный прямоугольник | Действие пользователя |
| Ромб | Развилка |
| Пунктир | Stub / ограничение |
| Голубой | Роль |

## Файлы

- [`00-index.svg`](00-index.svg) — **00 · Индекс схем Dvarf** — Все SVG в docs/figma-flows · импорт в Figma drag-and-drop
- [`01-happy-path.svg`](01-happy-path.svg) — **01 · Happy path** — Сквозной путь игрока: аккаунт → персонаж → лист → лобби
- [`02-auth-cabinet.svg`](02-auth-cabinet.svg) — **02 · Аккаунт и кабинет** — Регистрация, verify, OAuth, сброс пароля, смена email
- [`03-create-2014.svg`](03-create-2014.svg) — **03 · Создание персонажа 2014** — Пайплайн /characters/create · черновик · готово
- [`04-create-2024-wizard.svg`](04-create-2024-wizard.svg) — **04 · Создание 2024 + GuidedWizard** — background-first на листе; level-up — тот же движок
- [`05-lobby-session.svg`](05-lobby-session.svg) — **05 · Лобби и сессия** — Мастер создаёт стол; игрок входит по коду/QR
- [`06-sheet-modes.svg`](06-sheet-modes.svg) — **06 · Режимы play desk** — Breakpoint 960px · Бой/Исслед./Общение/Напарники (+ WAVE)
- [`07-vitals-combat.svg`](07-vitals-combat.svg) — **07 · Vitals и бой (K3–K5)** — Урон, смерть, концентрация, вдохновение
- [`08-rest.svg`](08-rest.svg) — **08 · Отдых (K6, K15)** — Короткий / продолжительный · pact reset
- [`09-inventory-gear.svg`](09-inventory-gear.svg) — **09 · Инвентарь и экип (K8–K11, K27)** — Hands, wear, attunement, AC, перегруз
- [`10-spells-cast.svg`](10-spells-cast.svg) — **10 · Заклинания (K12–K15)** — Prepare · cast · upcast · pact · концентрация
- [`11-levelup-archetype.svg`](11-levelup-archetype.svg) — **11 · Level-up и архетип (K16–K18)** — Мультикласс, ASI, смена подкласса
- [`12-sheet-extras-sync.svg`](12-sheet-extras-sync.svg) — **12 · Напарники, classic, sync (K19–K24)** — Лобби с листа, конфликт вкладок, печать

## Источники

- [`USER_FLOW.md`](../../USER_FLOW.md)
- [`PLAY_DESK_MICROFLOWS.md`](../../PLAY_DESK_MICROFLOWS.md)

## Перегенерация

```bash
python3 scripts/generate_figma_flows.py
```
