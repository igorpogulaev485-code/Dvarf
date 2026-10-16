"""Add racial_spells to race catalog for innate spell cards.

Revision ID: j9e0f1a2b3c4
Revises: i8d9e0f1a2b3
Create Date: 2026-10-07 06:30:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j9e0f1a2b3c4"
down_revision: Union[str, Sequence[str], None] = "i8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_RELS = (
    Path("data/races/mpmm_race_catalog_spec.json"),
    Path("data/races/phb2014_race_catalog_spec.json"),
    Path("data/races/setting_race_catalog_spec.json"),
)

SPELL_SLUGS = (
    "aasimar",
    "fairy",
    "triton",
    "yuan_ti",
    "githyanki",
    "forest_gnome",
    "tiefling",
    "hexblood",
)


def _load_spells_by_slug() -> dict[str, list[dict[str, Any]]]:
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
            spells = race.get("racial_spells")
            if slug in SPELL_SLUGS and isinstance(spells, list) and spells:
                by_slug[str(slug)] = spells
    missing = [slug for slug in SPELL_SLUGS if slug not in by_slug]
    if missing:
        raise RuntimeError(f"racial_spells missing in specs for: {missing}")
    return by_slug


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = _load_spells_by_slug()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, slug, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(SPELL_SLUGS)},
    ).mappings()

    updated = 0
    for row in rows:
        slug = str(row["slug"])
        spells = by_slug.get(slug)
        if not spells:
            continue
        data = dict(row["data"] or {})
        data["racial_spells"] = spells
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

    if updated < len(SPELL_SLUGS):
        raise RuntimeError(
            f"Expected to patch {len(SPELL_SLUGS)} races, updated {updated}"
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
        {"slugs": list(SPELL_SLUGS)},
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        if "racial_spells" not in data:
            continue
        data.pop("racial_spells", None)
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
