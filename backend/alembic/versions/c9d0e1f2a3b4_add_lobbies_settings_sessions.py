"""add lobbies settings play_sessions

Revision ID: c9d0e1f2a3b4
Revises: b829a0b1c2d3
Create Date: 2026-10-06 09:55:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "b829a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lobbies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("invite_code", sa.String(length=16), nullable=False),
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
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("invite_code", name="uq_lobbies_invite_code"),
    )
    op.create_index("ix_lobbies_owner_id", "lobbies", ["owner_id"])
    op.create_index("ix_lobbies_invite_code", "lobbies", ["invite_code"])

    op.create_table(
        "lobby_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("lobby_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["lobby_id"], ["lobbies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("lobby_id", "character_id", name="uq_lobby_members_lobby_character"),
    )
    op.create_index("ix_lobby_members_lobby_id", "lobby_members", ["lobby_id"])
    op.create_index("ix_lobby_members_character_id", "lobby_members", ["character_id"])
    op.create_index("ix_lobby_members_user_id", "lobby_members", ["user_id"])

    op.create_table(
        "settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("lobby_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("world_notes", sa.Text(), nullable=False, server_default=""),
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
        sa.ForeignKeyConstraint(["lobby_id"], ["lobbies.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_settings_lobby_id", "settings", ["lobby_id"])

    op.create_table(
        "play_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("lobby_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("setting_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
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
        sa.ForeignKeyConstraint(["lobby_id"], ["lobbies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["setting_id"], ["settings.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_play_sessions_lobby_id", "play_sessions", ["lobby_id"])
    op.create_index("ix_play_sessions_setting_id", "play_sessions", ["setting_id"])

    op.create_table(
        "session_seats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "seated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["session_id"], ["play_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "session_id",
            "character_id",
            name="uq_session_seats_session_character",
        ),
    )
    op.create_index("ix_session_seats_session_id", "session_seats", ["session_id"])
    op.create_index("ix_session_seats_character_id", "session_seats", ["character_id"])


def downgrade() -> None:
    op.drop_index("ix_session_seats_character_id", table_name="session_seats")
    op.drop_index("ix_session_seats_session_id", table_name="session_seats")
    op.drop_table("session_seats")
    op.drop_index("ix_play_sessions_setting_id", table_name="play_sessions")
    op.drop_index("ix_play_sessions_lobby_id", table_name="play_sessions")
    op.drop_table("play_sessions")
    op.drop_index("ix_settings_lobby_id", table_name="settings")
    op.drop_table("settings")
    op.drop_index("ix_lobby_members_user_id", table_name="lobby_members")
    op.drop_index("ix_lobby_members_character_id", table_name="lobby_members")
    op.drop_index("ix_lobby_members_lobby_id", table_name="lobby_members")
    op.drop_table("lobby_members")
    op.drop_index("ix_lobbies_invite_code", table_name="lobbies")
    op.drop_index("ix_lobbies_owner_id", table_name="lobbies")
    op.drop_table("lobbies")
