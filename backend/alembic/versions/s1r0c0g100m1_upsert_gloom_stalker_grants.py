"""Upsert Gloom Stalker always-prepared spells + feature cards.

Revision ID: s1r0c0g100m1
Revises: w9x0y1z2a3b4
Create Date: 2026-10-20 09:00:00.000000

Chained onto live prod tip (content_layer stamp). Idempotent upsert.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "s1r0c0g100m1"
down_revision: Union[str, Sequence[str], None] = "w9x0y1z2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")

RANGER_STABLE_ID = "22222222-2222-4222-8222-222222222208"

GLOOM_SLUG = "gloom_stalker"


def _stable_subclass_id(slug: str) -> str:
    digest = hashlib.md5(f"dvarf-subclass-2014-{slug}".encode("utf-8")).hexdigest()
    return f"33333333-3333-4333-a333-{digest[:12]}"


def _load_gloom() -> tuple[int, dict[str, Any]]:
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
                    for sub in cls.get("subclasses") or []:
                        if sub.get("slug") == GLOOM_SLUG:
                            return grants_level, sub
            raise ValueError("gloom_stalker not found under ranger in subclass seed")
    raise FileNotFoundError(f"Subclass seed not found; tried {candidates}")


def _catalog_data(grants_level: int, sub: dict[str, Any]) -> dict[str, Any]:
    return {
        "parent_slug": "ranger",
        "grants_level": grants_level,
        "source": sub.get("source") or "xgte",
        "source_books": sub.get("source_books"),
        "sheet_grants": sub.get("sheet_grants") or {},
        "choices": sub.get("choices") or [],
        "notes_ru": sub.get("notes_ru"),
        "always_prepared_spells": sub.get("always_prepared_spells") or [],
        "features_by_level": sub.get("features_by_level") or {},
        "detail_status": sub.get("detail_status"),
    }


def _resolve_ranger_id(conn: Any) -> str | None:
    row = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE id = CAST(:id AS uuid)
              AND kind = 'class'
              AND rules_edition = '2014'
            LIMIT 1
            """
        ),
        {"id": RANGER_STABLE_ID},
    ).first()
    if row:
        return str(row[0])
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
    return str(row[0]) if row else RANGER_STABLE_ID


def upgrade() -> None:
    conn = op.get_bind()
    grants_level, sub = _load_gloom()
    parent_id = _resolve_ranger_id(conn)
    data = _catalog_data(grants_level, sub)
    entry_id = _stable_subclass_id(GLOOM_SLUG)
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
        {"slug": GLOOM_SLUG},
    ).mappings().first()

    params = {
        "name_ru": sub["name_ru"],
        "name_en": sub.get("name_en"),
        "parent_id": parent_id,
        "source": sub.get("source") or "xgte",
        "data": json.dumps(data, ensure_ascii=False),
        "sort_order": 4820,
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
                    data = CAST(:data AS jsonb),
                    sort_order = :sort_order,
                    is_active = true,
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {**params, "id": str(existing["id"])},
        )
        return

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
        {**params, "id": entry_id, "slug": GLOOM_SLUG},
    )


def downgrade() -> None:
    # Non-destructive: leave catalog row; content is additive.
    pass
