"""B-02 sheet numbers marker (effects JSON only — no catalog rows).

Revision ID: b02num7e4a1
Revises: b01fx8a1c3
Create Date: 2026-11-12

Buff numbers live in characters.sheet JSONB (combat.effects mods).
This revision only advances the Alembic head. Upgrade/downgrade are no-ops;
a second run changes nothing.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "b02num7e4a1"
down_revision: Union[str, Sequence[str], None] = "b01fx8a1c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return
