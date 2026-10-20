"""Upsert naming tables onto 2014 race catalog entries (PHB+MPMM+setting).

Revision ID: v8w9x0y1z2a3
Revises: u7v8w9x0y1z2
Create Date: 2026-10-17

Loads backend/data/races/phb2014_race_naming.json and writes `data.naming`
for each by_slug root. Subraces inherit via client parent_map / parent_slug.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "v8w9x0y1z2a3"
down_revision: Union[str, Sequence[str], None] = "u7v8w9x0y1z2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NAMING_REL = Path("data/races/phb2014_race_naming.json")


def _load_naming() -> dict[str, Any]:
    roots = [
        Path.cwd(),
        Path.cwd() / "backend",
        Path(__file__).resolve().parents[2],
    ]
    path = next((root / NAMING_REL for root in roots if (root / NAMING_REL).is_file()), None)
    if path is None:
        raise FileNotFoundError(f"Race naming file not found: {NAMING_REL}")
    return json.loads(path.read_text(encoding="utf-8"))


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_naming()
    by_slug = payload.get("by_slug") or {}
    if not isinstance(by_slug, dict) or not by_slug:
        raise RuntimeError("phb2014_race_naming.json missing by_slug")

    updated = 0
    for slug, naming in by_slug.items():
        if not slug or not isinstance(naming, dict):
            continue
        row = conn.execute(
            sa.text(
                """
                SELECT id, data FROM catalog_entries
                WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
                """
            ),
            {"slug": slug},
        ).mappings().first()
        if not row:
            continue
        data = dict(row["data"] or {})
        data["naming"] = naming
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
        updated += 1

    if updated < 8:
        raise RuntimeError(
            f"Expected to upsert naming on PHB roots; only updated {updated}"
        )


def downgrade() -> None:
    conn = op.get_bind()
    payload = _load_naming()
    by_slug = payload.get("by_slug") or {}
    for slug in by_slug:
        row = conn.execute(
            sa.text(
                """
                SELECT id, data FROM catalog_entries
                WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
                """
            ),
            {"slug": slug},
        ).mappings().first()
        if not row:
            continue
        data = dict(row["data"] or {})
        if "naming" not in data:
            continue
        data.pop("naming", None)
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
