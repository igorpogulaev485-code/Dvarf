"""Upsert PHB/Tasha 2014 class catalog data from class catalog spec.

Revision ID: b9d0e1f2a3c4
Revises: a8c9d0e1f2b3
Create Date: 2026-10-06 16:55:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b9d0e1f2a3c4"
down_revision: Union[str, Sequence[str], None] = "a8c9d0e1f2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/phb2014_class_catalog_spec.json")

# Stable UUIDs for classes that may be missing (esp. artificer).
STABLE_IDS: dict[str, str] = {
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

SORT_ORDER: dict[str, int] = {
    "barbarian": 10,
    "bard": 20,
    "cleric": 30,
    "druid": 40,
    "fighter": 50,
    "monk": 60,
    "paladin": 70,
    "ranger": 80,
    "rogue": 90,
    "sorcerer": 100,
    "warlock": 110,
    "wizard": 120,
    "artificer": 130,
}


def _load_spec() -> list[dict[str, Any]]:
    # alembic cwd is usually backend/
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            return list(payload.get("classes") or [])
    raise FileNotFoundError(f"Class catalog spec not found; tried {candidates}")


def _catalog_data(cls: dict[str, Any]) -> dict[str, Any]:
    return {
        "hit_die": cls.get("hit_die"),
        "primary_abilities": cls.get("primary_abilities") or [],
        "saving_throws": cls.get("saving_throws") or [],
        "armor": cls.get("armor") or [],
        "weapons": cls.get("weapons") or {},
        "tools_fixed": cls.get("tools_fixed") or [],
        "tool_choices": cls.get("tool_choices"),
        "skill_choices": cls.get("skill_choices"),
        "multiclass_prerequisites": cls.get("multiclass_prerequisites"),
        "multiclass_proficiencies": cls.get("multiclass_proficiencies"),
        "caster": cls.get("caster"),
        "starting_equipment": cls.get("starting_equipment") or [],
        "source": cls.get("source") or "phb",
        "notes_ru": cls.get("notes_ru") or cls.get("starting_equipment_notes_ru"),
    }


def upgrade() -> None:
    conn = op.get_bind()
    classes = _load_spec()
    catalog_kind = postgresql.ENUM(
        "race",
        "class",
        "subclass",
        "background",
        "alignment",
        "skill",
        "feat",
        "spell",
        "weapon",
        "armor",
        "item",
        "condition",
        name="catalog_kind",
        create_type=False,
    )
    catalog_rules_edition = postgresql.ENUM(
        "2014",
        "2024",
        "both",
        name="catalog_rules_edition",
        create_type=False,
    )

    for cls in classes:
        slug = cls["slug"]
        data = _catalog_data(cls)
        existing = conn.execute(
            sa.text(
                """
                SELECT id, data
                FROM catalog_entries
                WHERE kind = 'class'
                  AND slug = :slug
                  AND rules_edition = '2014'
                LIMIT 1
                """
            ),
            {"slug": slug},
        ).mappings().first()

        if existing:
            merged = dict(existing["data"] or {})
            merged.update(data)
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET name_ru = :name_ru,
                        name_en = :name_en,
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
                    "name_ru": cls["name_ru"],
                    "name_en": cls.get("name_en"),
                    "source": cls.get("source") or "phb",
                    "data": json.dumps(merged, ensure_ascii=False),
                    "sort_order": SORT_ORDER.get(slug, 999),
                },
            )
            continue

        entry_id = STABLE_IDS.get(slug) or str(uuid.uuid4())
        conn.execute(
            sa.text(
                """
                INSERT INTO catalog_entries (
                    id, kind, slug, name_ru, name_en, rules_edition,
                    parent_id, source, external_ref, data, sort_order, is_active
                ) VALUES (
                    CAST(:id AS uuid),
                    'class',
                    :slug,
                    :name_ru,
                    :name_en,
                    '2014',
                    NULL,
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
                "name_ru": cls["name_ru"],
                "name_en": cls.get("name_en"),
                "source": cls.get("source") or "phb",
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": SORT_ORDER.get(slug, 999),
            },
        )

    # silence unused enum vars if type checkers complain via reference
    _ = (catalog_kind, catalog_rules_edition)


def downgrade() -> None:
    conn = op.get_bind()
    # Remove artificer row added by this migration; strip rich keys from others.
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'class'
              AND rules_edition = '2014'
              AND slug = 'artificer'
              AND id = CAST(:id AS uuid)
            """
        ),
        {"id": STABLE_IDS["artificer"]},
    )
    strip_keys = [
        "primary_abilities",
        "saving_throws",
        "armor",
        "weapons",
        "tools_fixed",
        "tool_choices",
        "skill_choices",
        "multiclass_prerequisites",
        "multiclass_proficiencies",
        "caster",
        "starting_equipment",
        "source",
        "notes_ru",
    ]
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data
            FROM catalog_entries
            WHERE kind = 'class' AND rules_edition = '2014'
            """
        )
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        for key in strip_keys:
            data.pop(key, None)
        # keep hit_die if present
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb), updated_at = now()
                WHERE id = :id
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
