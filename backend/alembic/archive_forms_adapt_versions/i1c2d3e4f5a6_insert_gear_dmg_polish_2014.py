"""Insert 2014 DMG polish magic items (W6 leftovers).

Revision ID: i1c2d3e4f5a6
Revises: h0b1c2d3e4f5
Create Date: 2026-10-08 13:40:00.000000

- Upsert iconic DMG leftovers: staves, wands, robes, ioun stones,
  giant-strength potions, carpets, horns, utility wondrous.
- RU names, wear_slot, source_book, effects MVP.
- Does not wipe prior PHB/DMG/XGE/TCE/settings waves.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "h0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/gear_dmg_polish_v1.json")


def _load_payload() -> dict[str, Any]:
    candidates = [
        Path.cwd() / "backend" / DATA_REL,
        Path.cwd() / DATA_REL,
        Path(__file__).resolve().parents[2] / DATA_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                raise RuntimeError(f"Expected object in {path}")
            return payload
    raise FileNotFoundError(f"DMG polish gear file not found; tried {candidates}")


def _entry_id(item: dict[str, Any]) -> str:
    if item.get("id"):
        return str(item["id"])
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:catalog:item:2014:{item['slug']}"))


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    inserts = payload.get("inserts") or []
    if len(inserts) < 70:
        raise RuntimeError(f"Expected ~91 DMG polish inserts, got {len(inserts)}")

    touched = 0
    for item in inserts:
        kind = item.get("kind") or "item"
        slug = item.get("slug")
        if kind != "item" or not slug:
            continue
        data = item.get("data") or {}
        exists = conn.execute(
            sa.text(
                """
                SELECT 1 FROM catalog_entries
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"slug": slug},
        ).first()
        params = {
            "slug": slug,
            "name_ru": item.get("name_ru"),
            "name_en": item.get("name_en"),
            "source": item.get("source"),
            "sort_order": int(item.get("sort_order") or 0),
            "data": json.dumps(data, ensure_ascii=False),
        }
        if exists:
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET
                        name_ru = :name_ru,
                        name_en = :name_en,
                        source = :source,
                        data = CAST(:data AS jsonb),
                        sort_order = :sort_order,
                        is_active = TRUE,
                        updated_at = NOW()
                    WHERE kind = 'item'
                      AND rules_edition IN ('2014', 'both')
                      AND slug = :slug
                    """
                ),
                params,
            )
        else:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO catalog_entries (
                        id, kind, slug, name_ru, name_en, rules_edition,
                        parent_id, source, external_ref, data, sort_order, is_active
                    ) VALUES (
                        CAST(:id AS uuid),
                        CAST(:kind AS catalog_kind),
                        :slug,
                        :name_ru,
                        :name_en,
                        CAST(:rules_edition AS catalog_rules_edition),
                        NULL,
                        :source,
                        NULL,
                        CAST(:data AS jsonb),
                        :sort_order,
                        TRUE
                    )
                    """
                ),
                {
                    **params,
                    "id": _entry_id(item),
                    "kind": kind,
                    "rules_edition": item.get("rules_edition") or "2014",
                },
            )
        touched += 1

    if touched < 70:
        raise RuntimeError(f"Expected to upsert many polish rows; only {touched}")


def downgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    # Only delete slugs that this wave introduced as new inserts historically;
    # safer: delete all payload slugs (upserts of older rows would be lost on downgrade —
    # acceptable for tip stack polish).
    slugs = [item["slug"] for item in (payload.get("inserts") or []) if item.get("slug")]
    if not slugs:
        return
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'item'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": slugs},
    )
