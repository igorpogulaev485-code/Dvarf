"""B-07 feat buffs marker (effects JSON / frontend only — no catalog rows).

Revision ID: b07feat8d3a1
Revises: b06art7e1c2
Create Date: 2026-11-12

Feat number/dice helpers live in characters.sheet JSONB via frontend
b07BuffSpecs / b07FeatCombat / ActiveEffect. This revision only advances
the Alembic head. Upgrade/downgrade are no-ops; a second run changes nothing.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "b07feat8d3a1"
down_revision: Union[str, Sequence[str], None] = "b06art7e1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return
