"""Upsert MPMM race roots + genasi elemental heritages.

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-10-07 03:30:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/mpmm_race_catalog_spec.json")

# Stable UUIDs continue after elf/halfling gaps (...1159).
STABLE_IDS: dict[str, str] = {
    "aarakocra": "11111111-1111-4111-8111-111111111160",
    "aasimar": "11111111-1111-4111-8111-111111111161",
    "bugbear": "11111111-1111-4111-8111-111111111162",
    "centaur": "11111111-1111-4111-8111-111111111163",
    "changeling": "11111111-1111-4111-8111-111111111164",
    "fairy": "11111111-1111-4111-8111-111111111165",
    "firbolg": "11111111-1111-4111-8111-111111111166",
    "genasi": "11111111-1111-4111-8111-111111111167",
    "githyanki": "11111111-1111-4111-8111-111111111168",
    "githzerai": "11111111-1111-4111-8111-111111111169",
    "goblin": "11111111-1111-4111-8111-111111111170",
    "goliath": "11111111-1111-4111-8111-111111111171",
    "harengon": "11111111-1111-4111-8111-111111111172",
    "hobgoblin": "11111111-1111-4111-8111-111111111173",
    "kenku": "11111111-1111-4111-8111-111111111174",
    "kobold": "11111111-1111-4111-8111-111111111175",
    "lizardfolk": "11111111-1111-4111-8111-111111111176",
    "minotaur": "11111111-1111-4111-8111-111111111177",
    "orc": "11111111-1111-4111-8111-111111111178",
    "satyr": "11111111-1111-4111-8111-111111111179",
    "shifter": "11111111-1111-4111-8111-111111111180",
    "tabaxi": "11111111-1111-4111-8111-111111111181",
    "tortle": "11111111-1111-4111-8111-111111111182",
    "triton": "11111111-1111-4111-8111-111111111183",
    "yuan_ti": "11111111-1111-4111-8111-111111111184",
    "genasi_air": "11111111-1111-4111-8111-111111111185",
    "genasi_earth": "11111111-1111-4111-8111-111111111186",
    "genasi_fire": "11111111-1111-4111-8111-111111111187",
    "genasi_water": "11111111-1111-4111-8111-111111111188",
}

NEW_SLUGS = tuple(STABLE_IDS.keys())


def _load_spec() -> dict[str, Any]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"MPMM race catalog spec not found; tried {candidates}")


def _catalog_data(race: dict[str, Any]) -> dict[str, Any]:
    keys = (
        "speed",
        "size",
        "darkvision",
        "ability_bonuses",
        "ability_bonus_choices",
        "languages",
        "languages_choose",
        "skill_proficiencies",
        "skill_choices",
        "tool_proficiencies",
        "tool_choices",
        "weapon_proficiencies",
        "armor_proficiencies",
        "ancestry_choices",
        "feat_note_ru",
        "traits_text",
        "selectable",
        "subrace_required",
        "source",
        "notes_ru",
    )
    data: dict[str, Any] = {}
    for key in keys:
        if key in race and race[key] is not None:
            data[key] = race[key]
    data.setdefault("selectable", True)
    data.setdefault("source", race.get("source") or "mpmm")
    if race.get("parent_slug"):
        data["parent_slug"] = race["parent_slug"]
    return data


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_spec()
    races = list(payload.get("races") or [])
    if len(races) < 29:
        raise RuntimeError(
            f"MPMM race catalog incomplete: expected >=29 rows, got {len(races)}"
        )

    id_by_slug: dict[str, str] = {}
    for row in conn.execute(
        sa.text(
            """
            SELECT id, slug FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014'
            """
        )
    ).mappings():
        id_by_slug[str(row["slug"])] = str(row["id"])

    races_sorted = sorted(
        races,
        key=lambda row: (0 if not row.get("parent_slug") else 1, int(row.get("sort_order") or 999)),
    )

    for race in races_sorted:
        slug = race["slug"]
        data = _catalog_data(race)
        parent_slug = race.get("parent_slug")
        parent_id = id_by_slug.get(parent_slug) if parent_slug else None
        source = race.get("source") or "mpmm"
        sort_order = int(race.get("sort_order") or 999)

        existing_id = id_by_slug.get(slug)
        if existing_id:
            existing = (
                conn.execute(
                    sa.text("SELECT data FROM catalog_entries WHERE id = CAST(:id AS uuid)"),
                    {"id": existing_id},
                )
                .mappings()
                .first()
            )
            merged = dict((existing or {}).get("data") or {})
            merged.update(data)
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET name_ru = :name_ru,
                        name_en = :name_en,
                        source = :source,
                        parent_id = CAST(:parent_id AS uuid),
                        data = CAST(:data AS jsonb),
                        sort_order = :sort_order,
                        is_active = true,
                        updated_at = now()
                    WHERE id = CAST(:id AS uuid)
                    """
                ),
                {
                    "id": existing_id,
                    "name_ru": race["name_ru"],
                    "name_en": race.get("name_en"),
                    "source": source,
                    "parent_id": parent_id,
                    "data": json.dumps(merged, ensure_ascii=False),
                    "sort_order": sort_order,
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
                    'race',
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
                "name_ru": race["name_ru"],
                "name_en": race.get("name_en"),
                "parent_id": parent_id,
                "source": source,
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": sort_order,
            },
        )
        id_by_slug[slug] = entry_id


def downgrade() -> None:
    conn = op.get_bind()
    # Children first, then parents.
    for slug in reversed(NEW_SLUGS):
        entry_id = STABLE_IDS[slug]
        conn.execute(
            sa.text(
                """
                DELETE FROM catalog_entries
                WHERE kind = 'race'
                  AND rules_edition = '2014'
                  AND slug = :slug
                  AND id = CAST(:id AS uuid)
                """
            ),
            {"slug": slug, "id": entry_id},
        )
