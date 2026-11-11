"""Upsert ranger conclave always_prepared_spells (XGtE/TCoE).

Revision ID: g2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-10-22

Q4: Horizon Walker, Monster Slayer, Fey Wanderer, Swarmkeeper specialty lists
(Gloom Stalker already seeded earlier).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")
RANGER_SLUGS = (
    "horizon_walker",
    "monster_slayer",
    "fey_wanderer",
    "swarmkeeper",
    "gloom_stalker",
)


def _stable_subclass_id(slug: str) -> str:
    digest = hashlib.md5(f"dvarf-subclass-2014-{slug}".encode("utf-8")).hexdigest()
    return f"33333333-3333-4333-a333-{digest[:12]}"


def _load() -> tuple[int, str | None, list[dict[str, Any]]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            for cls in payload.get("classes") or []:
                if cls.get("parent_slug") == "ranger":
                    grants_level = int(cls.get("grants_level") or 3)
                    found = [
                        sub
                        for sub in (cls.get("subclasses") or [])
                        if sub.get("slug") in RANGER_SLUGS
                        and sub.get("always_prepared_spells")
                    ]
                    return grants_level, None, found
            raise ValueError("ranger block missing")
    raise FileNotFoundError(f"seed not found; tried {candidates}")


def _resolve_ranger_id(conn: Any) -> str | None:
    row = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'class'
              AND slug = 'ranger'
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
        "parent_slug": "ranger",
        "grants_level": grants_level,
        "source": sub.get("source") or "xge",
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
    grants_level, _parent_hint, found = _load()
    parent_id = _resolve_ranger_id(conn)

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
            "source": sub.get("source") or "xge",
            "data": json.dumps(data, ensure_ascii=False),
            "sort_order": 5100,
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
            {
                **params,
                "id": _stable_subclass_id(slug),
                "slug": slug,
            },
        )


def downgrade() -> None:
    pass
