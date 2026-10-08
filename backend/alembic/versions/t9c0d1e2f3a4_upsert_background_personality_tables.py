"""Upsert background personality/ideals/bonds/flaws tables into catalog data.

Revision ID: t9c0d1e2f3a4
Revises: w2f3a4b5c6d7
Create Date: 2026-10-07 09:50:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "t9c0d1e2f3a4"
down_revision: Union[str, Sequence[str], None] = "w2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/backgrounds/phb2014_background_catalog_spec.json")

RP_KEYS = (
    "personality_traits",
    "ideals",
    "bonds",
    "flaws",
)


def _load_spec() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            return list(payload.get("backgrounds") or [])
    raise FileNotFoundError(f"Background catalog spec not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    for row in _load_spec():
        slug = row["slug"]
        data = dict(row.get("data") or {})
        existing = conn.execute(
            sa.text(
                """
                SELECT id, data
                FROM catalog_entries
                WHERE kind = 'background'
                  AND slug = :slug
                  AND rules_edition = '2014'
                LIMIT 1
                """
            ),
            {"slug": slug},
        ).mappings().first()
        if not existing:
            continue
        merged = dict(existing["data"] or {})
        for key in RP_KEYS:
            merged[key] = list(data.get(key) or [])
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
                "id": str(existing["id"]),
                "data": json.dumps(merged, ensure_ascii=False),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data
            FROM catalog_entries
            WHERE kind = 'background' AND rules_edition = '2014'
            """
        )
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        for key in RP_KEYS:
            data.pop(key, None)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb), updated_at = now()
                WHERE id = :id
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
