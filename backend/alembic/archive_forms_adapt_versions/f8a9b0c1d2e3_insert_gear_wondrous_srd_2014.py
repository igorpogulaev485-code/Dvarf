"""Insert 2014 SRD/DMG wondrous items, rings, potions (W3).

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-10-08 10:20:00.000000

- Upsert rings, cloaks/boots/gloves, belts, amulets, containers,
  wands, figurines, potions beyond healing family.
- RU names, wear_slot, rarity, effects MVP.
- Does not wipe existing gear; healing potions left as-is (G2).
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f8a9b0c1d2e3"
down_revision: Union[str, Sequence[str], None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/gear_wondrous_srd_v1.json")


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
    raise FileNotFoundError(f"Wondrous SRD file not found; tried {candidates}")


def _entry_id(item: dict[str, Any]) -> str:
    if item.get("id"):
        return str(item["id"])
    slug = item["slug"]
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:catalog:item:2014:{slug}"))


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    inserts = payload.get("inserts") or []
    if len(inserts) < 60:
        raise RuntimeError(f"Expected ~73 wondrous inserts, got {len(inserts)}")

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
                {
                    "slug": slug,
                    "name_ru": item.get("name_ru"),
                    "name_en": item.get("name_en"),
                    "source": item.get("source"),
                    "sort_order": int(item.get("sort_order") or 0),
                    "data": json.dumps(data, ensure_ascii=False),
                },
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
                    "id": _entry_id(item),
                    "kind": kind,
                    "slug": slug,
                    "name_ru": item.get("name_ru"),
                    "name_en": item.get("name_en"),
                    "rules_edition": item.get("rules_edition") or "2014",
                    "source": item.get("source"),
                    "sort_order": int(item.get("sort_order") or 0),
                    "data": json.dumps(data, ensure_ascii=False),
                },
            )
        touched += 1

    if touched < 60:
        raise RuntimeError(f"Expected to upsert many wondrous rows; only {touched}")


def downgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    slugs = [item["slug"] for item in (payload.get("inserts") or []) if item.get("slug")]
    if not slugs:
        return
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'item'
              AND rules_edition = '2014'
              AND source = 'DMG 2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": slugs},
    )
