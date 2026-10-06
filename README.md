# Dvarf

Лист персонажа D&D: **карточка** и **классический лист** — одна сущность (как у ЛСС).

## Как устроено

| Путь | Что |
|---|---|
| `/` | Список карточек персонажей |
| `/characters/:id` | Карточка + кнопка «Открыть лист» |
| `/characters/:id/sheet` | Классический лист 2014 |

Правки на листе и в карточке пишутся в один store (`localStorage`). Позже тот же контракт можно повесить на API.

`rulesEdition` (правила) и `sheetLayout` (вёрстка) разделены: можно играть по 2014 на листе 2024.

## Запуск

```bash
npm install
npm run dev
```

## Прод (GitHub Pages)

После мержа в `main` workflow `.github/workflows/deploy-pages.yml` собирает сайт с `base=/Dvarf/`.

Нужно один раз включить **Settings → Pages → Source: GitHub Actions**.

URL: `https://igorpogulaev485-code.github.io/Dvarf/`
