"""Insert missing PHB 2014 spells (non-SRD gap from dnd.su).

Revision ID: y1z2a3b4c5d6
Revises: x0y1z2a3b4c5
Create Date: 2026-10-08 01:40:00.000000

Adds ~45 PHB spells absent from SRD 5.1 seed (smite spells, Hex, Witch Bolt, …).
Does not touch 2024. Idempotent upsert by slug.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "y1z2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "x0y1z2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/spells_phb_gap_v1.json")


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
    raise FileNotFoundError(f"PHB gap file not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    spells = _load()
    if len(spells) < 30:
        raise RuntimeError(f"Expected ~45 PHB gap spells, got {len(spells)}")

    inserted = 0
    updated = 0
    for item in spells:
        slug = item.get("slug")
        data = item.get("data") or {}
        if not slug or not isinstance(data, dict):
            continue
        existing = conn.execute(
            sa.text(
                """
                SELECT id FROM catalog_entries
                WHERE kind = 'spell' AND rules_edition = '2014' AND slug = :slug
                """
            ),
            {"slug": slug},
        ).mappings().first()

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
                        is_active = true,
                        updated_at = NOW()
                    WHERE id = :id
                    """
                ),
                {
                    "id": str(existing["id"]),
                    "name_ru": item.get("name_ru"),
                    "name_en": item.get("name_en"),
                    "source": item.get("source") or "phb-2014",
                    "external_ref": json.dumps(item.get("external_ref") or {}, ensure_ascii=False),
                    "data": json.dumps(data, ensure_ascii=False),
                },
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
                    'spell',
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
                "id": item["id"],
                "slug": slug,
                "name_ru": item.get("name_ru"),
                "name_en": item.get("name_en"),
                "source": item.get("source") or "phb-2014",
                "external_ref": json.dumps(item.get("external_ref") or {}, ensure_ascii=False),
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": int(item.get("sort_order") or 5000),
            },
        )
        inserted += 1

    if inserted + updated < 30:
        raise RuntimeError(
            f"PHB gap upsert too small: inserted={inserted} updated={updated}"
        )


def downgrade() -> None:
    conn = op.get_bind()
    spells = _load()
    slugs = [s["slug"] for s in spells if s.get("slug")]
    if not slugs:
        return
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND source = 'phb-2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": slugs},
    )
