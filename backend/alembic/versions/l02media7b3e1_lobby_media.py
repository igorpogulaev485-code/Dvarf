"""L-02: lobby_media storage table.

Revision ID: l02media7b3e1
Revises: s01droptpl9c2a
Create Date: 2026-11-13

- New table lobby_media (no seed rows; ids issued at runtime via uuid4).
- Downgrade drops only this table/indexes.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "l02media7b3e1"
down_revision: Union[str, Sequence[str], None] = "s01droptpl9c2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "lobby_media" in inspector.get_table_names():
        return

    op.create_table(
        "lobby_media",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "lobby_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lobbies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "uploaded_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("original_filename", sa.String(255), nullable=False, server_default="image"),
        sa.Column("bytes_on_disk", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("preview_url", sa.String(500), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False, server_default="other"),
        sa.Column("attached_to_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
        sa.CheckConstraint(
            "kind IN ('journal', 'wiki', 'map', 'other')",
            name="ck_lobby_media_kind",
        ),
    )
    op.create_index("ix_lobby_media_lobby_id", "lobby_media", ["lobby_id"])
    op.create_index("ix_lobby_media_uploaded_by", "lobby_media", ["uploaded_by"])
    op.create_index("ix_lobby_media_attached_to_id", "lobby_media", ["attached_to_id"])
    op.create_index(
        "ix_lobby_media_lobby_kind_attached",
        "lobby_media",
        ["lobby_id", "kind", "attached_to_id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "lobby_media" not in inspector.get_table_names():
        return

    op.drop_index("ix_lobby_media_lobby_kind_attached", table_name="lobby_media")
    op.drop_index("ix_lobby_media_attached_to_id", table_name="lobby_media")
    op.drop_index("ix_lobby_media_uploaded_by", table_name="lobby_media")
    op.drop_index("ix_lobby_media_lobby_id", table_name="lobby_media")
    op.drop_table("lobby_media")
