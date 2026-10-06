"""Wire race subrace choice into setup popup (combobox = roots only).

Revision ID: d1e2f3a4b5c6
Revises: c0d1e2f3a4b5
Create Date: 2026-10-06 18:15:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c0d1e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/phb2014_race_catalog_spec.json")

STABLE_IDS: dict[str, str] = {
    "dwarf": "11111111-1111-4111-8111-111111111101",
    "hill_dwarf": "11111111-1111-4111-8111-111111111102",
    "mountain_dwarf": "11111111-1111-4111-8111-111111111103",
    "elf": "11111111-1111-4111-8111-111111111104",
    "high_elf": "11111111-1111-4111-8111-111111111105",
    "wood_elf": "11111111-1111-4111-8111-111111111106",
    "drow": "11111111-1111-4111-8111-111111111107",
    "halfling": "11111111-1111-4111-8111-111111111108",
    "lightfoot_halfling": "11111111-1111-4111-8111-111111111109",
    "stout_halfling": "11111111-1111-4111-8111-111111111110",
    "human": "11111111-1111-4111-8111-111111111111",
    "human_variant": "11111111-1111-4111-8111-111111111112",
    "dragonborn": "11111111-1111-4111-8111-111111111113",
    "gnome": "11111111-1111-4111-8111-111111111114",
    "forest_gnome": "11111111-1111-4111-8111-111111111115",
    "rock_gnome": "11111111-1111-4111-8111-111111111116",
    "half_elf": "11111111-1111-4111-8111-111111111117",
    "half_orc": "11111111-1111-4111-8111-111111111118",
    "tiefling": "11111111-1111-4111-8111-111111111119",
}


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
    if "subrace_required" not in data and not race.get("parent_slug"):
        data["subrace_required"] = False
    if race.get("parent_slug"):
        data["parent_slug"] = race["parent_slug"]
    return data


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_spec()
    races: list[dict[str, Any]] = list(payload.get("races") or [])

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
    _ = (catalog_kind, catalog_rules_edition)

    by_slug: dict[str, dict[str, Any]] = {row["slug"]: row for row in races}
    ordered: list[dict[str, Any]] = []
    seen: set[str] = set()

    def visit(slug: str) -> None:
        if slug in seen:
            return
        race = by_slug[slug]
        parent = race.get("parent_slug")
        if parent:
            visit(parent)
        seen.add(slug)
        ordered.append(race)

    for race in races:
        visit(race["slug"])

    id_by_slug: dict[str, str] = {}
    existing_rows = conn.execute(
        sa.text(
            """
            SELECT id, slug
            FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014'
            """
        )
    ).mappings()
    for row in existing_rows:
        id_by_slug[str(row["slug"])] = str(row["id"])

    for race in ordered:
        slug = race["slug"]
        data = _catalog_data(race)
        parent_slug = race.get("parent_slug")
        parent_id = id_by_slug.get(parent_slug) if parent_slug else None
        sort_order = int(race.get("sort_order") or 999)
        source = race.get("source") or "phb"

        existing = conn.execute(
            sa.text(
                """
                SELECT id, data
                FROM catalog_entries
                WHERE kind = 'race'
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
                        parent_id = CAST(:parent_id AS uuid),
                        data = CAST(:data AS jsonb),
                        sort_order = :sort_order,
                        is_active = true,
                        updated_at = now()
                    WHERE id = :id
                    """
                ),
                {
                    "id": str(existing["id"]),
                    "name_ru": race["name_ru"],
                    "name_en": race.get("name_en"),
                    "source": source,
                    "parent_id": parent_id,
                    "data": json.dumps(merged, ensure_ascii=False),
                    "sort_order": sort_order,
                },
            )
            id_by_slug[slug] = str(existing["id"])
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
    # Detach human_variant back to root; drop subrace_required keys.
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET parent_id = NULL, updated_at = now()
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = 'human_variant'
            """
        )
    )
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data
            FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014'
            """
        )
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        data.pop("subrace_required", None)
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
