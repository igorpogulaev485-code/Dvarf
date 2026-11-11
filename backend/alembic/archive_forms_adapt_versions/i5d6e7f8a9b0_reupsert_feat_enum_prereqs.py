"""Re-upsert SDQ/PAM/BPGG feats with feat_enums_all (moon/plane/strike).

Revision ID: i5d6e7f8a9b0
Revises: h4c5d6e7f8a9
Create Date: 2026-10-07 16:30:00.000000
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i5d6e7f8a9b0"
down_revision: Union[str, Sequence[str], None] = "h4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _load_feats(rel: str) -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / rel,
        Path.cwd() / "backend" / rel,
        BACKEND_ROOT / rel,
    ]
    for path in candidates:
        if path.is_file():
            return list(json.loads(path.read_text(encoding="utf-8")).get("feats") or [])
    raise FileNotFoundError(rel)


def _upsert(conn: sa.Connection, rows: list[dict[str, Any]], wave: str) -> None:
    for row in rows:
        slug = row["slug"]
        data = dict(row.get("data") or {})
        data["source"] = row.get("source") or data.get("source") or wave
        data["wave"] = wave
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
                    "source": row.get("source") or wave,
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
                "source": row.get("source") or wave,
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": int(row.get("sort_order") or 999),
            },
        )


def upgrade() -> None:
    conn = op.get_bind()
    _upsert(conn, _load_feats("data/feats/sdq2014_feat_catalog_spec.json"), "sdq")
    _upsert(conn, _load_feats("data/feats/pam2014_feat_catalog_spec.json"), "pam")
    _upsert(conn, _load_feats("data/feats/bpgg2014_feat_catalog_spec.json"), "bpgg")


def downgrade() -> None:
    # Enum prereqs live in JSON; no destructive downgrade.
    pass
