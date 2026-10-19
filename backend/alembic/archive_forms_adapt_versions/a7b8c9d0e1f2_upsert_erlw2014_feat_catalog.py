"""Upsert ERLW/WGTE 2014 feat catalog (Eberron wave).

Revision ID: a7b8c9d0e1f2
Revises: z5a6b7c8d9e0
Create Date: 2026-10-07 14:35:00.000000
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "z5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/feats/erlw2014_feat_catalog_spec.json")


def _load_spec() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            return list(payload.get("feats") or [])
    raise FileNotFoundError(f"Feat catalog spec not found; tried {candidates}")


def _catalog_data(row: dict[str, Any]) -> dict[str, Any]:
    data = dict(row.get("data") or {})
    data["source"] = row.get("source") or data.get("source") or "erlw"
    data["wave"] = "erlw"
    return data


def upgrade() -> None:
    conn = op.get_bind()
    for row in _load_spec():
        slug = row["slug"]
        data = _catalog_data(row)
        existing = (
            conn.execute(
                sa.text(
                    """
                    SELECT id, data FROM catalog_entries
                    WHERE kind = 'feat' AND slug = :slug AND rules_edition = '2014'
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
                    "source": row.get("source") or "erlw",
                    "data": json.dumps(merged, ensure_ascii=False),
                    "sort_order": int(row.get("sort_order") or 999),
                },
            )
            continue
        entry_id = row.get("id") or str(
            uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:feat:2014:{slug}")
        )
        conn.execute(
            sa.text(
                """
                INSERT INTO catalog_entries (
                    id, kind, slug, name_ru, name_en, rules_edition,
                    parent_id, source, external_ref, data, sort_order, is_active
                ) VALUES (
                    CAST(:id AS uuid), 'feat', :slug, :name_ru, :name_en, '2014',
                    NULL, :source, NULL, CAST(:data AS jsonb), :sort_order, true
                )
                """
            ),
            {
                "id": str(entry_id),
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row.get("name_en"),
                "source": row.get("source") or "erlw",
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": int(row.get("sort_order") or 999),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'feat' AND rules_edition = '2014'
              AND (
                source IN ('erlw', 'wgte')
                OR data->>'wave' = 'erlw'
              )
            """
        )
    )
