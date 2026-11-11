---
name: dvarf-dev-workflow
description: Workflow for building Dvarf with Игорь — plan first, code only after approval. Use on every feature, schema, API, or UI change in this repo. Prod is main; deploy only via GitHub Actions, see docs/deploy.md.
---

# Dvarf development workflow

## Hard rule — UI Kit first (frontend)

Any change under `frontend/` must follow the canonical UI Kit:

→ [`docs/ui-kit/README.md`](../../../docs/ui-kit/README.md)  
→ [`.cursor/skills/dvarf-ui-kit/SKILL.md`](../dvarf-ui-kit/SKILL.md)  
→ boards in `docs/ui-kit/boards/`

Plan slices that touch UI must name the kit boards they follow. New patterns need a board + Игорь ok before code. Implementation order: unified kit in default **Листва** first, account theme picker second.

## Hard rule — plan first

Before writing or changing product code:

1. **Publish a development plan** in chat (scope, entities/fields, decisions, out of scope, acceptance).
2. **Wait for Игоря to review and approve** (explicit ok / правки).
3. **Only then** implement, commit, push, PR.

Do not start coding, scaffolding, or migrations until the plan is approved for that slice.

## Friends announce (когда просят)

Если Игорь пишет **«сделай сообщение для друзей»** / пост / анонс «в стандартном формате» — не changelog и не PRODUCT_STATUS. Готовый пост в чат:

→ [`.cursor/skills/dvarf-friends-announce/SKILL.md`](../dvarf-friends-announce/SKILL.md)

## Hard rule — прод = main

→ [`AGENTS.md`](../../../AGENTS.md) · [`docs/deploy.md`](../../../docs/deploy.md) · skill [`dvarf-prod-lineage`](../dvarf-prod-lineage/SKILL.md)

- Ветки слайсов от `main`. Отдельной линии tip нет.
- Выкладка на Timeweb только workflow Deploy. `sync-and-up.sh` заморожен и не стирает `/opt/dvarf`.
- GitHub Pages не использовать. На VPS по SSH не заходить без явной просьбы Игоря.
- Образы на VPS по-прежнему через `deploy/remote-up.sh` и nginx+dist `frontend/Dockerfile`.
- В `PRODUCT_STATUS.md` «на проде» — только после зелёного `/health` у Deploy.

## Plan format (keep short)

- Goal of the slice
- What we build / change
- Data model or API contracts
- Explicit decisions and open questions
- Out of scope
- Acceptance criteria
- Proposed file/layout touchpoints (no code yet)
- If deploy possible: confirm base = prod tip

## Product context (stable)

- Product: **Dvarf** (own DnD tooling; not built on Long Story Short)
- Stack: React (mobile-first, later RN) + Python FastAPI + Postgres
- MVP north star: character sheet → lobby/session → encounter prep → loot
- Live status file: `PRODUCT_STATUS.md`
- Users have no global master/player role; lobby creator is table master
- Billing later; thin auth first
- Plan → approve → code on every iteration

## Git commit / push rules (accepted)

1. **After an approved plan slice is implemented** — make a commit. One logical slice → one (or few clear) commits.
2. **Commit message** — short, in English or Russian, explains *what* and *why* (not a file list).
3. **Push** the branch after the commit(s) for that slice — do not leave finished work only local.
4. **PR** — create or update the PR for the branch after push; keep description aligned with the approved plan.
5. **Never commit secrets** — no `.env` with real keys, tokens, passwords, OAuth secrets. Use `.env.example` only.
6. **Do not commit broken half-migrations** — a pushed slice must apply cleanly (migrate up works).
7. **Plan changes mid-flight** — if scope changes, stop, re-plan, get ok, then continue with a new commit.
8. **Main** — do not push product work straight to `main`; use feature branches. Мерж в `main` делает Игорь обычным merge commit.
9. **Прод** — это `main`. Не деплоить с tip-ветки и не запускать `sync-and-up`.
10. **Migrations** — в дереве одна голова Alembic. На VPS `alembic upgrade head` выполняет workflow, до перезапуска API.

## Collaboration notes

- Prefer Russian in plans and summaries with Игорь
- Small vertical slices; avoid overbuilding permissions/billing early
- If scope creeps mid-implementation, pause and re-plan
- Один агент — одна задача — один PR в `main`
- Деплой на Timeweb только workflow Deploy; агент его не запускает, пока Игорь явно не попросил
