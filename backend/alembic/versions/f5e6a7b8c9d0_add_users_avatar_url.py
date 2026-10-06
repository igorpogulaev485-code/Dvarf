"""add users.avatar_url

Revision ID: f5e6a7b8c9d0
Revises: d4e5f6071829
Create Date: 2026-10-06 05:15:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f5e6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6071829"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
