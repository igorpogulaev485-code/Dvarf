"""add chat channels and master letters

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-10-15
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_channels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "lobby_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lobbies.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "channel_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("chat_channels.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "author_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("character_name", sa.String(120), nullable=True),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_chat_messages_channel_created",
        "chat_messages",
        ["channel_id", "created_at"],
    )
    op.create_table(
        "master_letters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "lobby_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lobbies.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "author_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("character_name", sa.String(120), nullable=False, server_default="Игрок"),
        sa.Column("subject", sa.String(200), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="waiting_master"),
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
        sa.Column(
            "last_message_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_table(
        "master_letter_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "letter_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("master_letters.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "author_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_master", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_master_letters_lobby_status",
        "master_letters",
        ["lobby_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_master_letters_lobby_status", table_name="master_letters")
    op.drop_table("master_letter_messages")
    op.drop_table("master_letters")
    op.drop_index("ix_chat_messages_channel_created", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_table("chat_channels")
