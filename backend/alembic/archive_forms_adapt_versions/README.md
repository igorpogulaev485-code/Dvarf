# Archive: alembic revisions from `forms-adapt-tip-ab5e`

These files are **not** on the live alembic path (`versions/`).

Why: the B→C / D1 tip reused short revision ids (`a0b1…`, `b1c2…`, `b7c8…`) for
unrelated lobby/session migrations. Dropping the forms-adapt files into
`versions/` would collide ids or create multiple heads and break
`alembic upgrade head`.

Prod DB already applied the forms-adapt seed lineage historically (bestiary,
feats, races, etc.). Seed **JSON** lives under `backend/data/`.

If a fresh DB needs a missing upsert, write a **new** idempotent migration
after the current tip head — do not revive these filenames/ids as-is.
