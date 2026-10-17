"""Add characters.is_draft if missing (Play Desk create pipeline).

Revision ID: b7c8d9e0f1a2
Revises: None (parallel classic root; merged into lobby/C line via t6u7v8w9x0y1)

Prod was stamped here after a classic deploy while lobby/C4 schema
already existed. Kept as locatable root so alembic does not crash;
upgrade is idempotent.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "b7c8d9e0f1a2"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("characters")}
    if "is_draft" not in cols:
        op.add_column(
            "characters",
            sa.Column(
                "is_draft",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("characters")}
    if "is_draft" in cols:
        op.drop_column("characters", "is_draft")
