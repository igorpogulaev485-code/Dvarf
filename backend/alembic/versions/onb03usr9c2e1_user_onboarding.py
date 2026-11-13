"""ONB-03: users.onboarding JSONB for cross-device tip progress.

Revision ID: onb03usr9c2e1
Revises: w04sets8a1b2c
Create Date: 2026-11-13

Nullable column: NULL = server never decided (do not force welcome restart;
client may upload local progress once).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "onb03usr9c2e1"
down_revision: Union[str, Sequence[str], None] = "w04sets8a1b2c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}
    if "onboarding" not in cols:
        op.add_column(
            "users",
            sa.Column("onboarding", JSONB(astext_type=sa.Text()), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}
    if "onboarding" in cols:
        op.drop_column("users", "onboarding")
