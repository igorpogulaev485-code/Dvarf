"""L-07: whisper threads/messages + chat read cursors.

Revision ID: l07whisp5d9e3
Revises: l06journ4c8e2
Create Date: 2026-11-13

- whisper_threads: one unordered pair per lobby
- whisper_messages: live DM body (not broadcast on lobby socket)
- chat_read_cursors: last_read_at per user × channel|whisper|letter
- No seed rows; ids issued at runtime via uuid4.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "l07whisp5d9e3"
down_revision: Union[str, Sequence[str], None] = "l06journ4c8e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

THREADS = "whisper_threads"
MESSAGES = "whisper_messages"
CURSORS = "chat_read_cursors"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if THREADS not in tables:
        op.create_table(
            THREADS,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "lobby_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("lobbies.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "user_low_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "user_high_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "created_at",
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
            sa.CheckConstraint(
                "user_low_id <> user_high_id",
                name="ck_whisper_threads_distinct_users",
            ),
            sa.UniqueConstraint(
                "lobby_id",
                "user_low_id",
                "user_high_id",
                name="uq_whisper_threads_lobby_pair",
            ),
        )
        op.create_index("ix_whisper_threads_lobby_id", THREADS, ["lobby_id"])
        op.create_index("ix_whisper_threads_user_low_id", THREADS, ["user_low_id"])
        op.create_index("ix_whisper_threads_user_high_id", THREADS, ["user_high_id"])

    if MESSAGES not in tables:
        op.create_table(
            MESSAGES,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "thread_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("whisper_threads.id", ondelete="CASCADE"),
                nullable=False,
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
        op.create_index("ix_whisper_messages_thread_id", MESSAGES, ["thread_id"])
        op.create_index("ix_whisper_messages_created_at", MESSAGES, ["created_at"])

    if CURSORS not in tables:
        op.create_table(
            CURSORS,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "lobby_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("lobbies.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("target_kind", sa.String(16), nullable=False),
            sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column(
                "last_read_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.CheckConstraint(
                "target_kind IN ('channel', 'whisper', 'letter')",
                name="ck_chat_read_cursors_kind",
            ),
            sa.UniqueConstraint(
                "user_id",
                "target_kind",
                "target_id",
                name="uq_chat_read_cursors_user_target",
            ),
        )
        op.create_index("ix_chat_read_cursors_lobby_id", CURSORS, ["lobby_id"])
        op.create_index("ix_chat_read_cursors_user_id", CURSORS, ["user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if CURSORS in tables:
        op.drop_index("ix_chat_read_cursors_user_id", table_name=CURSORS)
        op.drop_index("ix_chat_read_cursors_lobby_id", table_name=CURSORS)
        op.drop_table(CURSORS)

    if MESSAGES in tables:
        op.drop_index("ix_whisper_messages_created_at", table_name=MESSAGES)
        op.drop_index("ix_whisper_messages_thread_id", table_name=MESSAGES)
        op.drop_table(MESSAGES)

    if THREADS in tables:
        op.drop_index("ix_whisper_threads_user_high_id", table_name=THREADS)
        op.drop_index("ix_whisper_threads_user_low_id", table_name=THREADS)
        op.drop_index("ix_whisper_threads_lobby_id", table_name=THREADS)
        op.drop_table(THREADS)
