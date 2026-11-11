"""C9: tags на страницах сеттинга.

Revision ID: r9s0t1u2v3w4
Revises: q8r9s0t1u2v3
Create Date: 2026-10-17 04:50:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "r9s0t1u2v3w4"
down_revision: Union[str, Sequence[str], None] = "q8r9s0t1u2v3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "setting_pages",
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.String(length=48)),
            nullable=False,
            server_default="{}",
        ),
    )
    op.create_index(
        "ix_setting_pages_tags",
        "setting_pages",
        ["tags"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    op.drop_index("ix_setting_pages_tags", table_name="setting_pages")
    op.drop_column("setting_pages", "tags")
