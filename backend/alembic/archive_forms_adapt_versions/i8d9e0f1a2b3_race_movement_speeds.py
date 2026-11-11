"""Add structured movement (climb/swim/fly) to race catalog.

Revision ID: i8d9e0f1a2b3
Revises: h7c8d9e0f1a2
Create Date: 2026-10-07 06:00:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "h7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_RELS = (
    Path("data/races/mpmm_race_catalog_spec.json"),
    Path("data/races/phb2014_race_catalog_spec.json"),
    Path("data/races/setting_race_catalog_spec.json"),
)

MOVEMENT_SLUGS = (
    "aarakocra",
    "fairy",
    "tabaxi",
    "triton",
    "genasi_water",
    "sea_elf",
    "half_elf_aquatic",
    "hadozee",
    "dhampir",
    "owlin",
    "grung",
    "locathah",
)


def _load_movement_by_slug() -> dict[str, dict[str, Any]]:
    by_slug: dict[str, dict[str, Any]] = {}
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
            movement = race.get("movement")
            if slug in MOVEMENT_SLUGS and isinstance(movement, dict) and movement:
                by_slug[str(slug)] = movement
    missing = [slug for slug in MOVEMENT_SLUGS if slug not in by_slug]
    if missing:
        raise RuntimeError(f"movement missing in specs for: {missing}")
    return by_slug


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = _load_movement_by_slug()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, slug, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(MOVEMENT_SLUGS)},
    ).mappings()

    updated = 0
    for row in rows:
        slug = str(row["slug"])
        movement = by_slug.get(slug)
        if not movement:
            continue
        data = dict(row["data"] or {})
        data["movement"] = movement
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

    if updated < len(MOVEMENT_SLUGS):
        raise RuntimeError(
            f"Expected to patch {len(MOVEMENT_SLUGS)} races, updated {updated}"
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
        {"slugs": list(MOVEMENT_SLUGS)},
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        if "movement" not in data:
            continue
        data.pop("movement", None)
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
