"""Backfill 2014 SRD spells to catalog schema v1.

Revision ID: s8b9c0d1e2f3
Revises: r7a8b9c0d1e2
Create Date: 2026-10-07 17:30:00.000000

Updates kind=spell / rules_edition=2014 rows with duration, components object,
normalized casting_time, RU description/higher_levels, source_book, scaling maps.
Does not touch 2024 spells.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "s8b9c0d1e2f3"
down_revision: Union[str, Sequence[str], None] = "r7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/spells_enriched_v1.json")


def _load_spells() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / "backend" / DATA_REL,
        Path.cwd() / DATA_REL,
        Path(__file__).resolve().parents[2] / DATA_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload, list):
                raise RuntimeError(f"Expected list in {path}")
            return payload
    raise FileNotFoundError(f"Spell enrich file not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    spells = _load_spells()
    if len(spells) < 300:
        raise RuntimeError(f"Expected ~319 enriched spells, got {len(spells)}")

    updated = 0
    for item in spells:
        slug = item.get("slug")
        data = item.get("data") or {}
        if not slug or not isinstance(data, dict):
            continue
        name_ru = item.get("name_ru")
        name_en = item.get("name_en")
        result = conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET
                    name_ru = COALESCE(:name_ru, name_ru),
                    name_en = COALESCE(:name_en, name_en),
                    data = CAST(:data AS jsonb),
                    updated_at = NOW()
                WHERE kind = 'spell'
                  AND rules_edition = '2014'
                  AND slug = :slug
                """
            ),
            {
                "slug": slug,
                "name_ru": name_ru,
                "name_en": name_en,
                "data": json.dumps(data, ensure_ascii=False),
            },
        )
        updated += result.rowcount or 0

    if updated < 300:
        raise RuntimeError(
            f"Expected to update many 2014 spells; only updated {updated}"
        )


def downgrade() -> None:
    """Best-effort: strip v1-only keys; cannot restore pre-backfill text."""
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data
            FROM catalog_entries
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND (data->>'schema_version') = '1'
            """
        )
    ).mappings()
    for row in rows:
        data = dict(row["data"] or {})
        # collapse back toward legacy shape used by pre-v1 UI
        casting = data.get("casting_time")
        if isinstance(casting, dict):
            unit = casting.get("unit")
            legacy = {"action": "Д", "bonus": "БД", "reaction": "Р"}.get(unit)
            if legacy:
                data["casting_time"] = legacy
        comps = data.get("components")
        if isinstance(comps, dict):
            flags: list[str] = []
            if comps.get("v"):
                flags.append("V")
            if comps.get("s"):
                flags.append("S")
            if comps.get("m") is not None:
                flags.append("M")
            data["components"] = flags
        for key in (
            "schema_version",
            "duration",
            "description",
            "higher_levels",
            "source_book",
            "damage_at_character_level",
            "damage_at_slot_level",
            "subclasses",
            "ritual_cast_without_prepare",
        ):
            data.pop(key, None)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb), updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
