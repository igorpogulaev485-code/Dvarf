"""Upsert racial_spells unlock_level + innate/spell_list grants.

Revision ID: m2b3c4d5e6f7
Revises: l1a2b3c4d5e6
Create Date: 2026-10-07 09:30:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "m2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = "l1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_FILES = (
    Path("data/races/phb2014_race_catalog_spec.json"),
    Path("data/races/mpmm_race_catalog_spec.json"),
    Path("data/races/setting_race_catalog_spec.json"),
)


def _load_specs() -> list[dict[str, Any]]:
    races: list[dict[str, Any]] = []
    roots = [
        Path.cwd(),
        Path.cwd() / "backend",
        Path(__file__).resolve().parents[2],
    ]
    for rel in SPEC_FILES:
        path = next((root / rel for root in roots if (root / rel).is_file()), None)
        if path is None:
            raise FileNotFoundError(f"Race catalog spec not found: {rel}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        races.extend(payload.get("races") or [])
    return races


def upgrade() -> None:
    conn = op.get_bind()
    races = _load_specs()
    updated = 0
    for race in races:
        slug = race.get("slug")
        if not slug:
            continue
        spells = race.get("racial_spells")
        if not isinstance(spells, list) or not spells:
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
        data["racial_spells"] = spells
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
    if updated < 20:
        raise RuntimeError(
            f"Expected to upsert racial_spells on many races; only updated {updated}"
        )


def downgrade() -> None:
    # Non-destructive: leave unlock_level/grant fields in place.
    pass
