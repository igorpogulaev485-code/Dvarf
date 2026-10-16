"""Add MPMM/Volo subrace forks: aasimar, shifter, gith, kobold.

Revision ID: l1a2b3c4d5e6
Revises: k0f1a2b3c4d5
Create Date: 2026-10-07 08:00:00.000000

"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "l1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "k0f1a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/mpmm_race_catalog_spec.json")

# Families touched by this slice (roots + children).
FAMILY_ROOTS = {"aasimar", "shifter", "kobold", "gith"}
FAMILY_CHILDREN_PARENTS = {"aasimar", "shifter", "kobold", "gith"}

STABLE_IDS: dict[str, str] = {
    "gith": "11111111-1111-4111-8111-111111111208",
    "aasimar_protector": "11111111-1111-4111-8111-111111111209",
    "aasimar_scourge": "11111111-1111-4111-8111-111111111210",
    "aasimar_fallen": "11111111-1111-4111-8111-111111111211",
    "shifter_beasthide": "11111111-1111-4111-8111-111111111212",
    "shifter_longtooth": "11111111-1111-4111-8111-111111111213",
    "shifter_swiftstride": "11111111-1111-4111-8111-111111111214",
    "shifter_wildhunt": "11111111-1111-4111-8111-111111111215",
    "kobold_craftiness": "11111111-1111-4111-8111-111111111216",
    "kobold_defiance": "11111111-1111-4111-8111-111111111217",
    "kobold_draconic_sorcery": "11111111-1111-4111-8111-111111111218",
}

# Pre-existing gith roots keep their MPMM IDs; only reparented.
EXISTING_GITH_KIDS = ("githyanki", "githzerai")

NEW_SLUGS = tuple(STABLE_IDS.keys())

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
    "notes_ru",
    "natural_armor",
    "natural_weapons",
    "movement",
    "racial_spells",
    "variable_trait_choices",
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
    raise FileNotFoundError(f"MPMM race catalog spec not found; tried {candidates}")


def _catalog_data(race: dict[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for key in DATA_KEYS:
        if key in race and race[key] is not None:
            data[key] = race[key]
    data.setdefault("selectable", True)
    data.setdefault("source", race.get("source") or "mpmm")
    if race.get("parent_slug"):
        data["parent_slug"] = race["parent_slug"]
    return data


def _family_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for row in payload.get("races") or []:
        slug = row.get("slug")
        parent = row.get("parent_slug")
        if slug in FAMILY_ROOTS or parent in FAMILY_CHILDREN_PARENTS:
            rows.append(row)
        elif slug in EXISTING_GITH_KIDS:
            rows.append(row)
    return rows


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_spec()
    races = _family_rows(payload)
    if len(races) < 14:
        raise RuntimeError(
            f"MPMM subrace fork family incomplete: expected >=14 rows, got {len(races)}"
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
        key=lambda row: (
            0 if not row.get("parent_slug") else 1,
            int(row.get("sort_order") or 999),
        ),
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
                    sa.text(
                        "SELECT data FROM catalog_entries WHERE id = CAST(:id AS uuid)"
                    ),
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

    # Detach gith kids back to roots.
    for slug in EXISTING_GITH_KIDS:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET parent_id = NULL,
                    data = (data - 'parent_slug') || jsonb_build_object('subrace_required', false),
                    updated_at = now()
                WHERE kind = 'race'
                  AND rules_edition = '2014'
                  AND slug = :slug
                """
            ),
            {"slug": slug},
        )

    # Soft-restore roots that gained required forks.
    for slug in ("aasimar", "shifter", "kobold"):
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = data || jsonb_build_object('subrace_required', false),
                    updated_at = now()
                WHERE kind = 'race'
                  AND rules_edition = '2014'
                  AND slug = :slug
                """
            ),
            {"slug": slug},
        )

    # Children / new parent first-to-last reverse delete.
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
