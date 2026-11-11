# Правила для агентов (Dvarf)

Читать перед любой задачей. Прод — ветка `main`, сайт https://creed20.tech/ (Timeweb VPS). Отдельной линии tip больше нет: слайсы ответвлять от `main`.

Деплой прода — только GitHub Actions [Deploy](.github/workflows/deploy.yml): `workflow_dispatch`, environment `production`. Ручной `./deploy/sync-and-up.sh` заморожен и не удаляет `/opt/dvarf` (живой `.env` и данные остаются). Секреты и шаги: [`docs/deploy.md`](docs/deploy.md). GitHub Pages запрещён. На VPS по SSH не заходить и workflow не запускать, пока Игорь явно не попросил.

## Как работать

1. Одна задача — один агент — один PR в `main`.
2. Баг или регресс записать в [`docs/bugs.md`](docs/bugs.md): симптом, где видно, что ожидалось.
3. В `main` код попадает только через PR. Мержит Игорь обычным merge commit, без squash и без rebase.
4. Секреты не коммитить: `.env`, ключи, пароли, токены.

## Что не ломать

- Визуал прода: [`docs/ui-kit/README.md`](docs/ui-kit/README.md) и skill `dvarf-ui-kit`. Не подменять `frontend/src/index.css` целиком и не снимать маркер `UI KIT LOCK — Lobby Hub`.
- Лист — полный Play Desk (`PlayDeskHeader`, сцены, rail, hot-bar, `MinimalSheetEditor`). Не рисовать другой стол и не выдавать mock за прод. Канон: [`docs/PLAY_DESK_SOURCE_OF_TRUTH.md`](docs/PLAY_DESK_SOURCE_OF_TRUTH.md).
- Не разбивать `index.css` и `MinimalSheetEditor.tsx` в чужой задаче — это отдельная работа.
- Актуальный срез фич — [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md). История слайсов — [`docs/changelog/`](docs/changelog/).

## Уже в дереве прода, не выкидывать

Кабинет и аватар, лобби по коду, полный Play Desk, классический бланк 2014/2024, бой на сессии, вики сеттинга, сиды `backend/data/`. Тонкая ветка без этих файлов не должна попадать в `main`.

Постмортем затирания 2026-10-17: [`docs/INCIDENT_OVERWRITE_2026-10-17.md`](docs/INCIDENT_OVERWRITE_2026-10-17.md).

## Перед PR

- `frontend`: `npm ci`, затем `npm run build`.
- `backend`: `pip install -r requirements.txt -r requirements-dev.txt`, затем `pytest`.
- Ровно одна голова Alembic: из каталога `backend` команда `python -m alembic heads`.
