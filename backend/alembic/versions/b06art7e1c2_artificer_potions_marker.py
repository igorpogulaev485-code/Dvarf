"""B-06 artificer infusions/elixirs + duration potions marker.

Revision ID: b06art7e1c2
Revises: b05cls9e2f4
Create Date: 2026-11-12

Artificer feature buffs and duration-potion ActiveEffects live in
characters.sheet JSONB via frontend b06BuffSpecs / spendConsumableFromDesk.
Also seeds seven missing Potion of Resistance variants (acid/force/lightning/
necrotic/psychic/radiant/thunder) through gear_catalog_seed waves.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b06art7e1c2"
down_revision: Union[str, Sequence[str], None] = "b05cls9e2f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    from app.services.gear_catalog_seed import (
        apply_gear_catalog_waves,
        refresh_inventory_from_catalog,
    )

    apply_gear_catalog_waves(conn)
    refresh_inventory_from_catalog(conn)


def downgrade() -> None:
    # Inserts stay in catalog; marker-only reverse would not delete player-facing rows.
    return
