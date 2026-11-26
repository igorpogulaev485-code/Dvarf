"""Bracers not ammo; reseed combat_consumable + effects.

Revision ID: k17braceammo01
Revises: k16bracers01
Create Date: 2026-11-26

Re-applies gear waves so bracers_of_archery get combat_consumable=false
(and typed effects). Attack-card 1к8+1к6 heal is client-side.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "k17braceammo01"
down_revision: Union[str, Sequence[str], None] = "k16bracers01"
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
