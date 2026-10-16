---
name: dvarf-ui-kit
description: Canonical Dvarf frontend UI kit contract — tokens, 6 account themes, ability rail A, patterns, board map. Read before any frontend UI change in this repo.
---

# Dvarf UI Kit (обязательный контракт)

Перед **любой** работой в `frontend/` (стили, панели, кабинет, auth, лобби, create, print):

1. Прочитай [`docs/ui-kit/README.md`](../../../docs/ui-kit/README.md).
2. Открой нужную доску в [`docs/ui-kit/boards/`](../../../docs/ui-kit/boards/).
3. Сводная карта: [`dvarf-ui-kit-catalog-final.jpg`](../../../docs/ui-kit/boards/dvarf-ui-kit-catalog-final.jpg).

Нарушение кита = регрессия визуала. Отклонения только с явного ok Игоря + обновление `docs/ui-kit/`.

---

## Hard rules (шпаргалка)

| Правило | Деталь |
|---------|--------|
| Тема | только `--accent` / `--accent-soft` |
| Дефолт темы | **Листва** `#5a6b3d` / soft `#e5ecd4` |
| 6 тем = identity | медь / хвоя / охра / чернила / листва / слива |
| Характеристики | **всегда вариант A** — свои цвета, не тема |
| Нейтрали | `--panel #fbf7ec`, ink/muted/line/card общие |
| Danger | `#b42318`, не из темы |
| Type | Display `Source Serif 4`, UI `IBM Plex Sans` |
| Cards | только для interaction |
| Sticky toolbar | на полных панелях |
| Filters | chips, active = solid accent |
| Print | единственный hairline/плотный бланк; abilities всё равно A |

Live-эталоны уже в продукте: **Inventory / Attacks / Texts** — равняться на них + доски.

**Lobby Hub A1 LOCK** (`docs/ui-kit/README.md` §2q): сетка `.lobby-member-grid`, pill-табы `.lobby-hub-tab.is-active`, карточки `.lobby-member-card`.  
CSS-хвост в `frontend/src/index.css` помечен `UI KIT LOCK — Lobby Hub` (A1→D1). **Запрещено** подменять весь `index.css` с другой ветки — только merge классов. Preflight падает без этих маркеров.

---

## Порядок внедрения UI

1. **Волна A — единый кит, один цвет (Листва):** токены в `:root`, паттерны, rail A, desk/app chrome по доскам.  
2. **Волна B — выбор темы:** кабинет picker → `data-theme` / CSS vars → persist на аккаунт.

Не делать B раньше A.

---

## Когда нужна новая доска

- Новый **паттерн** (не атом) → доска в `docs/ui-kit/boards/` + строка в README §4.
- Проверка на Листве + одной не-зелёной теме.
- Согласование → код.

Атомы (Button / Chip / Field / Toast / Dialog) — из кита, без новой доски.

---

## Связанные skills

- План → ok → код: [`dvarf-dev-workflow`](../dvarf-dev-workflow/SKILL.md)
- Прод / деплой: [`dvarf-prod-lineage`](../dvarf-prod-lineage/SKILL.md)
- Контракт агентов: [`AGENTS.md`](../../../AGENTS.md) § UI Kit
