"""Sync lizardfolk swim + trait_cards from MPMM race spec into catalog.

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f1
Create Date: 2026-10-14

The JSON spec gained movement.swim=30 and trait_cards (Hold Breath,
Hungry Jaws, Cunning Artisan, Natural Armor), but the DB row was never
re-patched — create-from-scratch still got empty swim / missing traits.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "a6b7c8d9e0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/mpmm_race_catalog_spec.json")
TARGET_SLUG = "lizardfolk"
PATCH_KEYS = (
    "movement",
    "trait_cards",
    "traits_text",
    "natural_armor",
    "natural_weapons",
    "speed",
    "darkvision",
)


def _load_lizardfolk() -> dict[str, Any]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"MPMM race catalog spec not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    for race in payload.get("races") or []:
        if race.get("slug") == TARGET_SLUG:
            return race
    raise RuntimeError(f"{TARGET_SLUG} missing from {path}")


def upgrade() -> None:
    conn = op.get_bind()
    race = _load_lizardfolk()
    patch = {key: race[key] for key in PATCH_KEYS if key in race and race[key] is not None}
    if "movement" not in patch or not isinstance(patch["movement"], dict):
        raise RuntimeError("lizardfolk movement missing in spec")
    if not patch.get("trait_cards"):
        raise RuntimeError("lizardfolk trait_cards missing in spec")

    row = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = :slug
            """
        ),
        {"slug": TARGET_SLUG},
    ).mappings().first()
    if row is None:
        raise RuntimeError(f"catalog race {TARGET_SLUG} not found")

    data = dict(row["data"] or {})
    data.update(patch)
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


def downgrade() -> None:
    conn = op.get_bind()
    row = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = :slug
            """
        ),
        {"slug": TARGET_SLUG},
    ).mappings().first()
    if row is None:
        return
    data = dict(row["data"] or {})
    data.pop("movement", None)
    data.pop("trait_cards", None)
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
