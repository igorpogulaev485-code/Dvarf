"""Upsert tiefling racial_spells cast level (Hellish Rebuke as 2nd).

Revision ID: a3b4c5d6e7f8
Revises: z2a3b4c5d6e7
Create Date: 2026-10-21

PHB Infernal Legacy / MToF bloodline legacies cast the 3rd-level unlock
spell as a 2nd-level spell. Catalog had native spell circle (1) instead
of cast-as level (2), so sheets showed «Адская месть» as 1st-level.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "z2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/phb2014_race_catalog_spec.json")


def _load_tiefling_racial_spells() -> dict[str, list[dict[str, Any]]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"PHB race catalog spec not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    by_slug: dict[str, list[dict[str, Any]]] = {}
    for race in payload.get("races") or []:
        slug = race.get("slug")
        if not isinstance(slug, str) or not slug.startswith("tiefling"):
            continue
        spells = race.get("racial_spells")
        if isinstance(spells, list) and spells:
            by_slug[slug] = spells
    hellish = None
    for spell in by_slug.get("tiefling") or []:
        if spell.get("id") == "hellish_rebuke" or spell.get("spell_slug") == "hellish_rebuke":
            hellish = spell
            break
    if hellish is None:
        raise RuntimeError("tiefling hellish_rebuke missing from race catalog spec")
    if int(hellish.get("level") or 0) != 2:
        raise RuntimeError(
            f"tiefling hellish_rebuke must be cast level 2 in spec, got {hellish.get('level')}"
        )
    return by_slug


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = _load_tiefling_racial_spells()

    rows = (
        conn.execute(
            sa.text(
                """
                SELECT id, slug, data
                FROM catalog_entries
                WHERE kind = 'race'
                  AND rules_edition = '2014'
                  AND slug = ANY(:slugs)
                """
            ),
            {"slugs": list(by_slug.keys())},
        )
        .mappings()
        .all()
    )

    updated = 0
    for row in rows:
        slug = row["slug"]
        spells = by_slug.get(slug)
        if not spells:
            continue
        merged = dict(row["data"] or {})
        merged["racial_spells"] = spells
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {
                "id": str(row["id"]),
                "data": json.dumps(merged, ensure_ascii=False),
            },
        )
        updated += 1

    if updated < 1:
        raise RuntimeError("no tiefling race rows updated for racial_spells")


def downgrade() -> None:
    # Content repair — no automatic reverse.
    pass
