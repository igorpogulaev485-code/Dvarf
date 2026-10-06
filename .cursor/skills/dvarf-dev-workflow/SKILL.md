---
name: dvarf-dev-workflow
description: Workflow for building Dvarf with Игорь — plan first, code only after approval; deploy to Timeweb only on explicit command. Use on every feature, schema, API, UI, or prod deploy change in this repo.
---

# Dvarf development workflow

## Hard rule

Before writing or changing product code:

1. **Publish a development plan** in chat (scope, entities/fields, decisions, out of scope, acceptance).
2. **Wait for Игорь to review and approve** (explicit ok / правки).
3. **Only then** implement, commit, push, PR.

Do not start coding, scaffolding, or migrations until the plan is approved for that slice.

## Plan format (keep short)

- Goal of the slice
- What we build / change
- Data model or API contracts
- Explicit decisions and open questions
- Out of scope
- Acceptance criteria
- Proposed file/layout touchpoints (no code yet)

## Product context (stable)

- Product: **Dvarf** (own DnD tooling; not built on Long Story Short)
- Stack: React (mobile-first, later RN) + Python FastAPI + Postgres
- MVP north star: character sheet → party frame → encounter prep → loot
- Users have no global master/player role; party later introduces master
- Billing later; thin auth first
- Plan → approve → code on every iteration

## Backlog ideas (do not implement until planned)

- Personal cabinet: edit profile fields; later product convenience features
- Multiple auth methods per account (password + Yandex + VK + Google where allowed); link/unlink in cabinet
- Party frame QR code for join / account-to-account interactions (with party master)
- Phone/SMS login later (paid); store phone non-unique for now
- Google OAuth: not for RF users/region; geo-gate or omit for RU-first launch

## Git commit / push rules (accepted)

1. **After an approved plan slice is implemented** — make a commit. One logical slice → one (or few clear) commits.
2. **Commit message** — short, in English or Russian, explains *what* and *why* (not a file list).
3. **Push** the branch after the commit(s) for that slice — do not leave finished work only local.
4. **PR** — create or update the PR for the branch after push; keep description aligned with the approved plan.
5. **Never commit secrets** — no `.env` with real keys, tokens, passwords, OAuth secrets. Use `.env.example` / `.env.prod.example` only.
6. **Do not commit broken half-migrations** — a pushed slice must apply cleanly (migrate up works).
7. **Plan changes mid-flight** — if scope changes, stop, re-plan, get ok, then continue with a new commit.
8. **Main** — do not push product work straight to `main`; use `cursor/<name>-eb8e` / `cursor/<name>-fe27` feature branches.

## Prod deploy to Timeweb (accepted)

Prod host: Timeweb VPS, app path `/opt/dvarf`, public URL `http://201.34.132.252/` (until domain).
Stack: `docker compose -f docker-compose.prod.yml` (Postgres + FastAPI + nginx/React).
Secrets live only on the server in `/opt/dvarf/.env` — never sync that file into git.

### When to deploy

- Deploy **only** after Игорь explicitly asks (`залей на сервер` / `deploy` / equivalent).
- Do **not** auto-deploy after every commit/PR.
- Default deploy source: the product branch Игорь named for the slice (until `main` is the prod source of truth).

### Deploy steps (agent)

1. Ensure the approved slice is committed and pushed.
2. Sync project files to `/opt/dvarf` **without overwriting** `/opt/dvarf/.env`.
3. On the server: `docker compose -f docker-compose.prod.yml --env-file .env up -d --build`.
4. API runs `alembic upgrade head` on start — do not deploy broken migrations.
5. Verify `GET /health` → 200; briefly report what was released and the URL.
6. Do not change prod `.env` (DB password, JWT, OAuth) without a separate explicit ok.

### Do not

- Commit or print prod secrets
- Wipe `/opt/dvarf/.env`
- Deploy half-finished slices or failing migrate-up
- Touch the server for “just in case” without a deploy ask

Details: `deploy/README.md`.

## Collaboration notes

- Prefer Russian in plans and summaries with Игорь
- Small vertical slices; avoid overbuilding permissions/billing early
- If scope creeps mid-implementation, pause and re-plan
