"""Add setting_pages wiki tree; migrate world_notes → root page.

Revision ID: j0e1f2a3b4c5
Revises: i9d0e1f2a3b4
Create Date: 2026-10-16 02:10:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "j0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "i9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "setting_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "setting_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("settings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("setting_pages.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("title", sa.String(length=200), nullable=False, server_default="Мир"),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("revealed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
    op.create_index("ix_setting_pages_setting_id", "setting_pages", ["setting_id"])
    op.create_index("ix_setting_pages_parent_id", "setting_pages", ["parent_id"])

    # Migrate legacy world_notes → root page «Мир»
    import uuid

    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, COALESCE(world_notes, '') FROM settings")).fetchall()
    for setting_id, notes in rows:
        exists = conn.execute(
            sa.text("SELECT 1 FROM setting_pages WHERE setting_id = :sid LIMIT 1"),
            {"sid": setting_id},
        ).fetchone()
        if exists:
            continue
        conn.execute(
            sa.text(
                """
                INSERT INTO setting_pages
                  (id, setting_id, parent_id, title, body, sort_order, revealed)
                VALUES
                  (:id, :sid, NULL, 'Мир', :body, 0, false)
                """
            ),
            {"id": uuid.uuid4(), "sid": setting_id, "body": notes or ""},
        )


def downgrade() -> None:
    op.drop_index("ix_setting_pages_parent_id", table_name="setting_pages")
    op.drop_index("ix_setting_pages_setting_id", table_name="setting_pages")
    op.drop_table("setting_pages")
