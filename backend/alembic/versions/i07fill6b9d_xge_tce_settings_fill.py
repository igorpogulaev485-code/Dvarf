"""XGE, TCE and setting catalog fill.

Revision ID: i07fill6b9d
Revises: i06base4c7e
Create Date: 2026-11-12

Upserts the I07 waves through the I01 helper and copies rules onto inventory
rows that already point at the catalog. A second run writes nothing. Player
choices (name, notes, equipped, attunement, chosen base, scroll spell) stay.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "i07fill6b9d"
down_revision: Union[str, Sequence[str], None] = "i06base4c7e"
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
