"""Add Duergar (SCAG) dwarf subrace to 2014 catalog.

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-10-06 18:25:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/phb2014_race_catalog_spec.json")
DUERGAR_ID = "11111111-1111-4111-8111-111111111120"


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
    race = next((row for row in payload.get("races") or [] if row.get("slug") == "duergar"), None)
    if race is None:
        raise RuntimeError("duergar missing from phb2014_race_catalog_spec.json")

    parent = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014' AND slug = 'dwarf'
            LIMIT 1
            """
        )
    ).mappings().first()
    if not parent:
        raise RuntimeError("parent dwarf race not found")

    parent_id = str(parent["id"])
    data = _catalog_data(race)
    existing = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014' AND slug = 'duergar'
            LIMIT 1
            """
        )
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
                "source": race.get("source") or "scag",
                "parent_id": parent_id,
                "data": json.dumps(merged, ensure_ascii=False),
                "sort_order": int(race.get("sort_order") or 13),
            },
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
                'race',
                'duergar',
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
            "id": DUERGAR_ID,
            "name_ru": race["name_ru"],
            "name_en": race.get("name_en"),
            "parent_id": parent_id,
            "source": race.get("source") or "scag",
            "data": json.dumps(data, ensure_ascii=False),
            "sort_order": int(race.get("sort_order") or 13),
        },
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = 'duergar'
              AND id = CAST(:id AS uuid)
            """
        ),
        {"id": DUERGAR_ID},
    )
