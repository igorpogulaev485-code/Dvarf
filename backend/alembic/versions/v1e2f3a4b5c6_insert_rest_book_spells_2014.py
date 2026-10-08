"""Insert remaining official 2014 spells (TCE + setting books).

Revision ID: v1e2f3a4b5c6
Revises: u0d1e2f3a4b5
Create Date: 2026-10-08 01:55:00.000000

Adds ~68 spells: TCE, EGW, AI, FTD, SCC, etc. Closes official dnd.su gap
(homebrew excluded). Idempotent upsert by slug.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "v1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "u0d1e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/spells_rest_books_v1.json")


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
    raise FileNotFoundError(f"Rest-books spell file not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    spells = _load()
    if len(spells) < 50:
        raise RuntimeError(f"Expected ~68 rest-book spells, got {len(spells)}")

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

        payload = {
            "name_ru": item.get("name_ru"),
            "name_en": item.get("name_en"),
            "source": item.get("source") or "official-2014",
            "external_ref": json.dumps(item.get("external_ref") or {}, ensure_ascii=False),
            "data": json.dumps(data, ensure_ascii=False),
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
                **payload,
                "id": item["id"],
                "slug": slug,
                "sort_order": int(item.get("sort_order") or 7000),
            },
        )
        inserted += 1

    if inserted + updated < 50:
        raise RuntimeError(
            f"Rest-books upsert too small: inserted={inserted} updated={updated}"
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
              AND slug = ANY(:slugs)
              AND source LIKE '%-2014'
              AND source NOT IN ('srd-5.1', 'phb-2014', 'xge-2014')
            """
        ),
        {"slugs": slugs},
    )
