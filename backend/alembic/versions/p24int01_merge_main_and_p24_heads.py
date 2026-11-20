"""Merge main head (n0a1b2c3d4e5) with P24 tip head (p24m03pr01).

Revision ID: p24int01merge
Revises: n0a1b2c3d4e5, p24m03pr01
Create Date: 2026-11-20

Integrate branch joins prod main migrations (elf spell choices / dice) with the
2024 edition chain head. Empty merge — schema already present on both sides.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24int01merge"
down_revision: Union[str, Sequence[str], None] = ("n0a1b2c3d4e5", "p24m03pr01")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
