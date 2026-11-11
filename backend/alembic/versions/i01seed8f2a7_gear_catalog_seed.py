"""Idempotent 2014 gear catalog seed and inventory rule refresh.

Revision ID: i01seed8f2a7
Revises: r3d10a8b9c0d
Create Date: 2026-11-11

Upserts SRD catalog gear plus every gear_*.json wave (DMG/XGE/TCE/settings/BMT).
Hides the 13 items that have no 5e14 card and renames the viscid-globs wand
in place. Then copies catalog rules onto inventory rows that already point at
the catalog. Player choices are left alone. A second run writes nothing.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "i01seed8f2a7"
down_revision: Union[str, Sequence[str], None] = "r3d10a8b9c0d"
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
    # Catalog rows and character sheets stay. The seed is additive and
    # the inventory refresh cannot be reversed without the previous rules.
    pass
