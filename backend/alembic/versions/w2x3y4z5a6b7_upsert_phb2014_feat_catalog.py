"""Upsert PHB 2014 feat catalog (wave: player's handbook).

Revision ID: w2x3y4z5a6b7
Revises: s8b9c0d1e2f3
Create Date: 2026-10-07 14:10:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "w2x3y4z5a6b7"
down_revision: Union[str, Sequence[str], None] = "s8b9c0d1e2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/feats/phb2014_feat_catalog_spec.json")


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
    data["source"] = row.get("source") or data.get("source") or "phb"
    data["wave"] = "phb"
    return data


def upgrade() -> None:
    conn = op.get_bind()
    feats = _load_spec()

    for row in feats:
        slug = row["slug"]
        data = _catalog_data(row)
        existing = (
            conn.execute(
                sa.text(
                    """
                    SELECT id, data
                    FROM catalog_entries
                    WHERE kind = 'feat'
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
                    "source": row.get("source") or "phb",
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
                    CAST(:id AS uuid),
                    'feat',
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


def downgrade() -> None:
    conn = op.get_bind()
    # Keep SRD stub rows; strip PHB grant payload written by this migration.
    strip_keys = [
        "prerequisites_ru",
        "summary_ru",
        "benefits_ru",
        "prerequisites",
        "choices",
        "grants",
        "wave",
    ]
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data, source
            FROM catalog_entries
            WHERE kind = 'feat' AND rules_edition = '2014'
            """
        )
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        if data.get("wave") != "phb" and row["source"] not in ("phb", "PHB"):
            continue
        for key in strip_keys:
            data.pop(key, None)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb), updated_at = now()
                WHERE id = :id
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
