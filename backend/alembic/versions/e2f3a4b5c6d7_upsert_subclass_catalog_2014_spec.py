"""Upsert PHB/Tasha 2014 subclass catalog from subclass catalog spec.

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-10-07 01:40:00.000000

"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/phb2014_subclass_catalog_spec.json")

# Same stable class UUIDs as b9d0e1f2a3c4.
CLASS_STABLE_IDS: dict[str, str] = {
    "barbarian": "22222222-2222-4222-8222-222222222201",
    "bard": "22222222-2222-4222-8222-222222222202",
    "cleric": "22222222-2222-4222-8222-222222222203",
    "druid": "22222222-2222-4222-8222-222222222204",
    "fighter": "22222222-2222-4222-8222-222222222205",
    "monk": "22222222-2222-4222-8222-222222222206",
    "paladin": "22222222-2222-4222-8222-222222222207",
    "ranger": "22222222-2222-4222-8222-222222222208",
    "rogue": "22222222-2222-4222-8222-222222222209",
    "sorcerer": "22222222-2222-4222-8222-222222222210",
    "warlock": "22222222-2222-4222-8222-222222222211",
    "wizard": "22222222-2222-4222-8222-222222222212",
    "artificer": "22222222-2222-4222-8222-222222222213",
}


def _stable_subclass_id(slug: str) -> str:
    digest = hashlib.md5(f"dvarf-subclass-2014-{slug}".encode("utf-8")).hexdigest()
    return f"33333333-3333-4333-a333-{digest[:12]}"


def _load_spec() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            return list(payload.get("classes") or [])
    raise FileNotFoundError(f"Subclass catalog spec not found; tried {candidates}")


def _catalog_data(parent_slug: str, grants_level: int, sub: dict[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {
        "parent_slug": parent_slug,
        "grants_level": grants_level,
        "source": sub.get("source") or "phb",
        "sheet_grants": sub.get("sheet_grants") or {},
        "choices": sub.get("choices") or [],
        "notes_ru": sub.get("notes_ru"),
    }
    if sub.get("domain_spells_note"):
        data["domain_spells_note"] = sub["domain_spells_note"]
    if sub.get("future_choices"):
        data["future_choices"] = sub["future_choices"]
    return data


def _resolve_parent_id(conn: Any, parent_slug: str) -> str | None:
    preferred = CLASS_STABLE_IDS.get(parent_slug)
    if preferred:
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
            {"id": preferred},
        ).first()
        if row:
            return str(row[0])
    row = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'class'
              AND slug = :slug
              AND rules_edition = '2014'
              AND is_active = true
            ORDER BY sort_order ASC
            LIMIT 1
            """
        ),
        {"slug": parent_slug},
    ).first()
    return str(row[0]) if row else preferred


def upgrade() -> None:
    conn = op.get_bind()
    classes = _load_spec()
    sort_order = 0
    for cls in classes:
        parent_slug = cls["parent_slug"]
        grants_level = int(cls.get("grants_level") or 3)
        parent_id = _resolve_parent_id(conn, parent_slug)
        if not parent_id:
            continue
        for sub in cls.get("subclasses") or []:
            slug = sub["slug"]
            sort_order += 10
            data = _catalog_data(parent_slug, grants_level, sub)
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
                    {
                        "id": str(existing["id"]),
                        "name_ru": sub["name_ru"],
                        "name_en": sub.get("name_en"),
                        "parent_id": parent_id,
                        "source": sub.get("source") or "phb",
                        "data": json.dumps(data, ensure_ascii=False),
                        "sort_order": sort_order,
                    },
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
                    "id": entry_id,
                    "slug": slug,
                    "name_ru": sub["name_ru"],
                    "name_en": sub.get("name_en"),
                    "parent_id": parent_id,
                    "source": sub.get("source") or "phb",
                    "data": json.dumps(data, ensure_ascii=False),
                    "sort_order": sort_order,
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    classes = _load_spec()
    for cls in classes:
        for sub in cls.get("subclasses") or []:
            conn.execute(
                sa.text(
                    """
                    DELETE FROM catalog_entries
                    WHERE kind = 'subclass'
                      AND rules_edition = '2014'
                      AND slug = :slug
                    """
                ),
                {"slug": sub["slug"]},
            )
