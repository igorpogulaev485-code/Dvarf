"""B-03 roll riders / advantage / marks marker (effects JSON only — no catalog rows).

Revision ID: b03roll9c2e5
Revises: b02num7e4a1
Create Date: 2026-11-12

Buff riders live in characters.sheet JSONB (combat.effects mods).
This revision only advances the Alembic head. Upgrade/downgrade are no-ops;
a second run changes nothing.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "b03roll9c2e5"
down_revision: Union[str, Sequence[str], None] = "b02num7e4a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return
