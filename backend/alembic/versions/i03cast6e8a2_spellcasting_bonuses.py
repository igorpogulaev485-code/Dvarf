"""Spellcasting bonuses, foci, and the spellcaster attunement gate.

Revision ID: i03cast6e8a2
Revises: i02rule9c4e1
Create Date: 2026-11-11

Upserts I03 gear rules (spell attack/DC bonuses, spell-focus flags, and
attunement by a spellcaster) through the I01 helper. Inventory rows that
already point at the catalog receive the new rules. A second run writes
nothing. Player choices (name, qty, notes, equipped, scroll) stay.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "i03cast6e8a2"
down_revision: Union[str, Sequence[str], None] = "i02rule9c4e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.services.gear_catalog_seed import (
        apply_gear_catalog_waves,
        refresh_inventory_from_catalog,
    )

    conn = op.get_bind()
    apply_gear_catalog_waves(conn)
    refresh_inventory_from_catalog(conn)


def downgrade() -> None:
    # Catalog rules and copied inventory fields stay. The previous effects
    # are not reconstructed.
    pass
