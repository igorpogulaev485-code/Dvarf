"""Item charges, spell grants, and healing potions.

Revision ID: i05chrg8d3f
Revises: i04def8c4b1
Create Date: 2026-11-12

Upserts the I05 gear wave through the I01 helper and copies rules onto
inventory rows that already point at the catalog. A second run writes
nothing. Player choices (name, qty, notes, equipped, scroll spell) stay.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "i05chrg8d3f"
down_revision: Union[str, Sequence[str], None] = "i04def8c4b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.gear_catalog_seed import (
        apply_gear_catalog_waves,
        refresh_inventory_from_catalog,
    )

    conn = op.get_bind()
    apply_gear_catalog_waves(conn)
    refresh_inventory_from_catalog(conn)


def downgrade() -> None:
    # Catalog rules and copied inventory fields stay.
    pass
