"""add session_events for live table feed

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-10-15
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "session_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("play_sessions.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("event_type", sa.String(32), nullable=False, server_default="roll"),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("character_name", sa.String(120), nullable=True),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("formula", sa.String(120), nullable=True),
        sa.Column("breakdown", sa.String(200), nullable=True),
        sa.Column("total", sa.Integer(), nullable=True),
        sa.Column("is_master_roll", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_session_events_session_created",
        "session_events",
        ["session_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_session_events_session_created", table_name="session_events")
    op.drop_table("session_events")
