"""Add structured natural_armor to race catalog rows for AC.

Revision ID: e4f5a6b1c2d3
Revises: d3e4f5a6b1c2
Create Date: 2026-10-07 04:10:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e4f5a6b1c2d3"
down_revision: Union[str, Sequence[str], None] = "d3e4f5a6b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_RELS = (
    Path("data/races/mpmm_race_catalog_spec.json"),
    Path("data/races/setting_race_catalog_spec.json"),
)

NATURAL_SLUGS = (
    "tortle",
    "lizardfolk",
    "thri_kreen",
    "autognome",
    "warforged",
    "loxodon",
    "locathah",
)


def _load_natural_by_slug() -> dict[str, dict[str, Any]]:
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
            armor = race.get("natural_armor")
            if slug in NATURAL_SLUGS and isinstance(armor, dict):
                by_slug[str(slug)] = {
                    "natural_armor": armor,
                    "traits_text": race.get("traits_text"),
                }
    missing = [slug for slug in NATURAL_SLUGS if slug not in by_slug]
    if missing:
        raise RuntimeError(f"natural_armor missing in specs for: {missing}")
    return by_slug


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = _load_natural_by_slug()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, slug, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(NATURAL_SLUGS)},
    ).mappings()

    updated = 0
    for row in rows:
        slug = str(row["slug"])
        patch = by_slug.get(slug)
        if not patch:
            continue
        data = dict(row["data"] or {})
        data["natural_armor"] = patch["natural_armor"]
        if isinstance(patch.get("traits_text"), str) and patch["traits_text"].strip():
            data["traits_text"] = patch["traits_text"]
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

    if updated < len(NATURAL_SLUGS):
        raise RuntimeError(
            f"Expected to patch {len(NATURAL_SLUGS)} races, updated {updated}"
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
        {"slugs": list(NATURAL_SLUGS)},
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        if "natural_armor" not in data:
            continue
        data.pop("natural_armor", None)
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
