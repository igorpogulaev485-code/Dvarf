"""add lobby notes

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-10-15
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lobby_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "lobby_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lobbies.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("scope", sa.String(16), nullable=False, server_default="personal"),
        sa.Column(
            "author_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("character_name", sa.String(120), nullable=True),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_lobby_notes_lobby_scope_updated",
        "lobby_notes",
        ["lobby_id", "scope", "updated_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_lobby_notes_lobby_scope_updated", table_name="lobby_notes")
    op.drop_table("lobby_notes")
