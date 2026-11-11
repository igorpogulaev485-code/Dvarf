"""C7: gm_body — блок «только мастер» на странице сеттинга.

Revision ID: p7q8r9s0t1u2
Revises: o6p7q8r9s0t1
Create Date: 2026-10-17 04:40:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p7q8r9s0t1u2"
down_revision: Union[str, Sequence[str], None] = "o6p7q8r9s0t1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "setting_pages",
        sa.Column("gm_body", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("setting_pages", "gm_body")
