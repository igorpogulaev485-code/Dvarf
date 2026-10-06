---
name: dvarf-dev-workflow
description: Workflow for building Dvarf with Игорь — audit existing product first, plan before coding, integrate into server app (not greenfield), deploy only on explicit command. Use on every feature in this repo.
---

# Dvarf development workflow

## Hard rules (read before any work)

1. **Never treat this repo as empty / greenfield** just because `main` looks thin.
2. **Before planning or coding**, audit what already exists (branches, PRs, sibling agents, prod).
3. **Integrate into the existing product** (auth, cabinet, character cards, API, interactive sheet). Do not ship a parallel mini-app, GitHub Pages prototype, or localStorage-only product unless Игорь explicitly asks for a throwaway spike.
4. **Plan first → wait for ok → then code** (see below).
5. **Deploy to Timeweb only** on explicit command («залей на сервер» / deploy). Never deploy on your own after a PR.

## Step 0 — Product discovery (mandatory every run)

Do this at the start of a task, even if the checkout looks empty:

```bash
git fetch --all --prune
git branch -a
git log --oneline --all -20
```

Then inspect the **richest product branches**, not only `main`. Typical sources of truth (names may evolve — pick the newest complete stack):

- Branches with `backend/` + `frontend/` + `docker-compose*.yml` (e.g. `cursor/sheet-*`, `cursor/cabinet-*`, `cursor/prod-deploy-*`)
- Character UI under `frontend/src/features/characters/` and pages `/characters`, `/characters/:id`
- API under `backend/app/api/routers/characters.py` and sheet JSON in `character_sheet.py`
- Deploy: `deploy/sync-and-up.sh`, prod URL `http://201.34.132.252/`

Also check sibling Cloud Agents / open PRs for overlapping work. Prefer basing new work on the branch that already has cards + sheet + auth, then open a PR into that line (or rebase onto it) — **not** onto empty `main`.

### Anti-patterns (forbidden unless explicitly requested)

- Scaffolding a new Vite app at repo root while `frontend/` + `backend/` already exist on another branch
- Replacing server characters with `localStorage`-only cards
- Hosting «prod» on GitHub Pages when the product already runs on the VPS
- Duplicating models/routes that already exist under different names

### Integration checklist for UI features

- If it belongs to a character: entry point is the **character card / detail page**
- Same character id → same API entity (`GET/PATCH /characters/:id`)
- Classic / printable sheet is a **second view** of that entity (like LSS digital ↔ classic), with autosave back into `sheet`
- Auth stays via existing session (`RequireAuth`, existing tokens)

## Plan → approve → code

Before writing or changing product code:

1. Publish a short plan (goal, touchpoints in existing files, data/API, out of scope, acceptance).
2. Wait for Игорь’s ok / правки.
3. Only then implement, commit, push, PR.

### Plan format

- Goal of the slice
- What already exists that we reuse
- What we change (files / routes)
- Data model or API contracts
- Decisions / open questions
- Out of scope
- Acceptance criteria

## Product context (stable)

- Product: **Dvarf** (own DnD tooling; inspired by LSS UX, not built on LSS)
- Stack: React (mobile-first) + FastAPI + Postgres + Docker
- MVP north star: character sheet → party frame → encounter prep → loot
- Users have no global master/player role; party later introduces master
- Prod: Timeweb VPS `http://201.34.132.252/` via `./deploy/sync-and-up.sh` (SSH secret `DVARF_SSH_PRIVATE_KEY`)

## Deploy rules

1. Code slice: plan → ok → commit → push → PR.
2. Deploy **only** when Игорь says so.
3. Never commit or overwrite server `/opt/dvarf/.env`.
4. After deploy: check `/health`, report URL + what shipped.
5. If SSH secret is missing/truncated, stop and request `DVARF_SSH_PRIVATE_KEY` (full PEM) — do not invent another hosting.

## Git rules

1. One approved slice → commit(s) with clear message (what/why).
2. Push the branch; create/update PR.
3. No secrets in git.
4. Feature branches: `cursor/<descriptive-name>-013d` (or the suffix required by the current agent instructions).
5. Do not force product work onto empty `main` when the live stack lives on feature branches — branch from the current product tip.

## Collaboration

- Prefer Russian with Игорь
- Small vertical slices
- If scope creeps: pause, re-plan, get ok
