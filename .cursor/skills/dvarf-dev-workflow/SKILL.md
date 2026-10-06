---
name: dvarf-dev-workflow
description: Workflow for building Dvarf with Игорь — plan first, code only after approval. Use on every feature, schema, API, or UI change in this repo. Also read dvarf-prod-lineage before any Timeweb deploy.
---

# Dvarf development workflow

## Hard rule — plan first

Before writing or changing product code:

1. **Publish a development plan** in chat (scope, entities/fields, decisions, out of scope, acceptance).
2. **Wait for Игоря to review and approve** (explicit ok / правки).
3. **Only then** implement, commit, push, PR.

Do not start coding, scaffolding, or migrations until the plan is approved for that slice.

## Hard rule — prod lineage (не затирать прод)

Перед **любым** деплоем на Timeweb и перед веткой «под прод» прочитай и выполни:

→ [`.cursor/skills/dvarf-prod-lineage/SKILL.md`](../dvarf-prod-lineage/SKILL.md)  
→ корневой [`AGENTS.md`](../../../AGENTS.md)

Кратко:

- `sync-and-up.sh` **затирает весь** `/opt/dvarf` (кроме `.env`).
- Работай и деплой **только от текущего prod tip** (сейчас `cursor/prod-lineage-rules-acbe`).
- Перед деплоем: `./deploy/preflight-prod.sh` (вызывается из sync-and-up).
- В `PRODUCT_STATUS.md` пиши «на проде: да» только после проверки живого сервера.

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
8. **Main** — do not push product work straight to `main`; use feature branches `cursor/<name>-acbe` (или `-eb8e` у старых PR).
9. **Prod tip** — branch from / merge current tip before Timeweb deploy; never deploy a divergent thin fork.

## Collaboration notes

- Prefer Russian in plans and summaries with Игорь
- Small vertical slices; avoid overbuilding permissions/billing early
- If scope creeps mid-implementation, pause and re-plan
- Parallel agents: separate PR ok; **one** integrated deploy from tip lineage only
- Deploy to Timeweb only on explicit «залей на сервер»
