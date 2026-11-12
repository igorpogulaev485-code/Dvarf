"""Conditional AC, resistances, and spell-save advantage.

Revision ID: i04def8c4b1
Revises: i03cast6e8a2
Create Date: 2026-11-12

Upserts I04 gear rules through the I01 helper and copies them onto inventory
rows that already point at the catalog. A second run writes nothing. Player
choices (name, qty, notes, equipped, scroll) stay. Tiefling race rows gain
fire resistance when the catalog field is empty.
"""

from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i04def8c4b1"
down_revision: Union[str, Sequence[str], None] = "i03cast6e8a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FIRE = {"огонь", "огнём", "огнем", "fire"}


def _patch_tiefling_fire(conn) -> None:
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race' AND slug LIKE 'tiefling%'
            """
        )
    ).mappings()
    for row in rows:
        data = row["data"]
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                continue
        if not isinstance(data, dict):
            continue
        current = data.get("damage_resistances")
        listed = current if isinstance(current, list) else []
        if any(str(item).strip().lower() in _FIRE for item in listed):
            continue
        data = dict(data)
        data["damage_resistances"] = ["огонь", *listed]
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )


def upgrade() -> None:
    from app.services.gear_catalog_seed import (
        apply_gear_catalog_waves,
        refresh_inventory_from_catalog,
    )

    conn = op.get_bind()
    apply_gear_catalog_waves(conn)
    refresh_inventory_from_catalog(conn)
    _patch_tiefling_fire(conn)


def downgrade() -> None:
    # Catalog rules and copied inventory fields stay.
    pass
