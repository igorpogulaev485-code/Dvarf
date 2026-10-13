---
name: dvarf-prod-lineage
description: Prevent prod overwrite regressions on Dvarf Timeweb. Use before any deploy, when branching for prod work, when another agent may have shipped, or when updating PRODUCT_STATUS about live features.
---

# Dvarf — prod lineage (анти-overwrite)

## Почему это существует

`deploy/sync-and-up.sh` **заменяет всё дерево** на VPS (`/opt/dvarf`, кроме `.env`).  
Деплой с ветки без кабинета/листа/лобби = эти фичи **исчезают с прода**, даже если код жив в другом PR.

Инциденты:

- 2026-10-06: аватар, кабинет, лист P1–P6, classic — затирались параллельными развилками.
- 2026-10-13: orphan kit-ветка (пустой merge-base), час cherry-pick, API падал из‑за alembic в БД без файла в дереве, Docker Hub/BuildKit ~27+ мин.

## Hard rules

1. **Никогда не деплой** с ветки, которая не содержит **live** prod tip (читается с VPS).
2. **Перед деплоем**: `preflight-prod.sh` + `preflight-live.sh` (оба вызывает `sync-and-up.sh`).
3. **Один tip** — одна линия. После успешного деплоя обнови tip в:
   - `AGENTS.md`
   - этот skill
   - `deploy/README.md`
   - `PRODUCT_STATUS.md`
4. **PRODUCT_STATUS** — только после проверки живого сервера.
5. Параллельные агенты: ветки от tip; на сервер — один деплой после merge tip.
6. **Запрещено** собирать deploy-ветку cherry-pick’ами мимо tip при пустом `merge-base`.
7. **Запрещено** откатывать fast-path (`deploy/remote-up.sh`, nginx+dist) на `docker compose up -d --build` / node Dockerfile на VPS.

## Текущий prod tip

```text
cursor/create-pipeline-kit-prod-244b
```

URL: http://201.34.132.252/

Перед деплоем сверь tip с **живым** `/opt/dvarf/AGENTS.md` — локальная копия в feature-ветке может врать.

## Как начать слайс, который может попасть на прод

```bash
git fetch origin
# tip = строка с сервера / актуальный AGENTS
git checkout -b cursor/<descriptive>-acbe origin/<live-prod-tip>
```

Если ветка уже есть и отстала:

```bash
git fetch origin
git merge origin/<live-prod-tip>
./deploy/preflight-prod.sh
./deploy/preflight-live.sh   # нужен SSH / DVARF_SSH_PRIVATE_KEY
```

## Обязательные маркеры (preflight)

`deploy/preflight-prod.sh` — файлы контуров + fast-deploy:

| Контур | Маркер |
|--------|--------|
| Лобби | `JoinLobbyPage.tsx`, `lobbies.py` |
| Кабинет / SMTP | `SessionsPanel.tsx`, `mail.py` |
| Аватар | `AvatarEditor.tsx`, `avatar.py` |
| Лист P1–P6 | `raceEffects.ts`, `LevelUpDialog.tsx`, … |
| Classic | `ClassicSheetPage.tsx` |
| Fast deploy | `deploy/remote-up.sh`, nginx+dist `frontend/Dockerfile` |

`deploy/preflight-live.sh` — до затирания сервера:

| Проверка | Fail если |
|----------|-----------|
| Tip ancestry | `origin/<live-tip>` не ancestor of `HEAD` |
| Alembic | `alembic_version` в prod DB отсутствует в `backend/alembic/versions` |

## После деплоя (обязательно)

```bash
curl -fsS http://201.34.132.252/health
# бандл + маркеры на диске; remote-up.sh на месте
```

Потом `PRODUCT_STATUS.md`. Если tip сменился — обнови четыре места выше.

## Что делать, если уже затёрли

1. Не деплоить «починку» с ещё одной тонкой/orphan ветки.
2. Взять live tip + недостающие коммиты (`git merge`, не час cherry-pick).
3. Preflight local+live → деплой → маркеры → PRODUCT_STATUS.

## Связанные файлы

- [`AGENTS.md`](../../../AGENTS.md)
- [`deploy/README.md`](../../../deploy/README.md)
- [`deploy/preflight-prod.sh`](../../../deploy/preflight-prod.sh)
- [`deploy/preflight-live.sh`](../../../deploy/preflight-live.sh)
- [`deploy/remote-up.sh`](../../../deploy/remote-up.sh)
- [`PRODUCT_STATUS.md`](../../../PRODUCT_STATUS.md)
- [`dvarf-dev-workflow`](../dvarf-dev-workflow/SKILL.md)
