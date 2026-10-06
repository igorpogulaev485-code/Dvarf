"""Add PHB 2014 multiclass prerequisites onto catalog class data.

Revision ID: a8c9d0e1f2b3
Revises: c9d0e1f2a3b4
Create Date: 2026-10-06 16:00:00.000000

"""

from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a8c9d0e1f2b3"
down_revision: Union[str, Sequence[str], None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# PHB 2014 Multiclassing Prerequisites (stored for catalog consumers).
# Enforcement also lives in frontend shared/dnd/multiclassRules.ts.
# Prod note: live DB may already be at c2b8b2062024 (SRD catalog PR).
# Frontend gates work without this migration; apply/reattach when SRD merges into tip.
PREREQUISITES: dict[str, dict] = {
    "barbarian": {"all": ["str"], "min": 13},
    "bard": {"all": ["cha"], "min": 13},
    "cleric": {"all": ["wis"], "min": 13},
    "druid": {"all": ["wis"], "min": 13},
    "fighter": {"any": ["str", "dex"], "min": 13},
    "monk": {"all": ["dex", "wis"], "min": 13},
    "paladin": {"all": ["str", "cha"], "min": 13},
    "ranger": {"all": ["dex", "wis"], "min": 13},
    "rogue": {"all": ["dex"], "min": 13},
    "sorcerer": {"all": ["cha"], "min": 13},
    "warlock": {"all": ["cha"], "min": 13},
    "wizard": {"all": ["int"], "min": 13},
}

HIT_DIE: dict[str, int] = {
    "barbarian": 12,
    "bard": 8,
    "cleric": 8,
    "druid": 8,
    "fighter": 10,
    "monk": 8,
    "paladin": 10,
    "ranger": 10,
    "rogue": 8,
    "sorcerer": 6,
    "warlock": 8,
    "wizard": 6,
}


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, slug, data
            FROM catalog_entries
            WHERE kind = 'class'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(PREREQUISITES.keys())},
    ).mappings()

    for row in rows:
        slug = row["slug"]
        data = dict(row["data"] or {})
        data["multiclass_prerequisites"] = PREREQUISITES[slug]
        if "hit_die" not in data:
            data["hit_die"] = HIT_DIE[slug]
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data)},
        )


def downgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data
            FROM catalog_entries
            WHERE kind = 'class'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(PREREQUISITES.keys())},
    ).mappings()

    for row in rows:
        data = dict(row["data"] or {})
        data.pop("multiclass_prerequisites", None)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data)},
        )
