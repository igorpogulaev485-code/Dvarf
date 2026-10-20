"""Expand halfling + gnome subraces (SCAG/MToF/ERLW ttg set).

Revision ID: b5c6d7e8f9a0
Revises: a4b5c6d7e8f9
Create Date: 2026-10-06 19:35:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b5c6d7e8f9a0"
down_revision: Union[str, Sequence[str], None] = "a4b5c6d7e8f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/phb2014_race_catalog_spec.json")

FAMILY = {"halfling", "gnome"}

STABLE_IDS: dict[str, str] = {
    "halfling": "11111111-1111-4111-8111-111111111108",
    "lightfoot_halfling": "11111111-1111-4111-8111-111111111109",
    "stout_halfling": "11111111-1111-4111-8111-111111111110",
    "ghostwise_halfling": "11111111-1111-4111-8111-111111111127",
    "mark_of_healing": "11111111-1111-4111-8111-111111111128",
    "mark_of_hospitality": "11111111-1111-4111-8111-111111111129",
    "gnome": "11111111-1111-4111-8111-111111111114",
    "forest_gnome": "11111111-1111-4111-8111-111111111115",
    "rock_gnome": "11111111-1111-4111-8111-111111111116",
    "deep_gnome": "11111111-1111-4111-8111-111111111130",
    "mark_of_scribing": "11111111-1111-4111-8111-111111111131",
}

NEW_SLUGS = (
    "ghostwise_halfling",
    "mark_of_healing",
    "mark_of_hospitality",
    "deep_gnome",
    "mark_of_scribing",
)


def _load_spec() -> dict[str, Any]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"Race catalog spec not found; tried {candidates}")


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
    data.setdefault("source", race.get("source") or "phb")
    if race.get("parent_slug"):
        data["parent_slug"] = race["parent_slug"]
    return data


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_spec()
    races = [
        row
        for row in payload.get("races") or []
        if row.get("slug") in FAMILY or row.get("parent_slug") in FAMILY
    ]
    if not races:
        raise RuntimeError("halfling/gnome family missing from race catalog spec")

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
        source = race.get("source") or "phb"
        sort_order = int(race.get("sort_order") or 999)

        existing_id = id_by_slug.get(slug)
        if existing_id:
            existing = conn.execute(
                sa.text("SELECT data FROM catalog_entries WHERE id = CAST(:id AS uuid)"),
                {"id": existing_id},
            ).mappings().first()
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
