"""Add natural_weapons to race catalog for attack cards.

Revision ID: f5a6b1c2d3e4
Revises: e4f5a6b1c2d3
Create Date: 2026-10-07 04:25:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f5a6b1c2d3e4"
down_revision: Union[str, Sequence[str], None] = "e4f5a6b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_RELS = (
    Path("data/races/mpmm_race_catalog_spec.json"),
    Path("data/races/setting_race_catalog_spec.json"),
)

WEAPON_SLUGS = (
    "tortle",
    "aarakocra",
    "centaur",
    "lizardfolk",
    "minotaur",
    "satyr",
    "tabaxi",
    "leonin",
    "dhampir",
)


def _load_weapons_by_slug() -> dict[str, list[dict[str, Any]]]:
    by_slug: dict[str, list[dict[str, Any]]] = {}
    for rel in SPEC_RELS:
        candidates = [
            Path.cwd() / rel,
            Path.cwd() / "backend" / rel,
            Path(__file__).resolve().parents[2] / rel,
        ]
        path = next((p for p in candidates if p.is_file()), None)
        if path is None:
            raise FileNotFoundError(f"Race catalog spec not found; tried {candidates}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        for race in payload.get("races") or []:
            slug = race.get("slug")
            weapons = race.get("natural_weapons")
            if slug in WEAPON_SLUGS and isinstance(weapons, list) and weapons:
                by_slug[str(slug)] = weapons
    missing = [slug for slug in WEAPON_SLUGS if slug not in by_slug]
    if missing:
        raise RuntimeError(f"natural_weapons missing in specs for: {missing}")
    return by_slug


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = _load_weapons_by_slug()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, slug, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(WEAPON_SLUGS)},
    ).mappings()

    updated = 0
    for row in rows:
        slug = str(row["slug"])
        weapons = by_slug.get(slug)
        if not weapons:
            continue
        data = dict(row["data"] or {})
        data["natural_weapons"] = weapons
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb), updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
        updated += 1

    if updated < len(WEAPON_SLUGS):
        raise RuntimeError(
            f"Expected to patch {len(WEAPON_SLUGS)} races, updated {updated}"
        )


def downgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(WEAPON_SLUGS)},
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        if "natural_weapons" not in data:
            continue
        data.pop("natural_weapons", None)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb), updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
