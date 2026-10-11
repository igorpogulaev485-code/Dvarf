"""Fix aarakocra talons natural-weapon dice to 1к4 (EEPC/POA / handbook).

Revision ID: y4h5i6j7k8l9
Revises: x3g4h5i6j7k8
Create Date: 2026-10-11 12:00:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "y4h5i6j7k8l9"
down_revision: Union[str, Sequence[str], None] = "x3g4h5i6j7k8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/mpmm_race_catalog_spec.json")
SLUG = "aarakocra"


def _load_aarakocra_patch() -> dict[str, Any]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"Race catalog spec not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    for race in payload.get("races") or []:
        if race.get("slug") != SLUG:
            continue
        weapons = race.get("natural_weapons")
        if not isinstance(weapons, list) or not weapons:
            raise RuntimeError(f"{SLUG} natural_weapons missing in spec")
        return {
            "natural_weapons": weapons,
            "traits_text": race.get("traits_text"),
        }
    raise RuntimeError(f"{SLUG} not found in race catalog spec")


def upgrade() -> None:
    conn = op.get_bind()
    patch = _load_aarakocra_patch()
    row = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = :slug
            """
        ),
        {"slug": SLUG},
    ).mappings().first()
    if row is None:
        raise RuntimeError(f"catalog race {SLUG} not found")

    data = dict(row["data"] or {})
    data["natural_weapons"] = patch["natural_weapons"]
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
        {"slug": SLUG},
    ).mappings().first()
    if row is None:
        return
    data = dict(row["data"] or {})
    weapons = data.get("natural_weapons")
    if isinstance(weapons, list) and weapons:
        next_weapons = []
        for item in weapons:
            if isinstance(item, dict) and item.get("id") == "talons":
                next_weapons.append({**item, "damage": "1к6"})
            else:
                next_weapons.append(item)
        data["natural_weapons"] = next_weapons
    traits = data.get("traits_text")
    if isinstance(traits, str):
        data["traits_text"] = traits.replace("Когти (1к4", "Когти (1к6")
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
