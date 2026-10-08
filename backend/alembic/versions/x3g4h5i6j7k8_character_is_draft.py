"""Add characters.is_draft for create-pipeline drafts.

Revision ID: x3g4h5i6j7k8
Revises: v1e2f3a4b5c6
Create Date: 2026-10-08
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "x3g4h5i6j7k8"
down_revision = "v1e2f3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "characters",
        sa.Column(
            "is_draft",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("characters", "is_draft")
