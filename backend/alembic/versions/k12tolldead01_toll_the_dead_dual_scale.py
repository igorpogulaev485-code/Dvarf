"""Patch Toll the Dead cantrip scale: both d8 and d12 by character level.

Revision ID: k12tolldead01
Revises: j11sunfwep01
Create Date: 2026-11-24

XGE: damage increases to 2d8/2d12 (L5), 3d8/3d12 (L11), 4d8/4d12 (L17).
Catalog previously only scaled the d8 column, leaving /1d12 stuck.
"""

from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k12tolldead01"
down_revision: Union[str, Sequence[str], None] = "j11sunfwep01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCALE = {
    "1": "1d8/1d12",
    "5": "2d8/2d12",
    "11": "3d8/3d12",
    "17": "4d8/4d12",
}


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = 'toll_the_dead'
            """
        )
    ).mappings().all()
    for row in rows:
        data = dict(row["data"] or {})
        data["damage_at_character_level"] = dict(SCALE)
        if not data.get("damage"):
            data["damage"] = "1d8/1d12 некротическая"
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
    old = {"1": "1d8", "5": "2d8", "11": "3d8", "17": "4d8"}
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = 'toll_the_dead'
            """
        )
    ).mappings().all()
    for row in rows:
        data = dict(row["data"] or {})
        data["damage_at_character_level"] = dict(old)
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
