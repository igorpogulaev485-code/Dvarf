"""ADM-04: очередь обратной связи feedback_messages.

Revision ID: adm04feedback01
Revises: adm03metrics01
Create Date: 2026-11-16

- feedback_messages: тема, текст, автор (SET NULL), аноним, персонаж/лобби без FK,
  страница, статус, заметка админа, rate_account_id для лимита частоты
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "adm04feedback01"
down_revision: Union[str, Sequence[str], None] = "adm03metrics01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "feedback_messages" not in tables:
        op.create_table(
            "feedback_messages",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("topic", sa.String(length=32), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "rate_account_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("lobby_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("page_path", sa.String(length=300), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="new"),
            sa.Column("admin_note", sa.Text(), nullable=True),
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
        op.create_index("ix_feedback_messages_user_id", "feedback_messages", ["user_id"])
        op.create_index("ix_feedback_messages_topic", "feedback_messages", ["topic"])
        op.create_index("ix_feedback_messages_status", "feedback_messages", ["status"])
        op.create_index(
            "ix_feedback_messages_status_created_at",
            "feedback_messages",
            ["status", "created_at"],
        )
        op.create_index(
            "ix_feedback_messages_topic_created_at",
            "feedback_messages",
            ["topic", "created_at"],
        )
        op.create_index(
            "ix_feedback_messages_rate_created_at",
            "feedback_messages",
            ["rate_account_id", "created_at"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "feedback_messages" not in tables:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("feedback_messages") if idx.get("name")}
    for name in (
        "ix_feedback_messages_rate_created_at",
        "ix_feedback_messages_topic_created_at",
        "ix_feedback_messages_status_created_at",
        "ix_feedback_messages_status",
        "ix_feedback_messages_topic",
        "ix_feedback_messages_user_id",
    ):
        if name in indexes:
            op.drop_index(name, table_name="feedback_messages")

    op.drop_table("feedback_messages")
