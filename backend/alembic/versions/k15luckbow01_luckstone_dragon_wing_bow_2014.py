"""Luckstone checks + Dragon Wing Bow as weapon.

Revision ID: k15luckbow01
Revises: k14diplbg01
Create Date: 2026-11-26

Promotes dragon_wing_bow from item→weapon (same catalog id), then upserts the
fix wave and refreshes inventory rules. Attack cards for already-owned bows
are healed on the client when the sheet opens.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa

revision: str = "k15luckbow01"
down_revision: Union[str, Sequence[str], None] = "k14diplbg01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.gear_catalog_seed import (
        apply_gear_catalog_waves,
        refresh_inventory_from_catalog,
    )

    conn = op.get_bind()
    # Keep the existing UUID so inventory.catalog_id stays valid.
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET kind = CAST('weapon' AS catalog_kind),
                updated_at = NOW()
            WHERE slug = 'dragon_wing_bow'
              AND rules_edition::text IN ('2014', 'both')
              AND kind::text = 'item'
            """
        )
    )
    apply_gear_catalog_waves(conn)
    refresh_inventory_from_catalog(conn)


def downgrade() -> None:
    # Catalog rules stay; kind change is not reversed.
    pass
