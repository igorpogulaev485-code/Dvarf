"""Upgrade flexible race ASI to Tasha +2/+1 or +1x3 modes.

Revision ID: d3e4f5a6b1c2
Revises: c2d3e4f5a6b1
Create Date: 2026-10-07 04:00:00.000000

"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d3e4f5a6b1c2"
down_revision: Union[str, Sequence[str], None] = "c2d3e4f5a6b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_RELS = (
    Path("data/races/mpmm_race_catalog_spec.json"),
    Path("data/races/setting_race_catalog_spec.json"),
    Path("data/races/phb2014_race_catalog_spec.json"),
)

FLEXIBLE = {"from": "any", "preset": "tasha_flexible"}
LEGACY = {"count": 3, "amount": 1, "from": "any"}


def _load_specs() -> list[dict[str, Any]]:
    races: list[dict[str, Any]] = []
    for rel in SPEC_RELS:
        candidates = [
            Path.cwd() / rel,
            Path.cwd() / "backend" / rel,
            Path(__file__).resolve().parents[2] / rel,
        ]
        path = next((p for p in candidates if p.is_file()), None)
        if path is None:
            raise FileNotFoundError(f"Race catalog spec not found; tried {candidates}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        races.extend(payload.get("races") or [])
    return races


def _is_legacy_flexible(raw: Any) -> bool:
    if not isinstance(raw, dict):
        return False
    if raw.get("exclude") or raw.get("preset") or raw.get("modes"):
        return False
    return (
        raw.get("count") == 3
        and raw.get("amount") == 1
        and raw.get("from", "any") == "any"
    )


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = {
        row["slug"]: row
        for row in _load_specs()
        if isinstance(row.get("ability_bonus_choices"), dict)
        and (
            row["ability_bonus_choices"].get("preset") == "tasha_flexible"
            or _is_legacy_flexible(row["ability_bonus_choices"])
        )
    }
    if len(by_slug) < 40:
        raise RuntimeError(
            f"Expected many flexible ASI races in specs, got {len(by_slug)}"
        )

    rows = conn.execute(
        sa.text(
            """
            SELECT id, slug, data FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014' AND is_active
            """
        )
    ).mappings()

    for row in rows:
        slug = str(row["slug"])
        data = dict(row["data"] or {})
        choices = data.get("ability_bonus_choices")
        spec = by_slug.get(slug)
        next_choices = None
        if spec is not None:
            next_choices = spec.get("ability_bonus_choices") or FLEXIBLE
        elif _is_legacy_flexible(choices):
            next_choices = FLEXIBLE
        if next_choices is None:
            continue
        if choices == next_choices:
            continue
        data["ability_bonus_choices"] = next_choices
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
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014' AND is_active
            """
        )
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        choices = data.get("ability_bonus_choices")
        if not isinstance(choices, dict):
            continue
        if choices.get("preset") != "tasha_flexible":
            continue
        data["ability_bonus_choices"] = dict(LEGACY)
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
