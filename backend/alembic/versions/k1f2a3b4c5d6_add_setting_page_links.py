"""Add setting_page_links graph edges (C2).

Revision ID: k1f2a3b4c5d6
Revises: j0e1f2a3b4c5
Create Date: 2026-10-16 02:25:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "k1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "j0e1f2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "setting_page_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "from_page_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("setting_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_page_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("setting_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.String(length=120), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("from_page_id", "to_page_id", name="uq_setting_page_links_from_to"),
    )
    op.create_index("ix_setting_page_links_from_page_id", "setting_page_links", ["from_page_id"])
    op.create_index("ix_setting_page_links_to_page_id", "setting_page_links", ["to_page_id"])


def downgrade() -> None:
    op.drop_index("ix_setting_page_links_to_page_id", table_name="setting_page_links")
    op.drop_index("ix_setting_page_links_from_page_id", table_name="setting_page_links")
    op.drop_table("setting_page_links")
