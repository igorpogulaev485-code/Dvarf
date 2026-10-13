"""Add users.theme_id and users.ability_colors for cabinet Wave B.

Revision ID: a6b7c8d9e0f1
Revises: y4h5i6j7k8l9
Create Date: 2026-10-13
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a6b7c8d9e0f1"
down_revision = "y4h5i6j7k8l9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "theme_id",
            sa.String(length=16),
            nullable=False,
            server_default="wis",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "ability_colors",
            sa.String(length=16),
            nullable=False,
            server_default="identity",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "ability_colors")
    op.drop_column("users", "theme_id")
