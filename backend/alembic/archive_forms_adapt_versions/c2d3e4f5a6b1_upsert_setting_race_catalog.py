"""Upsert setting-book race roots (SAS, VRGtR, ERLW, GGR, …).

Revision ID: c2d3e4f5a6b1
Revises: b1c2d3e4f5a6
Create Date: 2026-10-07 03:50:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c2d3e4f5a6b1"
down_revision: Union[str, Sequence[str], None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/setting_race_catalog_spec.json")

# Stable UUIDs continue after MPMM (...1188).
STABLE_IDS: dict[str, str] = {
    "hadozee": "11111111-1111-4111-8111-111111111189",
    "plasmoid": "11111111-1111-4111-8111-111111111190",
    "thri_kreen": "11111111-1111-4111-8111-111111111191",
    "autognome": "11111111-1111-4111-8111-111111111192",
    "dhampir": "11111111-1111-4111-8111-111111111193",
    "hexblood": "11111111-1111-4111-8111-111111111194",
    "reborn": "11111111-1111-4111-8111-111111111195",
    "kalashtar": "11111111-1111-4111-8111-111111111196",
    "warforged": "11111111-1111-4111-8111-111111111197",
    "loxodon": "11111111-1111-4111-8111-111111111198",
    "vedalken": "11111111-1111-4111-8111-111111111199",
    "simic_hybrid": "11111111-1111-4111-8111-111111111200",
    "leonin": "11111111-1111-4111-8111-111111111201",
    "owlin": "11111111-1111-4111-8111-111111111202",
    "grung": "11111111-1111-4111-8111-111111111203",
    "locathah": "11111111-1111-4111-8111-111111111204",
    "verdan": "11111111-1111-4111-8111-111111111205",
    "kender": "11111111-1111-4111-8111-111111111206",
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
    raise FileNotFoundError(f"Setting race catalog spec not found; tried {candidates}")


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
    races = list(payload.get("races") or [])
    if len(races) < 18:
        raise RuntimeError(
            f"Setting race catalog incomplete: expected >=18 rows, got {len(races)}"
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
        source = race.get("source") or "phb"
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
