"""Legacy revision id kept so prod can locate pre-rechain stamps.

Revision ID: a6b7c8d9e0f1
Revises: p5e6f7a8b9c0
Create Date: 2026-10-13 14:00:00.000000

Before commit 6fc68bd the cleric-domains migration used this id; it was
renamed to q6f7a8b9c0d1. A prod DB may still report a6b7c8d9e0f1. This
no-op preserves the id in the graph; real work stays in q6f7a8b9c0d1.

If a live DB is stamped here but its schema is already past q6…, stamp
forward to the matching head instead of re-running the chain.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "a6b7c8d9e0f1"
down_revision: Union[str, Sequence[str], None] = "p5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
