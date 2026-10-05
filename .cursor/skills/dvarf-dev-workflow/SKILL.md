---
name: dvarf-dev-workflow
description: Workflow for building Dvarf with Игорь — plan first, code only after approval. Use on every feature, schema, API, or UI change in this repo.
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

## Collaboration notes

- Prefer Russian in plans and summaries with Игорь
- Small vertical slices; avoid overbuilding permissions/billing early
- If scope creeps mid-implementation, pause and re-plan
