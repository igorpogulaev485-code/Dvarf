"""Magic item bases and the DMG catalog fill.

Revision ID: i06base4c7e
Revises: i05chrg8d3f
Create Date: 2026-11-12

Upserts the I06 waves through the I01 helper and copies rules onto inventory
rows that already point at the catalog. A second run writes nothing. A chosen
base (base_weapon_slug / base_armor_slug / base_ammo_slug) is not replaced.
Old weapon +N / armor +N rows with no base are stamped longsword / plate.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "i06base4c7e"
down_revision: Union[str, Sequence[str], None] = "i05chrg8d3f"
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
