"""Upsert Circle of Spores / Stars / Wildfire always_prepared_spells.

Revision ID: h3c4d5e6f7a8
Revises: g2b3c4d5e6f7
Create Date: 2026-10-22

Q4: Tasha/GGR druid circles with circle spells (from_class_level 2/3/5/7/9).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h3c4d5e6f7a8"
down_revision: Union[str, Sequence[str], None] = "g2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")
CIRCLE_SLUGS = ("circle_of_spores", "circle_of_stars", "circle_of_wildfire")


def _stable_subclass_id(slug: str) -> str:
    digest = hashlib.md5(f"dvarf-subclass-2014-{slug}".encode("utf-8")).hexdigest()
    return f"33333333-3333-4333-a333-{digest[:12]}"


def _load() -> tuple[int, list[dict[str, Any]]]:
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
                    found = [
                        sub
                        for sub in (cls.get("subclasses") or [])
                        if sub.get("slug") in CIRCLE_SLUGS
                    ]
                    if len(found) != len(CIRCLE_SLUGS):
                        missing = set(CIRCLE_SLUGS) - {s.get("slug") for s in found}
                        raise ValueError(f"missing circles: {missing}")
                    return grants_level, found
            raise ValueError("druid block missing")
    raise FileNotFoundError(f"seed not found; tried {candidates}")


def _resolve_druid_id(conn: Any) -> str | None:
    row = conn.execute(
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
    return str(row[0]) if row else None


def _catalog_data(grants_level: int, sub: dict[str, Any]) -> dict[str, Any]:
    return {
        "parent_slug": "druid",
        "grants_level": grants_level,
        "source": sub.get("source") or "tasha",
        "source_books": sub.get("source_books"),
        "sheet_grants": sub.get("sheet_grants") or {},
        "choices": sub.get("choices") or [],
        "notes_ru": sub.get("notes_ru"),
        "always_prepared_spells": sub.get("always_prepared_spells") or [],
        "features_by_level": sub.get("features_by_level") or {},
        "detail_status": sub.get("detail_status"),
    }


def upgrade() -> None:
    conn = op.get_bind()
    grants_level, found = _load()
    parent_id = _resolve_druid_id(conn)

    for sub in found:
        slug = str(sub["slug"])
        data = _catalog_data(grants_level, sub)
        existing = conn.execute(
            sa.text(
                """
                SELECT id FROM catalog_entries
                WHERE kind = 'subclass'
                  AND slug = :slug
                  AND rules_edition = '2014'
                LIMIT 1
                """
            ),
            {"slug": slug},
        ).mappings().first()

        params = {
            "name_ru": sub["name_ru"],
            "name_en": sub.get("name_en"),
            "parent_id": parent_id,
            "source": sub.get("source") or "tasha",
            "data": json.dumps(data, ensure_ascii=False),
            "sort_order": 4100,
        }

        if existing:
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET name_ru = :name_ru,
                        name_en = :name_en,
                        parent_id = CAST(:parent_id AS uuid),
                        source = :source,
                        data = COALESCE(data, '{}'::jsonb) || CAST(:data AS jsonb),
                        sort_order = :sort_order,
                        is_active = true,
                        updated_at = now()
                    WHERE id = :id
                    """
                ),
                {**params, "id": str(existing["id"])},
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
                    'subclass',
                    :slug,
                    :name_ru,
                    :name_en,
                    '2014',
                    CAST(:parent_id AS uuid),
                    :source,
                    NULL,
                    CAST(:data AS jsonb),
                    :sort_order,
                    true
                )
                """
            ),
            {**params, "id": _stable_subclass_id(slug), "slug": slug},
        )


def downgrade() -> None:
    pass
