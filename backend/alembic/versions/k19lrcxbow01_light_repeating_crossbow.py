"""Insert OotA Light Repeating Crossbow.

Revision ID: k19lrcxbow01
Revises: k18bardtce01
Create Date: 2026-11-26

Adds light_repeating_crossbow (Лёгкий многозарядный арбалет) via gear wave.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "k19lrcxbow01"
down_revision: Union[str, Sequence[str], None] = "k18bardtce01"
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
    pass
