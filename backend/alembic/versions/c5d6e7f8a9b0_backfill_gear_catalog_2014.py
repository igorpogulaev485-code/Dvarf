"""Backfill 2014 gear catalog (weapon/armor/item) schema v1 + healing potions.

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-10-08 06:40:00.000000

- Upsert RU names, cost, range/versatile, armor max_dex/str, item_category,
  pack contents, rarity/attunement for existing SRD rows (2014 only).
- Insert Potion of Healing family (4 variants, TTG-style).
- Does not touch 2024 or non-gear kinds.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c5d6e7f8a9b0"
down_revision: Union[str, Sequence[str], None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/gear_backfill_v1.json")


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
    raise FileNotFoundError(f"Gear backfill file not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    updates = payload.get("updates") or []
    inserts = payload.get("inserts") or []
    if len(updates) < 200:
        raise RuntimeError(f"Expected ~225 gear updates, got {len(updates)}")

    updated = 0
    for item in updates:
        kind = item.get("kind")
        slug = item.get("slug")
        data = item.get("data") or {}
        if kind not in ("weapon", "armor", "item") or not slug:
            continue
        result = conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET
                    name_ru = COALESCE(:name_ru, name_ru),
                    name_en = COALESCE(:name_en, name_en),
                    source = COALESCE(:source, source),
                    data = CAST(:data AS jsonb),
                    updated_at = NOW()
                WHERE kind = CAST(:kind AS catalog_kind)
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :slug
                """
            ),
            {
                "kind": kind,
                "slug": slug,
                "name_ru": item.get("name_ru"),
                "name_en": item.get("name_en"),
                "source": item.get("source"),
                "data": json.dumps(data, ensure_ascii=False),
            },
        )
        updated += result.rowcount or 0

    if updated < 200:
        raise RuntimeError(
            f"Expected to update many 2014 gear rows; only updated {updated}"
        )

    inserted = 0
    for item in inserts:
        kind = item.get("kind")
        slug = item.get("slug")
        if kind != "item" or not slug:
            continue
        exists = conn.execute(
            sa.text(
                """
                SELECT 1 FROM catalog_entries
                WHERE kind = 'item'
                  AND rules_edition = '2014'
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"slug": slug},
        ).first()
        if exists:
            # Idempotent re-run: refresh payload.
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
                      AND rules_edition = '2014'
                      AND slug = :slug
                    """
                ),
                {
                    "slug": slug,
                    "name_ru": item.get("name_ru"),
                    "name_en": item.get("name_en"),
                    "source": item.get("source"),
                    "sort_order": int(item.get("sort_order") or 0),
                    "data": json.dumps(item.get("data") or {}, ensure_ascii=False),
                },
            )
            continue
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
                "id": item["id"],
                "kind": kind,
                "slug": slug,
                "name_ru": item.get("name_ru"),
                "name_en": item.get("name_en"),
                "rules_edition": item.get("rules_edition") or "2014",
                "source": item.get("source"),
                "sort_order": int(item.get("sort_order") or 0),
                "data": json.dumps(item.get("data") or {}, ensure_ascii=False),
            },
        )
        inserted += 1

    _ = inserted


def downgrade() -> None:
    """Best-effort: remove inserted potions; cannot restore pre-backfill names/data."""
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'item'
              AND rules_edition = '2014'
              AND slug IN (
                'potion_of_healing',
                'potion_of_greater_healing',
                'potion_of_superior_healing',
                'potion_of_supreme_healing'
              )
              AND source = 'DMG 2014'
            """
        )
    )
