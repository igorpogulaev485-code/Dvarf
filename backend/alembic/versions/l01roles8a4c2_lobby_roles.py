"""L-01: lobby_roles for comaster / observer / lead_today.

Revision ID: l01roles8a4c2
Revises: b09piety7a3c1
Create Date: 2026-11-12

- New table lobby_roles (no seed rows; ids issued at runtime).
- Partial unique indexes: one comaster/observer per user per lobby;
  one lead_today per session.
- Downgrade drops only this table/indexes (no catalog seeds).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "l01roles8a4c2"
down_revision: Union[str, Sequence[str], None] = "b09piety7a3c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "lobby_roles" in inspector.get_table_names():
        return

    op.create_table(
        "lobby_roles",
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
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("play_sessions.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "assigned_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("character_fate", sa.String(32), nullable=True),
        sa.Column(
            "character_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("characters.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('comaster', 'observer', 'lead_today')",
            name="ck_lobby_roles_role",
        ),
        sa.CheckConstraint(
            "(role = 'lead_today' AND session_id IS NOT NULL) OR "
            "(role IN ('comaster', 'observer') AND session_id IS NULL)",
            name="ck_lobby_roles_session_for_lead",
        ),
    )
    op.create_index("ix_lobby_roles_lobby_id", "lobby_roles", ["lobby_id"])
    op.create_index("ix_lobby_roles_user_id", "lobby_roles", ["user_id"])
    op.create_index("ix_lobby_roles_session_id", "lobby_roles", ["session_id"])
    op.create_index(
        "uq_lobby_roles_comaster_observer",
        "lobby_roles",
        ["lobby_id", "user_id", "role"],
        unique=True,
        postgresql_where=sa.text("role IN ('comaster', 'observer')"),
    )
    op.create_index(
        "uq_lobby_roles_lead_today_session",
        "lobby_roles",
        ["session_id"],
        unique=True,
        postgresql_where=sa.text("role = 'lead_today'"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "lobby_roles" not in inspector.get_table_names():
        return
    op.drop_index("uq_lobby_roles_lead_today_session", table_name="lobby_roles")
    op.drop_index("uq_lobby_roles_comaster_observer", table_name="lobby_roles")
    op.drop_index("ix_lobby_roles_session_id", table_name="lobby_roles")
    op.drop_index("ix_lobby_roles_user_id", table_name="lobby_roles")
    op.drop_index("ix_lobby_roles_lobby_id", table_name="lobby_roles")
    op.drop_table("lobby_roles")
