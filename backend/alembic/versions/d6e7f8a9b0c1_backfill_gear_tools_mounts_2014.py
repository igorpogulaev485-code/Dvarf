"""Backfill 2014 tools / mounts / tack / vehicles (RU + category).

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-10-08 08:45:00.000000

- Upsert artisan tools, kits, gaming sets, instruments, mounts, tack, vehicles.
- RU names, cost, weight, item_category (+ tool_type where relevant).
- Insert missing tack rows (bit/bridle, pack saddle, saddlebags, stabling).
- Does not touch 2024 or non-item kinds; does not wipe unrelated gear.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, Sequence[str], None] = "c5d6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/gear_tools_mounts_v1.json")

INSERT_SLUGS = (
    "bit_and_bridle",
    "saddle_pack",
    "saddlebags",
    "stabling_per_day",
)


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
    raise FileNotFoundError(f"Gear tools/mounts file not found; tried {candidates}")


def _entry_id(item: dict[str, Any]) -> str:
    if item.get("id"):
        return str(item["id"])
    slug = item["slug"]
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:catalog:item:2014:{slug}"))


def _upsert_item(conn: sa.Connection, item: dict[str, Any]) -> str:
    """Update existing 2014/both item by slug, or insert if missing. Returns 'update'|'insert'."""
    kind = item.get("kind") or "item"
    slug = item.get("slug")
    if kind != "item" or not slug:
        raise RuntimeError(f"Invalid gear tools/mounts row: {item!r}")

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
                    name_ru = COALESCE(:name_ru, name_ru),
                    name_en = COALESCE(:name_en, name_en),
                    source = COALESCE(:source, source),
                    data = CAST(:data AS jsonb),
                    sort_order = COALESCE(:sort_order, sort_order),
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
                "sort_order": int(item["sort_order"]) if item.get("sort_order") is not None else None,
                "data": json.dumps(data, ensure_ascii=False),
            },
        )
        return "update"

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
    return "insert"


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    updates = payload.get("updates") or []
    inserts = payload.get("inserts") or []
    if len(updates) < 70:
        raise RuntimeError(f"Expected ~76 tool/mount updates, got {len(updates)}")
    if len(inserts) < 4:
        raise RuntimeError(f"Expected 4 tack inserts, got {len(inserts)}")

    updated = 0
    inserted = 0
    for item in [*updates, *inserts]:
        action = _upsert_item(conn, item)
        if action == "update":
            updated += 1
        else:
            inserted += 1

    if updated + inserted < 74:
        raise RuntimeError(
            f"Expected to upsert many tool/mount rows; only touched {updated + inserted}"
        )
    _ = (updated, inserted)


def downgrade() -> None:
    """Best-effort: remove inserted tack rows; cannot restore pre-backfill names/data."""
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'item'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
              AND source = 'PHB 2014'
            """
        ),
        {"slugs": list(INSERT_SLUGS)},
    )
