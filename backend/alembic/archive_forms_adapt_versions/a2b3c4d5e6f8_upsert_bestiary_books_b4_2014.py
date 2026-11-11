"""Upsert B4 book bestiaries 2014 (FTD/BGG/BAM/TCE/BMT).

Revision ID: a2b3c4d5e6f8
Revises: f1a2b3c4d5e7
Create Date: 2026-10-15 06:30:00.000000

Seeds ~290 official Basic creatures from ttg.club:
FTD 85 + BGG 72 + BAM 72 + BMT 41 + TCE 20 (incl. Wildfire Spirit HP base 10).
Stats = ttg (conflict→ttg). Idempotent upsert by slug. No overlap with B1–B3.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union
from uuid import NAMESPACE_URL, uuid5

import sqlalchemy as sa
from alembic import op

revision: str = "a2b3c4d5e6f8"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/bestiary_books_b4_v1.json")


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
    raise FileNotFoundError(f"B4 bestiary file not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    rows = _load()
    if len(rows) < 280:
        raise RuntimeError(f"Expected ~290 B4 creatures, got {len(rows)}")

    by_book: dict[str, int] = {}
    inserted = 0
    updated = 0
    wildfire_ok = False
    for index, item in enumerate(rows):
        slug = item.get("slug")
        data = item.get("data") or {}
        if not slug or not isinstance(data, dict):
            continue
        book = str(data.get("source_book") or "?")
        by_book[book] = by_book.get(book, 0) + 1
        if slug == "wildfire_spirit":
            if data.get("hp_average") != 10:
                raise RuntimeError(
                    f"Wildfire Spirit hp_average must be 10 (ttg), got {data.get('hp_average')}"
                )
            if not data.get("hp_scaling_text"):
                raise RuntimeError("Wildfire Spirit missing hp_scaling_text")
            wildfire_ok = True
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
            "sort_order": int(item.get("sort_order") or (40000 + index)),
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

    if inserted + updated < 280:
        raise RuntimeError(
            f"B4 bestiary upsert too small: inserted={inserted} updated={updated}"
        )
    expected = {"FTD": 80, "BGG": 70, "BAM": 70, "BMT": 35, "TCE": 15}
    for book, min_n in expected.items():
        if by_book.get(book, 0) < min_n:
            raise RuntimeError(f"Unexpected book mix: {by_book}")
    if not wildfire_ok:
        raise RuntimeError("Wildfire Spirit missing from B4 seed (TCE lock)")


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
