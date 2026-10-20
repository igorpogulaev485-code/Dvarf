"""T3: привязка страниц сеттинга к сессии.

Revision ID: s0t1u2v3w4x5
Revises: r9s0t1u2v3w4
Create Date: 2026-10-17 05:10:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "s0t1u2v3w4x5"
down_revision: Union[str, Sequence[str], None] = "r9s0t1u2v3w4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "play_sessions",
        sa.Column(
            "location_page_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("setting_pages.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "play_sessions",
        sa.Column(
            "involved_page_ids",
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=False,
            server_default="{}",
        ),
    )
    op.create_index(
        "ix_play_sessions_location_page_id",
        "play_sessions",
        ["location_page_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_play_sessions_location_page_id", table_name="play_sessions")
    op.drop_column("play_sessions", "involved_page_ids")
    op.drop_column("play_sessions", "location_page_id")
