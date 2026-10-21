"""Upsert aasimar/harengon race effect fields from MPMM spec.

Revision ID: y1z2a3b4c5d6
Revises: x0y1z2a3b4c5
Create Date: 2026-10-21

Slice A: permanent movement.fly mis-used for Radiant Soul; Hare-Trigger
initiative only in prose. Patch catalog.data from spec JSON.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "y1z2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "x0y1z2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/mpmm_race_catalog_spec.json")
TARGET_SLUGS = (
    "aasimar",
    "aasimar_protector",
    "aasimar_scourge",
    "aasimar_fallen",
    "harengon",
)
PATCH_KEYS = (
    "movement",
    "activated_movement",
    "damage_resistances",
    "combat_bonuses",
    "trait_cards",
    "traits_text",
)


def _load_spec_races() -> dict[str, dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"MPMM race catalog spec not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    by_slug: dict[str, dict[str, Any]] = {}
    for race in payload.get("races") or []:
        slug = race.get("slug")
        if slug in TARGET_SLUGS:
            by_slug[slug] = race
    missing = [slug for slug in TARGET_SLUGS if slug not in by_slug]
    if missing:
        raise RuntimeError(f"missing slugs in {path}: {missing}")
    return by_slug


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = _load_spec_races()

    protector = by_slug["aasimar_protector"]
    if protector.get("movement") and protector["movement"].get("fly"):
        raise RuntimeError("aasimar_protector must not keep permanent movement.fly in spec")
    if not protector.get("activated_movement"):
        raise RuntimeError("aasimar_protector activated_movement missing in spec")
    harengon = by_slug["harengon"]
    if (harengon.get("combat_bonuses") or {}).get("initiative") != "proficiency_bonus":
        raise RuntimeError("harengon combat_bonuses.initiative missing in spec")

    for slug, race in by_slug.items():
        patch: dict[str, Any] = {}
        for key in PATCH_KEYS:
            if key in race:
                patch[key] = race[key]
        # Explicit clear of permanent fly when activated replaces it.
        if slug == "aasimar_protector":
            patch["movement"] = race.get("movement")  # may be absent → delete below

        row = conn.execute(
            sa.text(
                """
                SELECT id, data FROM catalog_entries
                WHERE kind = 'race'
                  AND rules_edition = '2014'
                  AND slug = :slug
                """
            ),
            {"slug": slug},
        ).mappings().first()
        if row is None:
            raise RuntimeError(f"catalog race {slug} not found")

        data = dict(row["data"] or {})
        for key, value in patch.items():
            if value is None and key == "movement":
                data.pop("movement", None)
            else:
                data[key] = value
        if slug == "aasimar_protector":
            data.pop("movement", None)

        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb)
                WHERE id = :id
                """
            ),
            {"id": row["id"], "data": json.dumps(data, ensure_ascii=False)},
        )


def downgrade() -> None:
    # Non-destructive: leave enriched data in place.
    pass
