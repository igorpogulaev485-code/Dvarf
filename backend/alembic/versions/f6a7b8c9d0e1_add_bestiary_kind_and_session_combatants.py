"""Add catalog kind=bestiary + play_sessions.combatants.

Revision ID: f6a7b8c9d0e1
Revises: e4f5a6b7c8d9
Create Date: 2026-10-15 15:40:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            """
            DO $$ BEGIN
              ALTER TYPE catalog_kind ADD VALUE 'bestiary';
            EXCEPTION
              WHEN duplicate_object THEN NULL;
            END $$;
            """
        )

    op.add_column(
        "play_sessions",
        sa.Column(
            "combatants",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("play_sessions", "combatants")
