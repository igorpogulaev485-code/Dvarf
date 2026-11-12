"""B-04 class feature buffs marker (effects JSON only — no catalog rows).

Revision ID: b04cls5d8e1
Revises: b03roll9c2e5
Create Date: 2026-11-12

Feature buffs live in characters.sheet JSONB (combat.effects mods) via
frontend b04BuffSpecs / ActiveEffect. This revision only advances the
Alembic head. Upgrade/downgrade are no-ops; a second run changes nothing.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "b04cls5d8e1"
down_revision: Union[str, Sequence[str], None] = "b03roll9c2e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return
