"""Add users.theme_id and users.ability_colors for cabinet Wave B.

Revision ID: a6b7c8d9e0f1
Revises: z5i6j7k8l9m0
Create Date: 2026-10-13

Idempotent: columns may already exist if cabinet-theme was deployed then
overwritten by a tip line that did not stamp this revision (2026-10-13 incident).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a6b7c8d9e0f1"
# Must follow live prod head z5i6 (Aquan rename), not sibling of it under y4h5.
down_revision = "z5i6j7k8l9m0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}
    if "theme_id" not in cols:
        op.add_column(
            "users",
            sa.Column(
                "theme_id",
                sa.String(length=16),
                nullable=False,
                server_default="wis",
            ),
        )
    if "ability_colors" not in cols:
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
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}
    if "ability_colors" in cols:
        op.drop_column("users", "ability_colors")
    if "theme_id" in cols:
        op.drop_column("users", "theme_id")
