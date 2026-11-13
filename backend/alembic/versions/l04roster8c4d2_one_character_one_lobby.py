"""L-04: one character — one lobby; seat retention hook.

Revision ID: l04roster8c4d2
Revises: l02media7b3e1
Create Date: 2026-11-13

- Deduplicate lobby_members by character_id (keep newest joined_at, then max id).
- Drop seats in those lobbies for the removed memberships.
- Unique constraint on lobby_members.character_id.
- session_seats.retained_after_kick for S-05 / «оставить до конца боя».
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "l04roster8c4d2"
down_revision: Union[str, Sequence[str], None] = "l02media7b3e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "lobby_members" in tables:
        existing_uc = {
            uc["name"] for uc in inspector.get_unique_constraints("lobby_members")
        }
        existing_ix = {ix["name"] for ix in inspector.get_indexes("lobby_members")}
        has_unique = (
            "uq_lobby_members_character" in existing_uc
            or "uq_lobby_members_character" in existing_ix
        )
        if not has_unique:
            # Keep newest membership per character; drop the rest + their seats.
            op.execute(
                sa.text(
                    """
                    WITH ranked AS (
                        SELECT
                            id,
                            lobby_id,
                            character_id,
                            ROW_NUMBER() OVER (
                                PARTITION BY character_id
                                ORDER BY joined_at DESC NULLS LAST, id DESC
                            ) AS rn
                        FROM lobby_members
                    ),
                    doomed AS (
                        SELECT id, lobby_id, character_id FROM ranked WHERE rn > 1
                    )
                    DELETE FROM session_seats AS ss
                    USING doomed AS d, play_sessions AS ps
                    WHERE ss.character_id = d.character_id
                      AND ss.session_id = ps.id
                      AND ps.lobby_id = d.lobby_id
                    """
                )
            )
            op.execute(
                sa.text(
                    """
                    WITH ranked AS (
                        SELECT
                            id,
                            ROW_NUMBER() OVER (
                                PARTITION BY character_id
                                ORDER BY joined_at DESC NULLS LAST, id DESC
                            ) AS rn
                        FROM lobby_members
                    )
                    DELETE FROM lobby_members
                    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
                    """
                )
            )
            op.create_unique_constraint(
                "uq_lobby_members_character",
                "lobby_members",
                ["character_id"],
            )

    if "session_seats" in tables:
        cols = {c["name"] for c in inspector.get_columns("session_seats")}
        if "retained_after_kick" not in cols:
            op.add_column(
                "session_seats",
                sa.Column(
                    "retained_after_kick",
                    sa.String(length=32),
                    nullable=True,
                ),
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "session_seats" in tables:
        cols = {c["name"] for c in inspector.get_columns("session_seats")}
        if "retained_after_kick" in cols:
            op.drop_column("session_seats", "retained_after_kick")

    if "lobby_members" in tables:
        existing_uc = {
            uc["name"] for uc in inspector.get_unique_constraints("lobby_members")
        }
        if "uq_lobby_members_character" in existing_uc:
            op.drop_constraint(
                "uq_lobby_members_character",
                "lobby_members",
                type_="unique",
            )
