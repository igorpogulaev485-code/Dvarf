"""B-01 effect model marker (sheet JSON only — no catalog rows).

Revision ID: b01fx8a1c3
Revises: i09fill7c2e
Create Date: 2026-11-12

Effects live in characters.sheet JSONB. This revision only advances the
Alembic head so later buff packs have a stable parent. Upgrade/downgrade
are no-ops; a second run changes nothing.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "b01fx8a1c3"
down_revision: Union[str, Sequence[str], None] = "i09fill7c2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return
