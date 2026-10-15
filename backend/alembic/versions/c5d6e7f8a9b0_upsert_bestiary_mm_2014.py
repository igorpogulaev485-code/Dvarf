"""Upsert Monster Manual 2014 bestiary catalog (kind=bestiary).

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-10-15 05:10:00.000000

Seeds ~451 MM creatures from ttg.club (official Basic). Stats = ttg
(conflict→ttg product rule). Idempotent upsert by slug.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union
from uuid import NAMESPACE_URL, uuid5

import sqlalchemy as sa
from alembic import op

revision: str = "c5d6e7f8a9b0"
down_revision: Union[str, Sequence[str], None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/bestiary_mm_v1.json")


def _load() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / "backend" / DATA_REL,
        Path.cwd() / DATA_REL,
        Path(__file__).resolve().parents[2] / DATA_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload, list):
                raise RuntimeError(f"Expected list in {path}")
            return payload
    raise FileNotFoundError(f"MM bestiary file not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    rows = _load()
    if len(rows) < 400:
        raise RuntimeError(f"Expected ~451 MM creatures, got {len(rows)}")

    inserted = 0
    updated = 0
    for index, item in enumerate(rows):
        slug = item.get("slug")
        data = item.get("data") or {}
        if not slug or not isinstance(data, dict):
            continue
        entry_id = str(uuid5(NAMESPACE_URL, f"dvarf:catalog:bestiary:2014:{slug}"))
        existing = conn.execute(
            sa.text(
                """
                SELECT id FROM catalog_entries
                WHERE kind = 'bestiary' AND rules_edition = '2014' AND slug = :slug
                """
            ),
            {"slug": slug},
        ).mappings().first()

        payload = {
            "name_ru": item.get("name_ru"),
            "name_en": item.get("name_en"),
            "source": item.get("source") or "ttg:MM",
            "external_ref": json.dumps(item.get("external_ref") or {}, ensure_ascii=False),
            "data": json.dumps(data, ensure_ascii=False),
            "sort_order": int(item.get("sort_order") or (10000 + index)),
        }

        if existing:
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET
                        name_ru = COALESCE(:name_ru, name_ru),
                        name_en = COALESCE(:name_en, name_en),
                        source = COALESCE(:source, source),
                        external_ref = CAST(:external_ref AS jsonb),
                        data = CAST(:data AS jsonb),
                        sort_order = :sort_order,
                        is_active = true,
                        updated_at = NOW()
                    WHERE id = :id
                    """
                ),
                {**payload, "id": str(existing["id"])},
            )
            updated += 1
            continue

        conn.execute(
            sa.text(
                """
                INSERT INTO catalog_entries (
                    id, kind, slug, name_ru, name_en, rules_edition,
                    parent_id, source, external_ref, data, sort_order, is_active
                ) VALUES (
                    CAST(:id AS uuid),
                    'bestiary',
                    :slug,
                    :name_ru,
                    :name_en,
                    '2014',
                    NULL,
                    :source,
                    CAST(:external_ref AS jsonb),
                    CAST(:data AS jsonb),
                    :sort_order,
                    true
                )
                """
            ),
            {
                **payload,
                "id": entry_id,
                "slug": slug,
            },
        )
        inserted += 1

    if inserted + updated < 400:
        raise RuntimeError(
            f"MM bestiary upsert too small: inserted={inserted} updated={updated}"
        )


def downgrade() -> None:
    conn = op.get_bind()
    rows = _load()
    slugs = [r["slug"] for r in rows if r.get("slug")]
    if not slugs:
        return
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'bestiary'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
              AND source LIKE 'ttg:%'
            """
        ),
        {"slugs": slugs},
    )
