"""Upsert Circle of the Land always_prepared_spells (PHB land tables).

Revision ID: j5e6f7a8b9c0
Revises: i4d5e6f7a8b9
Create Date: 2026-10-22

Q4: Circle Spells gated by land_type pick (arctic…underdark), from_class_level 3/5/7/9.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "i4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")
LAND_SLUG = "circle_of_the_land"


def _stable_subclass_id(slug: str) -> str:
    digest = hashlib.md5(f"dvarf-subclass-2014-{slug}".encode("utf-8")).hexdigest()
    return f"33333333-3333-4333-a333-{digest[:12]}"


def _load_land() -> tuple[int, dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            for cls in payload.get("classes") or []:
                if cls.get("parent_slug") == "druid":
                    grants_level = int(cls.get("grants_level") or 2)
                    for sub in cls.get("subclasses") or []:
                        if sub.get("slug") == LAND_SLUG:
                            return grants_level, sub
            raise ValueError("circle_of_the_land not found under druid in subclass seed")
    raise FileNotFoundError(f"Subclass seed not found; tried {candidates}")


def _catalog_data(grants_level: int, sub: dict[str, Any]) -> dict[str, Any]:
    return {
        "parent_slug": "druid",
        "grants_level": grants_level,
        "source": sub.get("source") or "phb",
        "source_books": sub.get("source_books"),
        "sheet_grants": sub.get("sheet_grants") or {},
        "choices": sub.get("choices") or [],
        "notes_ru": sub.get("notes_ru"),
        "always_prepared_spells": sub.get("always_prepared_spells") or [],
        "features_by_level": sub.get("features_by_level") or {},
        "detail_status": sub.get("detail_status"),
    }


def upgrade() -> None:
    grants_level, sub = _load_land()
    data = _catalog_data(grants_level, sub)
    conn = op.get_bind()
    subclass_id = _stable_subclass_id(LAND_SLUG)
    parent = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'class'
              AND slug = 'druid'
              AND rules_edition = '2014'
              AND is_active = true
            ORDER BY sort_order ASC
            LIMIT 1
            """
        )
    ).first()
    parent_id = str(parent[0]) if parent else None

    existing = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'subclass'
              AND rules_edition = '2014'
              AND (
                id = CAST(:id AS uuid)
                OR slug = :slug
              )
            LIMIT 1
            """
        ),
        {"id": subclass_id, "slug": LAND_SLUG},
    ).mappings().first()

    if existing:
        raw = existing["data"]
        prev = json.loads(raw) if isinstance(raw, str) else dict(raw or {})
        merged = {**prev, **data}
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    name_ru = COALESCE(:name_ru, name_ru),
                    name_en = COALESCE(:name_en, name_en),
                    updated_at = NOW(),
                    is_active = true
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": str(existing["id"]),
                "data": json.dumps(merged, ensure_ascii=False),
                "name_ru": sub.get("name_ru"),
                "name_en": sub.get("name_en"),
            },
        )
        return

    conn.execute(
        sa.text(
            """
            INSERT INTO catalog_entries (
              id, kind, slug, name_ru, name_en, rules_edition,
              parent_id, source, data, is_active, sort_order, created_at, updated_at
            ) VALUES (
              CAST(:id AS uuid), 'subclass', :slug, :name_ru, :name_en, '2014',
              CAST(:parent_id AS uuid), :source, CAST(:data AS jsonb), true, 0,
              NOW(), NOW()
            )
            """
        ),
        {
            "id": subclass_id,
            "slug": LAND_SLUG,
            "name_ru": sub.get("name_ru") or "Круг земли",
            "name_en": sub.get("name_en") or "Circle of the Land",
            "parent_id": parent_id,
            "source": "phb-2014",
            "data": json.dumps(data, ensure_ascii=False),
        },
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = data - 'always_prepared_spells',
                updated_at = NOW()
            WHERE kind = 'subclass'
              AND rules_edition = '2014'
              AND slug = :slug
            """
        ),
        {"slug": LAND_SLUG},
    )
