# Dvarf — гайдлайны дизайн-системы (рабочая шпаргалка)

Полный план: [`REDESIGN_PLAN.md`](REDESIGN_PLAN.md).  
Контракт токенов: UI Kit на tip Wave A (`docs/ui-kit/README.md`).

---

## Do

- Листва `#5a6b3d` / soft `#e5ecd4` как дефолт accent.
- Source Serif 4 — заголовки панелей и бренд; IBM Plex Sans — UI.
- Ability rail **вариант A** (identity-цвета), не перекрашивать темой.
- Cards только там, где есть выбор/действие.
- Glance → expand для длинных списков.
- Один primary CTA на экран/sheet.
- Mobile: bottom sheets для pads/cast; ModeTab + одна сцена.
- Новый паттерн → доска в `docs/ui-kit/boards` → ok Игоря → код.
- Motion: mode-crossfade, hp-pulse, sheet-rise (см. план §6).

## Don’t

- Параллельные палитры, purple-glow, Inter-only, white dashboard.
- Красить `--panel` / `--ink` / `--danger` темой аккаунта.
- Декоративные карточки в hero.
- Двойной выбор «режим + панель».
- Фейковый боевой UI на сессии, пока нет combat frame.
- Менять handlers / формулы «заодно» с restyle.
- Анимировать всё подряд; игнорировать `prefers-reduced-motion`.

## Состояния компонентов (минимум)

| State | Визуал |
|-------|--------|
| default | panel/card + line |
| hover | +4% ink overlay / soft accent |
| active / on | solid accent или accent-soft fill |
| disabled | 40% opacity, no pointer |
| loading | skeleton / button label «…» |
| danger | danger border/text, confirm |
| empty | muted one-liner + soft CTA |
| focus | `--focus-ring` 2px offset |

## Иконки

- Есть: инвентарь, vitals/desk header.
- Нужны до кода: **магия / каст / слоты**, довести hot-bar.
- Правило: иконки → кит → потом верстка блока.
