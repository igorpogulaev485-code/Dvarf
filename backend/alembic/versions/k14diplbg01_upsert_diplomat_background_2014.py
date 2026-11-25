"""Upsert ToH Diplomat background into 2014 catalog.

Revision ID: k14diplbg01
Revises: k13harenhop01
Create Date: 2026-11-25

Idempotent upsert of slug=diplomat from phb2014_background_catalog_spec.json
(Tome of Heroes / ToH HB; text from ttg 5e14).
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k14diplbg01"
down_revision: Union[str, Sequence[str], None] = "k13harenhop01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/backgrounds/phb2014_background_catalog_spec.json")
TARGET_SLUG = "diplomat"


def _load_diplomat() -> dict[str, Any]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"Background catalog spec not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    for row in payload.get("backgrounds") or []:
        if row.get("slug") == TARGET_SLUG:
            return row
    raise RuntimeError(f"{TARGET_SLUG} missing from background catalog spec")


def _catalog_data(row: dict[str, Any]) -> dict[str, Any]:
    data = dict(row.get("data") or {})
    data["source"] = row.get("source") or data.get("source") or "toh"
    return data


def upgrade() -> None:
    conn = op.get_bind()
    row = _load_diplomat()
    data = _catalog_data(row)
    slug = row["slug"]

    existing = (
        conn.execute(
            sa.text(
                """
                SELECT id, data
                FROM catalog_entries
                WHERE kind = 'background'
                  AND slug = :slug
                  AND rules_edition = '2014'
                LIMIT 1
                """
            ),
            {"slug": slug},
        )
        .mappings()
        .first()
    )

    if existing:
        merged = dict(existing["data"] or {})
        merged.update(data)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET name_ru = :name_ru,
                    name_en = :name_en,
                    source = :source,
                    data = CAST(:data AS jsonb),
                    sort_order = :sort_order,
                    is_active = true,
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {
                "id": str(existing["id"]),
                "name_ru": row["name_ru"],
                "name_en": row.get("name_en"),
                "source": row.get("source") or "toh",
                "data": json.dumps(merged, ensure_ascii=False),
                "sort_order": int(row.get("sort_order") or 19010),
            },
        )
        return

    entry_id = row.get("id") or str(
        uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:background:2014:{slug}")
    )
    conn.execute(
        sa.text(
            """
            INSERT INTO catalog_entries (
                id, kind, slug, name_ru, name_en, rules_edition,
                parent_id, source, external_ref, data, sort_order, is_active
            ) VALUES (
                CAST(:id AS uuid),
                'background',
                :slug,
                :name_ru,
                :name_en,
                '2014',
                NULL,
                :source,
                NULL,
                CAST(:data AS jsonb),
                :sort_order,
                true
            )
            """
        ),
        {
            "id": str(entry_id),
            "slug": slug,
            "name_ru": row["name_ru"],
            "name_en": row.get("name_en"),
            "source": row.get("source") or "toh",
            "data": json.dumps(data, ensure_ascii=False),
            "sort_order": int(row.get("sort_order") or 19010),
        },
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'background'
              AND slug = :slug
              AND rules_edition = '2014'
            """
        ),
        {"slug": TARGET_SLUG},
    )
