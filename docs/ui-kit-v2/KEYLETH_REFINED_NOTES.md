# Листва × Keyleth — коррекция по Behance-рефам

Рефы (структура/UX, не копируем чужой бренд):
- Medication Management App — спокойные health-vitals, мягкий фон, ясный primary
- FYLLO — food quality (паттерн «проверка статуса» → чипы HP/готовности)
- IBKR Trading — модульные bento-карточки, крупный radius, сильная иерархия

## Что изменили относительно первой палитры A

| Было | Стало | Почему |
|------|-------|--------|
| accent `#3F6B45` | `#2F6A42` | чуть яснее CTA, ближе к «health green», не acid lime IBKR |
| bg `#F4F7F2` | `#EEF3EE` | мягче отделяет белые карточки (как в Medication) |
| radius 10–12 | **14–24** | как в современных app-кейсах |
| плоские превью | cards + soft shadow | глубина без неона |
| ginger только в тексте | chip XP / Вдохновение | рыжий Keyleth как spark |

## Картинки

В репо SVG: `boards/01-foundations.svg` … `04-lobby-hero.svg`  
PNG для просмотра: артефакты `keyleth-refined/`.

---

## Tactile + glass (зафиксировано)

Рефы Pinterest (mood only):
- neo-skeuomorphic buttons / switches
- frosted glass cards / modals

| Решение | Статус |
|---------|--------|
| Кнопки, свитчи, чекбоксы, слайдеры — tactile raised/pressed | **да** |
| Стекло на карточках / всплывашках / оболочках | **да** |
| Стекло на HP / КД / плотных таблицах | **нет** → solid soft-card |
| Паттерн листа | **hybrid:** glass chrome + solid vitals + tactile controls |

Спека: [`FOUNDATIONS_GLASS_TACTILE.md`](FOUNDATIONS_GLASS_TACTILE.md)  
Доски: `boards/05-controls-tactile.svg`, `06-glass-surfaces.svg`, `07-hybrid-sheet-preview.svg`  
PNG: артефакты `keyleth-glass/`.
