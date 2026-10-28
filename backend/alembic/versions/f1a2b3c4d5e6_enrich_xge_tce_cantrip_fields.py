"""Enrich XGE/TCE cantrip attack_or_save / damage fields from seed JSON.

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-10-22

Q2: catalog already had all XGE/TCE cantrip *rows*; combat fields were stubby.
Copy structured fields from spells_enriched_v1.json into catalog_entries.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e0f1a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ENRICHED_REL = Path("data/srd/2014/spells_enriched_v1.json")

CANTRIP_SLUGS = (
    "sword_burst",
    "mind_sliver",
    "booming_blade",
    "green_flame_blade",
    "frostbite",
    "thunderclap",
    "toll_the_dead",
    "word_of_radiance",
    "infestation",
    "create_bonfire",
    "magic_stone",
    "primal_savagery",
    "control_flames",
    "gust",
    "mold_earth",
    "shape_water",
    "lightning_lure",
)


def _load_enriched() -> dict[str, dict[str, Any]]:
    candidates = [
        Path.cwd() / ENRICHED_REL,
        Path.cwd() / "backend" / ENRICHED_REL,
        Path(__file__).resolve().parents[2] / ENRICHED_REL,
    ]
    for path in candidates:
        if path.is_file():
            rows = json.loads(path.read_text(encoding="utf-8"))
            out: dict[str, dict[str, Any]] = {}
            for row in rows:
                slug = row.get("slug")
                if slug in CANTRIP_SLUGS and isinstance(row.get("data"), dict):
                    out[slug] = row["data"]
            return out
    raise FileNotFoundError(f"enriched spells not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    enriched = _load_enriched()
    for slug, seed_data in enriched.items():
        row = conn.execute(
            sa.text(
                """
                SELECT id, data FROM catalog_entries
                WHERE kind = 'spell'
                  AND rules_edition = '2014'
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"slug": slug},
        ).mappings().first()
        if not row:
            continue
        data = dict(row["data"] or {})
        for key in (
            "attack_or_save",
            "damage",
            "damage_at_character_level",
        ):
            if key in seed_data:
                data[key] = seed_data[key]
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )


def downgrade() -> None:
    pass
