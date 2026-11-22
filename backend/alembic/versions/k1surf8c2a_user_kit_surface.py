"""Account surface, per-theme backgrounds, and font pair.

Revision ID: k1surf8c2a
Revises: p24n01r03
Create Date: 2026-11-22

L3/I2, the twelve backgrounds, and the six font pairs live on the user.
theme_id stays the six accents. Idempotent if a column is already present.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "k1surf8c2a"
down_revision = "p24n01r03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}
    if "surface" not in cols:
        op.add_column(
            "users",
            sa.Column(
                "surface",
                sa.String(length=32),
                nullable=False,
                server_default="light-designer3",
            ),
        )
    if "bg_light" not in cols:
        op.add_column(
            "users",
            sa.Column(
                "bg_light",
                sa.String(length=16),
                nullable=False,
                server_default="parchment",
            ),
        )
    if "bg_dark" not in cols:
        op.add_column(
            "users",
            sa.Column(
                "bg_dark",
                sa.String(length=16),
                nullable=False,
                server_default="ink",
            ),
        )
    if "font_pair" not in cols:
        op.add_column(
            "users",
            sa.Column(
                "font_pair",
                sa.String(length=16),
                nullable=False,
                server_default="antiqua",
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}
    for name in ("font_pair", "bg_dark", "bg_light", "surface"):
        if name in cols:
            op.drop_column("users", name)
