"""Refresh Sunforger inventory rows as warhammer (1к8/1к10).

Revision ID: j11sunfwep01
Revises: i10sunf9a2c
Create Date: 2026-11-24

Copies base_weapon_slug / damage / versatile onto catalog-linked inventory
and rewrites linked attack cards that still show maul 2к6.
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j11sunfwep01"
down_revision: Union[str, Sequence[str], None] = "i10sunf9a2c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _rewrite_weapon_attacks(sheet: dict[str, Any]) -> bool:
    inventory = sheet.get("inventory")
    if not isinstance(inventory, dict):
        return False
    items = inventory.get("items")
    if not isinstance(items, list):
        return False
    by_id: dict[str, dict[str, Any]] = {}
    for raw in items:
        if isinstance(raw, dict) and isinstance(raw.get("id"), str):
            by_id[raw["id"]] = raw

    weapons = sheet.get("weapons")
    if not isinstance(weapons, list):
        return False
    changed = False
    next_weapons: list[Any] = []
    for raw in weapons:
        if not isinstance(raw, dict):
            next_weapons.append(raw)
            continue
        item_id = raw.get("inventory_item_id")
        item = by_id.get(item_id) if isinstance(item_id, str) else None
        if not item:
            next_weapons.append(raw)
            continue
        damage = item.get("damage")
        if not isinstance(damage, str) or not damage.strip():
            next_weapons.append(raw)
            continue
        damage = damage.strip()
        # Only rewrite when the face still looks like a maul while the item is a warhammer.
        base = item.get("base_weapon_slug")
        old = raw.get("damage")
        if (
            isinstance(base, str)
            and base.strip().lower() == "warhammer"
            and isinstance(old, str)
            and old.replace(" ", "").lower() in {"2к6", "2d6"}
        ):
            updated = dict(raw)
            updated["damage"] = damage
            next_weapons.append(updated)
            changed = True
            continue
        if isinstance(old, str) and old.strip() == damage:
            next_weapons.append(raw)
            continue
        # Catalog-linked fixed base: keep attack face aligned with 1H die.
        if isinstance(base, str) and base.strip() and (
            not isinstance(item.get("allowed_base_weapon"), list)
            or not item.get("allowed_base_weapon")
        ):
            if not isinstance(old, str) or old.strip() != damage:
                updated = dict(raw)
                updated["damage"] = damage
                next_weapons.append(updated)
                changed = True
                continue
        next_weapons.append(raw)
    if changed:
        sheet["weapons"] = next_weapons
    return changed


def upgrade() -> None:
    from app.services.gear_catalog_seed import (
        apply_gear_catalog_waves,
        refresh_inventory_from_catalog,
    )

    conn = op.get_bind()
    apply_gear_catalog_waves(conn)
    refresh_inventory_from_catalog(conn)

    result = conn.execute(sa.text("SELECT id::text AS id, sheet FROM characters"))
    for raw in result.mappings():
        sheet = raw["sheet"]
        if isinstance(sheet, str):
            try:
                sheet = json.loads(sheet)
            except json.JSONDecodeError:
                continue
        if not isinstance(sheet, dict):
            continue
        working = dict(sheet)
        if not _rewrite_weapon_attacks(working):
            continue
        conn.execute(
            sa.text(
                """
                UPDATE characters
                SET
                    sheet = CAST(:sheet AS jsonb),
                    sheet_version = sheet_version + 1,
                    updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": raw["id"],
                "sheet": json.dumps(working, ensure_ascii=False),
            },
        )


def downgrade() -> None:
    pass
