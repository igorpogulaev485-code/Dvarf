"""Upsert PHB 2014 backgrounds with skill/tool/language grants.

Revision ID: j7f8a9b0c1d2
Revises: j6e7f8a9b0c1
Create Date: 2026-10-07 18:00:00.000000
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "j6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BACKEND_ROOT = Path(__file__).resolve().parents[2]
SPEC_REL = Path("data/backgrounds/phb2014_background_catalog_spec.json")


def _load_backgrounds() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        BACKEND_ROOT / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            return list(
                json.loads(path.read_text(encoding="utf-8")).get("backgrounds") or []
            )
    raise FileNotFoundError(str(SPEC_REL))


def upgrade() -> None:
    conn = op.get_bind()
    for row in _load_backgrounds():
        slug = row["slug"]
        data = dict(row.get("data") or {})
        data["source"] = row.get("source") or data.get("source") or "phb"
        data["wave"] = "phb"
        existing = (
            conn.execute(
                sa.text(
                    """
                    SELECT id, data FROM catalog_entries
                    WHERE kind = 'background' AND slug = :slug AND rules_edition = '2014'
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
            # Keep granted_feat_* from feat-linked wave if PHB row lacks it.
            for key in ("granted_feat_slug", "granted_feat_note_ru"):
                if key not in data and key in merged:
                    data[key] = merged[key]
            merged.update(data)
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET name_ru = :name_ru, name_en = :name_en, source = :source,
                        data = CAST(:data AS jsonb), sort_order = :sort_order,
                        is_active = true, updated_at = now()
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
            continue
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
                    CAST(:id AS uuid), 'background', :slug, :name_ru, :name_en, '2014',
                    NULL, :source, NULL, CAST(:data AS jsonb), :sort_order, true
                )
                """
            ),
            {
                "id": str(entry_id),
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row.get("name_en"),
                "source": row.get("source") or "phb",
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": int(row.get("sort_order") or 999),
            },
        )


def downgrade() -> None:
    # Keep rows; grants live in JSON.
    pass
