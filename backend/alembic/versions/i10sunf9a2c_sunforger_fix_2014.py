"""Fix Sunforger catalog rules and refresh inventory.

Revision ID: i10sunf9a2c
Revises: p24n01r03
Create Date: 2026-11-24

Upserts the sunforger fix wave and copies effects/resource onto inventory
rows that already point at the catalog. Attack card names are not rewritten
here (player sheet choice); new adds use the frontend fix.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "i10sunf9a2c"
down_revision: Union[str, Sequence[str], None] = "p24n01r03"
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
