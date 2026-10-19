"""C8: visibility на связях страниц (all | gm).

Revision ID: q8r9s0t1u2v3
Revises: p7q8r9s0t1u2
Create Date: 2026-10-17 04:45:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "q8r9s0t1u2v3"
down_revision: Union[str, Sequence[str], None] = "p7q8r9s0t1u2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "setting_page_links",
        sa.Column(
            "visibility",
            sa.String(length=8),
            nullable=False,
            server_default="all",
        ),
    )
    op.create_index(
        "ix_setting_page_links_visibility",
        "setting_page_links",
        ["visibility"],
    )


def downgrade() -> None:
    op.drop_index("ix_setting_page_links_visibility", table_name="setting_page_links")
    op.drop_column("setting_page_links", "visibility")
