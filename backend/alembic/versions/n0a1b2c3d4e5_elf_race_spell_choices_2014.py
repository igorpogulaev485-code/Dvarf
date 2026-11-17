"""Upsert PHB 2014 elf spell choices: astral / high / drow / half-elf high.

Revision ID: n0a1b2c3d4e5
Revises: dice02b01widenroll
Create Date: 2026-11-17
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "n0a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "dice02b01widenroll"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/phb2014_race_catalog_spec.json")
TARGET_SLUGS = ("astral_elf", "drow", "high_elf", "half_elf_high")
PATCH_KEYS = (
    "trait_cards",
    "spell_choices",
    "racial_spells",
    "racial_resources",
    "traits_text",
)


def _load_race_patches() -> dict[str, dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"PHB race catalog spec not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, dict[str, Any]] = {}
    for race in payload.get("races") or []:
        slug = race.get("slug")
        if slug not in TARGET_SLUGS:
            continue
        patch = {key: race[key] for key in PATCH_KEYS if key in race and race[key] is not None}
        if slug == "astral_elf" and not patch.get("spell_choices"):
            raise RuntimeError("astral_elf spell_choices missing in spec")
        if slug == "drow" and not patch.get("racial_spells"):
            raise RuntimeError("drow racial_spells missing in spec")
        out[str(slug)] = patch
    missing = [slug for slug in TARGET_SLUGS if slug not in out]
    if missing:
        raise RuntimeError(f"races missing from spec: {missing}")
    return out


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = _load_race_patches()
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
        slug = str(row["slug"])
        patch = by_slug.get(slug)
        if not patch:
            continue
        merged = dict(row["data"] or {})
        merged.update(patch)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb), updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(merged, ensure_ascii=False)},
        )
        updated += 1
    if updated < len(TARGET_SLUGS):
        raise RuntimeError(f"expected {len(TARGET_SLUGS)} race rows, updated {updated}")


def downgrade() -> None:
    pass