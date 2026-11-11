"""Add page_id to campaign journal for setting wiki embeds (C4).

Revision ID: l2a3b4c5d6e7
Revises: k1f2a3b4c5d6
Create Date: 2026-10-16 02:50:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "l2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "k1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "campaign_journal_entries",
        sa.Column(
            "page_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("setting_pages.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_campaign_journal_entries_page_id",
        "campaign_journal_entries",
        ["page_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_campaign_journal_entries_page_id", table_name="campaign_journal_entries")
    op.drop_column("campaign_journal_entries", "page_id")
