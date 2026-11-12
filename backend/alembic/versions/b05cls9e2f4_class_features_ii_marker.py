"""B-05 class feature buffs II marker (effects JSON only — no catalog rows).

Revision ID: b05cls9e2f4
Revises: b04cls5d8e1
Create Date: 2026-11-12

Paladin / warlock / wizard / ranger / rogue / sorcerer feature buffs live in
characters.sheet JSONB (combat.effects mods) via frontend b05BuffSpecs /
ActiveEffect. This revision only advances the Alembic head.
Upgrade/downgrade are no-ops; a second run changes nothing.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "b05cls9e2f4"
down_revision: Union[str, Sequence[str], None] = "b04cls5d8e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return
