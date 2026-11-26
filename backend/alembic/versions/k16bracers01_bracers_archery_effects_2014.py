"""Bracers of Archery: typed proficiency + scoped +2 damage.

Revision ID: k16bracers01
Revises: k15luckbow01
Create Date: 2026-11-26

Re-applies gear catalog waves so bracers_of_archery effects leave
custom_note-only and grant weapon_proficiency + scoped damage_bonus.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "k16bracers01"
down_revision: Union[str, Sequence[str], None] = "k15luckbow01"
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
    # Catalog rules stay; typed effects are not reverted.
    pass
