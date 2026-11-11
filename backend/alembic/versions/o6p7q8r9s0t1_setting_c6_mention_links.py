"""C6: kind на связях страниц (semantic | mention).

Revision ID: o6p7q8r9s0t1
Revises: n5o6p7q8r9s0
Create Date: 2026-10-17 04:35:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "o6p7q8r9s0t1"
down_revision: Union[str, Sequence[str], None] = "n5o6p7q8r9s0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "setting_page_links",
        sa.Column(
            "kind",
            sa.String(length=16),
            nullable=False,
            server_default="semantic",
        ),
    )
    op.drop_constraint("uq_setting_page_links_from_to", "setting_page_links", type_="unique")
    op.create_unique_constraint(
        "uq_setting_page_links_from_to_kind",
        "setting_page_links",
        ["from_page_id", "to_page_id", "kind"],
    )
    op.create_index("ix_setting_page_links_kind", "setting_page_links", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_setting_page_links_kind", table_name="setting_page_links")
    op.drop_constraint(
        "uq_setting_page_links_from_to_kind",
        "setting_page_links",
        type_="unique",
    )
    # Могут быть дубликаты semantic+mention — оставляем одно ребро
    op.execute(
        """
        DELETE FROM setting_page_links a
        USING setting_page_links b
        WHERE a.from_page_id = b.from_page_id
          AND a.to_page_id = b.to_page_id
          AND a.id > b.id
        """
    )
    op.create_unique_constraint(
        "uq_setting_page_links_from_to",
        "setting_page_links",
        ["from_page_id", "to_page_id"],
    )
    op.drop_column("setting_page_links", "kind")
