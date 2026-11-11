"""Insert BMT armor/shields pack (Book of Many Things) into 2014 weapon catalog.

Revision ID: s1r0c0bmta01
Revises: s1r0c0bmtw01
Create Date: 2026-10-20 09:40:00.000000

Chained onto moonbow. Idempotent upsert of 13 BMT armors/shields.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "s1r0c0bmta01"
down_revision: Union[str, Sequence[str], None] = "s1r0c0bmtw01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/gear_bmt_armor_v1.json")
EXPECTED_MIN = 13


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
    raise FileNotFoundError(f"BMT armor gear file not found; tried {candidates}")


def _entry_id(item: dict[str, Any]) -> str:
    if item.get("id"):
        return str(item["id"])
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:catalog:armor:2014:{item['slug']}"))


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    inserts = [row for row in (payload.get("inserts") or []) if row.get("slug")]
    if len(inserts) < EXPECTED_MIN:
        raise RuntimeError(f"Expected ≥{EXPECTED_MIN} BMT armor inserts, got {len(inserts)}")

    for item in inserts:
        kind = item.get("kind") or "armor"
        slug = item["slug"]
        data = item.get("data") or {}
        params = {
            "slug": slug,
            "name_ru": item.get("name_ru"),
            "name_en": item.get("name_en"),
            "source": item.get("source") or "BMT 2014",
            "sort_order": int(item.get("sort_order") or 10700),
            "data": json.dumps(data, ensure_ascii=False),
            "kind": kind,
            "rules_edition": item.get("rules_edition") or "2014",
        }

        exists = conn.execute(
            sa.text(
                """
                SELECT id FROM catalog_entries
                WHERE kind = CAST(:kind AS catalog_kind)
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"kind": kind, "slug": slug},
        ).mappings().first()

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
                    WHERE id = :id
                    """
                ),
                {**params, "id": str(exists["id"])},
            )
            continue

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
            {**params, "id": _entry_id(item)},
        )


def downgrade() -> None:
    # Non-destructive: catalog rows stay; content is additive.
    pass
