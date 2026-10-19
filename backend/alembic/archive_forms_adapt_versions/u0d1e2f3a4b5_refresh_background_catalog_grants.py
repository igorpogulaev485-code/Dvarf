"""Refresh 2014 background catalog grant payloads from curated spec.

Revision ID: u0d1e2f3a4b5
Revises: t9c0d1e2f3a4
Create Date: 2026-10-07 10:20:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "u0d1e2f3a4b5"
down_revision: Union[str, Sequence[str], None] = "t9c0d1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/backgrounds/phb2014_background_catalog_spec.json")


def _load_spec() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            return list(payload.get("backgrounds") or [])
    raise FileNotFoundError(f"Background catalog spec not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    for row in _load_spec():
        slug = row["slug"]
        data = dict(row.get("data") or {})
        data["source"] = row.get("source") or data.get("source") or "phb"
        existing = conn.execute(
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
        ).mappings().first()
        if not existing:
            continue
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
                "source": row.get("source") or "phb",
                "data": json.dumps(merged, ensure_ascii=False),
                "sort_order": int(row.get("sort_order") or 999),
            },
        )


def downgrade() -> None:
    # Non-destructive: leave refreshed payload in place.
    pass
