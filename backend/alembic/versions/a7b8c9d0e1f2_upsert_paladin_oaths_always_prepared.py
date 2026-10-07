"""Upsert paladin oath always-prepared spells + sheet grants (9 oaths).

Revision ID: a7b8c9d0e1f2
Revises: a6b7c8d9e0f1
Create Date: 2026-10-07 04:45:00.000000

"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "a6b7c8d9e0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")

PALADIN_STABLE_ID = "22222222-2222-4222-8222-222222222207"

PALADIN_OATH_SLUGS = {
    "oath_of_devotion",
    "oath_of_the_ancients",
    "oath_of_vengeance",
    "oathbreaker",
    "oath_of_the_crown",
    "oath_of_conquest",
    "oath_of_redemption",
    "oath_of_glory",
    "oath_of_the_watchers",
}


def _stable_subclass_id(slug: str) -> str:
    digest = hashlib.md5(f"dvarf-subclass-2014-{slug}".encode("utf-8")).hexdigest()
    return f"33333333-3333-4333-a333-{digest[:12]}"


def _load_paladin_subs() -> tuple[int, list[dict[str, Any]]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            for cls in payload.get("classes") or []:
                if cls.get("parent_slug") == "paladin":
                    grants_level = int(cls.get("grants_level") or 3)
                    return grants_level, list(cls.get("subclasses") or [])
            raise ValueError("paladin parent not found in subclass seed")
    raise FileNotFoundError(f"Subclass seed not found; tried {candidates}")


def _catalog_data(grants_level: int, sub: dict[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {
        "parent_slug": "paladin",
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
    return data


def _resolve_paladin_id(conn: Any) -> str | None:
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
        {"id": PALADIN_STABLE_ID},
    ).first()
    if row:
        return str(row[0])
    row = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'class'
              AND slug = 'paladin'
              AND rules_edition = '2014'
              AND is_active = true
            ORDER BY sort_order ASC
            LIMIT 1
            """
        )
    ).first()
    return str(row[0]) if row else PALADIN_STABLE_ID


def upgrade() -> None:
    conn = op.get_bind()
    grants_level, subclasses = _load_paladin_subs()
    parent_id = _resolve_paladin_id(conn)
    if not parent_id:
        return

    sort_order = 4000
    for sub in subclasses:
        slug = sub.get("slug")
        if slug not in PALADIN_OATH_SLUGS:
            continue
        sort_order += 10
        data = _catalog_data(grants_level, sub)
        entry_id = _stable_subclass_id(slug)
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
            "source": sub.get("source") or "phb",
            "data": json.dumps(data, ensure_ascii=False),
            "sort_order": sort_order,
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
            {**params, "id": entry_id, "slug": slug},
        )


def downgrade() -> None:
    # Non-destructive: leave catalog rows; always-prepared lists are additive content.
    pass
