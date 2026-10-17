"""load SRD 5.2 (2024) catalog entries

Revision ID: c2b8b2062024
Revises: c1a7a1052014
Create Date: 2026-10-06 14:45:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c2b8b2062024"
down_revision: Union[str, Sequence[str], None] = "c1a7a1052014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

catalog_kind = postgresql.ENUM(name="catalog_kind", create_type=False)
catalog_rules_edition = postgresql.ENUM(name="catalog_rules_edition", create_type=False)

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "srd" / "2024" / "catalog.json"


def _load_rows() -> list[dict[str, Any]]:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise RuntimeError(f"Expected list in {DATA_PATH}")
    return payload


def upgrade() -> None:
    catalog_entries = sa.table(
        "catalog_entries",
        sa.column("id", sa.UUID()),
        sa.column("kind", catalog_kind),
        sa.column("slug", sa.String()),
        sa.column("name_ru", sa.String()),
        sa.column("name_en", sa.String()),
        sa.column("rules_edition", catalog_rules_edition),
        sa.column("parent_id", sa.UUID()),
        sa.column("source", sa.String()),
        sa.column("external_ref", postgresql.JSONB()),
        sa.column("data", postgresql.JSONB()),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
    )

    rows = []
    for item in _load_rows():
        rows.append(
            {
                "id": item["id"],
                "kind": item["kind"],
                "slug": item["slug"],
                "name_ru": item["name_ru"],
                "name_en": item.get("name_en"),
                "rules_edition": item.get("rules_edition", "2024"),
                "parent_id": item.get("parent_id"),
                "source": item.get("source", "srd-5.2"),
                "external_ref": item.get("external_ref"),
                "data": item.get("data") or {},
                "sort_order": int(item.get("sort_order") or 0),
                "is_active": bool(item.get("is_active", True)),
            }
        )

    chunk = 200
    for start in range(0, len(rows), chunk):
        op.bulk_insert(catalog_entries, rows[start : start + chunk])


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE source = 'srd-5.2' AND rules_edition = '2024'
            """
        )
    )
