"""Upsert cleric domain always-prepared spells + sheet grants (14 domains).

Revision ID: q6f7a8b9c0d1
Revises: p5e6f7a8b9c0
Create Date: 2026-10-07 04:30:00.000000

"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "q6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = "p5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")

CLERIC_STABLE_ID = "22222222-2222-4222-8222-222222222203"

CLERIC_DOMAIN_SLUGS = {
    "knowledge_domain",
    "life_domain",
    "light_domain",
    "nature_domain",
    "tempest_domain",
    "trickery_domain",
    "war_domain",
    "death_domain",
    "arcana_domain",
    "forge_domain",
    "grave_domain",
    "order_domain",
    "peace_domain",
    "twilight_domain",
}


def _stable_subclass_id(slug: str) -> str:
    digest = hashlib.md5(f"dvarf-subclass-2014-{slug}".encode("utf-8")).hexdigest()
    return f"33333333-3333-4333-a333-{digest[:12]}"


def _load_cleric_subs() -> tuple[int, list[dict[str, Any]]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            for cls in payload.get("classes") or []:
                if cls.get("parent_slug") == "cleric":
                    grants_level = int(cls.get("grants_level") or 1)
                    return grants_level, list(cls.get("subclasses") or [])
            raise ValueError("cleric parent not found in subclass seed")
    raise FileNotFoundError(f"Subclass seed not found; tried {candidates}")


def _catalog_data(grants_level: int, sub: dict[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {
        "parent_slug": "cleric",
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
    if sub.get("domain_spells_note"):
        data["domain_spells_note"] = sub["domain_spells_note"]
    return data


def _resolve_cleric_id(conn: Any) -> str | None:
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
        {"id": CLERIC_STABLE_ID},
    ).first()
    if row:
        return str(row[0])
    row = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'class'
              AND slug = 'cleric'
              AND rules_edition = '2014'
              AND is_active = true
            ORDER BY sort_order ASC
            LIMIT 1
            """
        )
    ).first()
    return str(row[0]) if row else CLERIC_STABLE_ID


def upgrade() -> None:
    conn = op.get_bind()
    grants_level, subclasses = _load_cleric_subs()
    parent_id = _resolve_cleric_id(conn)
    if not parent_id:
        return

    sort_order = 3000
    for sub in subclasses:
        slug = sub.get("slug")
        if slug not in CLERIC_DOMAIN_SLUGS:
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
