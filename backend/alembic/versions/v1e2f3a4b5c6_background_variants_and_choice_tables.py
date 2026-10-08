"""Upsert background variants (parent_id) and choice_tables / curated grants.

Revision ID: v1e2f3a4b5c6
Revises: u0d1e2f3a4b5
Create Date: 2026-10-07 10:40:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "v1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "u0d1e2f3a4b5"
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
    rows = _load_spec()

    # Pass 1: upsert all rows without parent_id (resolve parents next).
    id_by_slug: dict[str, str] = {}
    for row in rows:
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

        if existing:
            entry_id = str(existing["id"])
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
                    "id": entry_id,
                    "name_ru": row["name_ru"],
                    "name_en": row.get("name_en"),
                    "source": row.get("source") or "phb",
                    "data": json.dumps(merged, ensure_ascii=False),
                    "sort_order": int(row.get("sort_order") or 999),
                },
            )
        else:
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
                    "source": row.get("source") or "phb",
                    "data": json.dumps(data, ensure_ascii=False),
                    "sort_order": int(row.get("sort_order") or 999),
                },
            )
        id_by_slug[slug] = entry_id

    # Pass 2: wire parent_id for variants.
    for row in rows:
        slug = row["slug"]
        parent_slug = row.get("parent_slug") or (row.get("data") or {}).get("variant_of")
        entry_id = id_by_slug.get(slug)
        if not entry_id:
            continue
        if parent_slug and parent_slug in id_by_slug:
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET parent_id = CAST(:parent_id AS uuid), updated_at = now()
                    WHERE id = CAST(:id AS uuid)
                    """
                ),
                {"id": entry_id, "parent_id": id_by_slug[parent_slug]},
            )
        else:
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET parent_id = NULL, updated_at = now()
                    WHERE id = CAST(:id AS uuid)
                    """
                ),
                {"id": entry_id},
            )


def downgrade() -> None:
    conn = op.get_bind()
    # Detach known PHB variants; keep rows.
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET parent_id = NULL, updated_at = now()
            WHERE kind = 'background'
              AND rules_edition = '2014'
              AND slug IN ('spy', 'gladiator', 'knight', 'guild-merchant', 'pirate')
            """
        )
    )
