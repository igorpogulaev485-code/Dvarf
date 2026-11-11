# Figma flows — Dvarf

Блок-схемы в SVG для Figma / FigJam: **13 продуктовых** + **28 кейсов листа (K1–K28)**.

## Как импортировать

1. Открой Figma (Design или FigJam).
2. Перетащи файл `.svg` на холст **или** `File → Place image…` / `Shift+Ctrl+K`.
3. Каждый файл = один фрейм (artboard). При необходимости `Ungroup` — узлы векторные.
4. Шрифт: IBM Plex Sans (фолбэк Inter/Arial).

## Легенда

| Форма | Значение |
|-------|----------|
| Тёмная капсула | Старт / финиш |
| Зелёный прямоугольник | Экран / маршрут |
| Песочный прямоугольник | Действие пользователя |
| Ромб | Развилка |
| Пунктир | Stub / ограничение |
| Голубой | Роль |

## Продуктовые flow (01–12)

- [`00-index.svg`](00-index.svg) — **00 · Индекс схем Dvarf** — 13 продуктовых + 28 кейсов K01–K28 · drag-and-drop в Figma
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

## Кейсы листа K1–K28

По одному artboard на кейс из [`PLAY_DESK_MICROFLOWS.md`](../../PLAY_DESK_MICROFLOWS.md) §0.

- [`K01.svg`](K01.svg) — **K1 · Desk ≥960px** — Открыл лист на планшете/ПК
- [`K02.svg`](K02.svg) — **K2 · Телефон · одна зона** — Mobile: панель через select
- [`K03.svg`](K03.svg) — **K3 · Урон / лечение** — Vitals · HP pad
- [`K04.svg`](K04.svg) — **K4 · 0 HP · смерть** — Death saves
- [`K05.svg`](K05.svg) — **K5 · Концентрация + урон** — WAVE concentration check
- [`K06.svg`](K06.svg) — **K6 · Отдых** — Короткий / продолжительный
- [`K07.svg`](K07.svg) — **K7 · Атака оружием** — Режим Бой → Атаки
- [`K08.svg`](K08.svg) — **K8 · Надел доспех / щит** — Экип → КД
- [`K09.svg`](K09.svg) — **K9 · Конфликт рук** — 2H vs 1H×2
- [`K10.svg`](K10.svg) — **K10 · Нет владения доспехом** — Equip blocked
- [`K11.svg`](K11.svg) — **K11 · Attunement** — Настройка магии
- [`K12.svg`](K12.svg) — **K12 · Каст заклинания** — Prepare → Cast
- [`K13.svg`](K13.svg) — **K13 · Каст при концентрации** — Смена концентрации
- [`K14.svg`](K14.svg) — **K14 · Нет ячеек** — Cast disabled
- [`K15.svg`](K15.svg) — **K15 · Сброс short-rest** — Pact / короткие ресурсы
- [`K16.svg`](K16.svg) — **K16 · Level-up / мультикласс** — +1 уровень
- [`K17.svg`](K17.svg) — **K17 · Смена архетипа** — Subclass change
- [`K18.svg`](K18.svg) — **K18 · Донастройка после create** — createGuide grants
- [`K19.svg`](K19.svg) — **K19 · Напарники** — Спутник / призвать
- [`K20.svg`](K20.svg) — **K20 · Тексты и заметки** — Личность / скрыть
- [`K21.svg`](K21.svg) — **K21 · Аватар персонажа** — Upload / delete
- [`K22.svg`](K22.svg) — **K22 · В лобби с листа** — Код мастера
- [`K23.svg`](K23.svg) — **K23 · Конфликт вкладок** — Version conflict
- [`K24.svg`](K24.svg) — **K24 · Classic печать** — Классический лист 2014
- [`K25.svg`](K25.svg) — **K25 · Проверка навыка** — Skill strip / колонка
- [`K26.svg`](K26.svg) — **K26 · Расходник в бою** — Избранное ≤3
- [`K27.svg`](K27.svg) — **K27 · Перегруз** — СИЛ × 15
- [`K28.svg`](K28.svg) — **K28 · Очки чародейства** — Sorcery points

## Источники

- [`USER_FLOW.md`](../../USER_FLOW.md)
- [`PLAY_DESK_MICROFLOWS.md`](../../PLAY_DESK_MICROFLOWS.md)

## Перегенерация

```bash
python3 scripts/generate_figma_flows.py
```
