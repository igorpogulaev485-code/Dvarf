"""Upsert MPMM 2014 bestiary catalog (kind=bestiary).

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-10-15 06:15:00.000000

Seeds ~258 official Basic creatures (MPMM reprints + unique) from ttg.club.
Stats = ttg (conflict→ttg). Idempotent upsert by slug.
No slug overlap with MM / VGM / MTF waves (MPMM uses _mpmm suffixes where needed).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union
from uuid import NAMESPACE_URL, uuid5

import sqlalchemy as sa
from alembic import op

revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "d6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/bestiary_mpmm_v1.json")


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
    raise FileNotFoundError(f"MPMM bestiary file not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    rows = _load()
    if len(rows) < 240:
        raise RuntimeError(f"Expected ~258 MPMM creatures, got {len(rows)}")

    by_book: dict[str, int] = {}
    inserted = 0
    updated = 0
    for index, item in enumerate(rows):
        slug = item.get("slug")
        data = item.get("data") or {}
        if not slug or not isinstance(data, dict):
            continue
        book = str(data.get("source_book") or "?")
        by_book[book] = by_book.get(book, 0) + 1
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
            "source": item.get("source") or f"ttg:{book}",
            "external_ref": json.dumps(item.get("external_ref") or {}, ensure_ascii=False),
            "data": json.dumps(data, ensure_ascii=False),
            "sort_order": int(item.get("sort_order") or (30000 + index)),
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

    if inserted + updated < 240:
        raise RuntimeError(
            f"MPMM bestiary upsert too small: inserted={inserted} updated={updated}"
        )
    if by_book.get("MPMM", 0) < 240:
        raise RuntimeError(f"Unexpected book mix: {by_book}")


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
