"""Merge live wildfire head (c5d6) with magic-qa tip (k6f7).

Revision ID: l7a8b9c0d1e2
Revises: c5d6e7f8a9b0, k6f7a8b9c0d1
Create Date: 2026-10-22

Prod DB is on c5d6e7f8a9b0 (teodor tip). Magic QA branched from b4c5 via
c8d9…k6f7. Merge heads so `alembic upgrade` can advance from live.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "l7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = ("c5d6e7f8a9b0", "k6f7a8b9c0d1")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
