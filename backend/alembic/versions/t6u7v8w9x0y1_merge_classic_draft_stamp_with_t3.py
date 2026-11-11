"""Merge classic is_draft stamp with T3 session-lore head.

Revision ID: t6u7v8w9x0y1
Revises: b7c8d9e0f1a2, s0t1u2v3w4x5
Create Date: 2026-10-17

Prod had alembic_version=b7c8d9e0f1a2 (classic) while schema was
lobby/C4+. This merge joins that stamp into the setting C5–T3 line
so future upgrades do not fail with «Can't locate revision».
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "t6u7v8w9x0y1"
down_revision: Union[str, Sequence[str], None] = ("b7c8d9e0f1a2", "s0t1u2v3w4x5")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
