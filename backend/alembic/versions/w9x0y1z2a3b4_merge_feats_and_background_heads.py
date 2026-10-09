"""Merge alembic heads: feats pickers + background-grants tip.

Revision ID: w9x0y1z2a3b4
Revises: j8a9b0c1d2e3, v1e2f3a4b5c6
Create Date: 2026-10-07 20:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "w9x0y1z2a3b4"
down_revision: Union[str, Sequence[str], None] = ("j8a9b0c1d2e3", "v1e2f3a4b5c6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Empty merge revision — joins feats catalog chain with live background tip.
    pass


def downgrade() -> None:
    pass
