"""Drop lobbies.encounter_templates (L-19 / S-01).

Revision ID: s01droptpl9c2a
Revises: l01roles8a4c2
Create Date: 2026-11-12 18:40:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "s01droptpl9c2a"
down_revision: Union[str, Sequence[str], None] = "l01roles8a4c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("lobbies")}
    if "encounter_templates" in columns:
        op.drop_column("lobbies", "encounter_templates")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("lobbies")}
    if "encounter_templates" not in columns:
        op.add_column(
            "lobbies",
            sa.Column(
                "encounter_templates",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
        )
