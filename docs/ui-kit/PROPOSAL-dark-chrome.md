# Предложение: тёмный chrome (доски до кода)

**Статус:** на согласование Игорю. Код продукта не трогаем, пока нет ok.

## Идея

- **Тёмный surface** — оболочка: список, карточка персонажа, модалки, тулбар, кнопки/chips.
- **Пергамент LOCK** — классический лист (`.sheet`) и print остаются как в ките.
- **Атомы те же** — `.btn`, `.chip`, `.card-panel`, `.modal`; меняются только нейтрали поверхности.
- **Тема аккаунта** — по-прежнему только `--accent` / `--accent-soft` (Листва и 5 остальных).

## Доски

| Доска | Что смотреть |
|-------|----------------|
| [`boards/dvarf-ui-kit-dark-chrome-foundations.jpg`](boards/dvarf-ui-kit-dark-chrome-foundations.jpg) | токены + атомы на dark |
| [`boards/dvarf-ui-kit-dark-chrome-vs-sheet.jpg`](boards/dvarf-ui-kit-dark-chrome-vs-sheet.jpg) | chrome dark vs лист parchment |
| [`boards/dvarf-ui-kit-dark-chrome-surfaces.jpg`](boards/dvarf-ui-kit-dark-chrome-surfaces.jpg) | список / карточка / модалка |

## Черновик токенов (chrome)

| Token | Hex | Роль |
|-------|-----|------|
| `--ink` | `#e8e4dc` | текст |
| `--muted` | `#9a958c` | вторичный |
| `--accent` | `#6a7d68` | Листва, чуть поднята для dark |
| `--accent-soft` | `#2a322c` | soft на dark |
| `--panel` | `#1c211e` | панели |
| `--line` | `#3f4842` | бордеры |
| `--card` | `#262c28` | raised |
| `--danger` | `#c46b6b` | деструктив |
| page bg | `#121613` | фон приложения |

`.sheet` держит пергаментные нейтрали кита (`--panel #fbf7ec`, ink тёмный и т.д.).

## После ok

1. Зафиксировать доски в контракте кита (строка в карте досок).
2. Только потом — токены + chrome в CSS.
3. Лист / print не в scope этой волны.
