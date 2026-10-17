"""Upsert Tasha Custom Lineage race root.

Revision ID: k0f1a2b3c4d5
Revises: j9e0f1a2b3c4
Create Date: 2026-10-07 07:00:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k0f1a2b3c4d5"
down_revision: Union[str, Sequence[str], None] = "j9e0f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/setting_race_catalog_spec.json")
SLUG = "custom_lineage"
STABLE_ID = "11111111-1111-4111-8111-111111111207"

DATA_KEYS = (
    "speed",
    "size",
    "size_choices",
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
    "variable_trait_choices",
    "natural_armor",
    "natural_weapons",
    "movement",
    "racial_spells",
)


def _load_race() -> dict[str, Any]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"Setting race catalog spec not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    for race in payload.get("races") or []:
        if race.get("slug") == SLUG:
            return race
    raise RuntimeError(f"{SLUG} missing in {path}")


def _catalog_data(race: dict[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for key in DATA_KEYS:
        if key in race and race[key] is not None:
            data[key] = race[key]
    data.setdefault("selectable", True)
    data.setdefault("source", race.get("source") or "tce")
    return data


def upgrade() -> None:
    conn = op.get_bind()
    race = _load_race()
    data = _catalog_data(race)
    entry_id = uuid.UUID(STABLE_ID)
    existing = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
            """
        ),
        {"slug": SLUG},
    ).first()
    if existing:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET name_ru = :name_ru,
                    name_en = :name_en,
                    source = :source,
                    sort_order = :sort_order,
                    data = CAST(:data AS jsonb),
                    is_active = true,
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": str(existing[0]),
                "name_ru": race["name_ru"],
                "name_en": race.get("name_en") or race["name_ru"],
                "source": race.get("source") or "tce",
                "sort_order": int(race.get("sort_order") or 390),
                "data": json.dumps(data, ensure_ascii=False),
            },
        )
        return

    conn.execute(
        sa.text(
            """
            INSERT INTO catalog_entries (
              id, kind, rules_edition, slug, name_ru, name_en,
              source, sort_order, parent_id, data, is_active, created_at, updated_at
            ) VALUES (
              CAST(:id AS uuid), 'race', '2014', :slug, :name_ru, :name_en,
              :source, :sort_order, NULL, CAST(:data AS jsonb), true, now(), now()
            )
            """
        ),
        {
            "id": str(entry_id),
            "slug": SLUG,
            "name_ru": race["name_ru"],
            "name_en": race.get("name_en") or race["name_ru"],
            "source": race.get("source") or "tce",
            "sort_order": int(race.get("sort_order") or 390),
            "data": json.dumps(data, ensure_ascii=False),
        },
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
            """
        ),
        {"slug": SLUG},
    )
