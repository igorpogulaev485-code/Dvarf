"""Items outside the eight core books, part 2.

Revision ID: i09fill7c2e
Revises: i08fill2a4c
Create Date: 2026-11-12

Upserts the I09 wave through the I01 helper and copies rules onto inventory
rows that already point at the catalog. A second run writes nothing. Player
choices (name, notes, equipped, attunement, chosen base, scroll spell) stay.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "i09fill7c2e"
down_revision: Union[str, Sequence[str], None] = "i08fill2a4c"
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
