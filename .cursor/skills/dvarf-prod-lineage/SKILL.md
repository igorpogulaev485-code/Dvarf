---
name: dvarf-prod-lineage
description: Прод Dvarf — ветка main на Timeweb. Читать перед деплоем и перед правкой PRODUCT_STATUS. Ручной sync-and-up заморожен.
---

# Dvarf — прод = main

Сайт: https://creed20.tech/  
Код прода: ветка `main`. Линии tip больше нет.  
Выкладка: GitHub Actions **Deploy** (`workflow_dispatch`, environment `production`). Шаги и секреты: [`docs/deploy.md`](../../../docs/deploy.md).

## Не делать

1. Не запускать `./deploy/sync-and-up.sh` и не ходить на VPS по SSH, пока Игорь явно не попросил. Скрипт заморожен и больше не стирает `/opt/dvarf`.
2. Не деплоить GitHub Pages.
3. Не выкидывать из дерева кабинет, лобби, Play Desk, classic, бой, вики, сиды `backend/data/`.
4. Не писать в `PRODUCT_STATUS.md` «на проде», пока workflow Deploy не показал зелёный `/health`.
5. Не подменять `frontend/src/index.css` и `frontend/src/styles/` целиком. Порядок `@import` — это каскад. Маркер `UI KIT LOCK — Lobby Hub` лежит в `styles/26-lobby-hub-lock.css`.

Постмортем, зачем так: [`docs/INCIDENT_OVERWRITE_2026-10-17.md`](../../../docs/INCIDENT_OVERWRITE_2026-10-17.md). Контракт агента: [`AGENTS.md`](../../../AGENTS.md).

Живые `.env` и тома Docker (Postgres, uploads, сертификаты Caddy) при выкладке не удаляются. Фильтр: `deploy/rsync-filter.txt`.
