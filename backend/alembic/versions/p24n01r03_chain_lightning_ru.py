"""Rename Chain Lightning RU to «Цепная молния» on an existing database.

Revision ID: p24n01r03
Revises: p24n01r02
Create Date: 2026-11-20

Commit c31a5616 (2026-11-17) rewrote the 2014 seed JSON
(catalog.json, spells_enriched_v1.json, frontend/public/spells-2014.json)
from «Пляшущая молния» to «Цепная молния», and the 2024 live card already
says «Цепная молния». No migration updated catalog_entries or character
sheets, so Postgres kept the name loaded by the earlier catalog insert.
Same shape as «Домен знаний» / p24n01r02: the seed moved, the database did not.

2024 name_ru was re-upserted by p24n01r02 from the current live JSON, so a
fresh 2024 row is already «Цепная молния». This revision still sets both
editions (slug chain_lightning and chain-lightning, or name_en Chain Lightning)
and rewrites the old phrase wherever a sheet, session roll, or catalog blob
stored it. Creature spell-lists in the 2024 seed are updated in the same
change so a later full reseed does not put «Пляшущая молния» back.

Does not enable RULES_EDITION_2024_OPEN. Does not touch English name_en.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p24n01r03"
down_revision: Union[str, Sequence[str], None] = "p24n01r02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_RU = "Пляшущая молния"
NEW_RU = "Цепная молния"


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table(table):
        return False
    return any(col["name"] == column for col in insp.get_columns(table))


def _replace_phrase(table: str, column: str, cast: str) -> None:
    if not _has_column(table, column):
        return
    op.execute(
        sa.text(
            f"""
            UPDATE {table}
            SET {column} = replace({column}::text, :old_ru, :new_ru)::{cast}
            WHERE {column}::text LIKE :like_ru
            """
        ).bindparams(old_ru=OLD_RU, new_ru=NEW_RU, like_ru=f"%{OLD_RU}%")
    )


def upgrade() -> None:
    if _has_column("catalog_entries", "name_ru"):
        op.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET name_ru = :new_ru
                WHERE kind::text = 'spell'
                  AND (
                    slug IN ('chain_lightning', 'chain-lightning')
                    OR lower(coalesce(name_en, '')) = 'chain lightning'
                  )
                  AND name_ru IS DISTINCT FROM :new_ru
                """
            ).bindparams(new_ru=NEW_RU)
        )
    if _has_column("catalog_name_revisions", "name_ru"):
        op.execute(
            sa.text(
                """
                UPDATE catalog_name_revisions
                SET name_ru = :new_ru
                WHERE name_ru = :old_ru
                """
            ).bindparams(old_ru=OLD_RU, new_ru=NEW_RU)
        )
    for table, column, cast in (
        ("catalog_entries", "data", "jsonb"),
        ("characters", "sheet", "jsonb"),
        ("session_events", "payload", "jsonb"),
        ("play_sessions", "combat", "jsonb"),
        ("play_sessions", "combatants", "jsonb"),
        ("setting_creatures", "data", "jsonb"),
    ):
        _replace_phrase(table, column, cast)
    if _has_column("session_events", "title"):
        for column in ("title", "formula", "breakdown"):
            if not _has_column("session_events", column):
                continue
            op.execute(
                sa.text(
                    f"""
                    UPDATE session_events
                    SET {column} = replace({column}, :old_ru, :new_ru)
                    WHERE {column} LIKE :like_ru
                    """
                ).bindparams(old_ru=OLD_RU, new_ru=NEW_RU, like_ru=f"%{OLD_RU}%")
            )


def downgrade() -> None:
    """No data rollback — the previous Russian name is not restored."""
    pass
