"""Harengon: Lucky Footwork + Rabbit Hop racial resource pools.

Revision ID: k13harenhop01
Revises: k12tolldead01
Create Date: 2026-11-24

MPMM: both traits are PB uses / long rest. Catalog only had trait_cards —
no race-res pools → missing from hot bar and reaction strip.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k13harenhop01"
down_revision: Union[str, Sequence[str], None] = "k12tolldead01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/races/mpmm_race_catalog_spec.json")
RACIAL_RESOURCES = [
    {
        "id": "lucky_footwork",
        "name_ru": "Удачливая поступь",
        "max_from": "proficiency_bonus",
        "reset": "long",
    },
    {
        "id": "rabbit_hop",
        "name_ru": "Кроличий прыжок",
        "max_from": "proficiency_bonus",
        "reset": "long",
    },
]


def _load_harengon_resources() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if not path.is_file():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        for race in payload.get("races") or []:
            if race.get("slug") != "harengon":
                continue
            rows = race.get("racial_resources")
            if isinstance(rows, list) and rows:
                return list(rows)
    return list(RACIAL_RESOURCES)


def upgrade() -> None:
    conn = op.get_bind()
    resources = _load_harengon_resources()
    row = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = 'harengon'
            LIMIT 1
            """
        )
    ).mappings().first()
    if row is None:
        raise RuntimeError("catalog race harengon not found")
    data = dict(row["data"] or {})
    data["racial_resources"] = resources
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
    conn = op.get_bind()
    row = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = 'harengon'
            LIMIT 1
            """
        )
    ).mappings().first()
    if row is None:
        return
    data = dict(row["data"] or {})
    data.pop("racial_resources", None)
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
