"""Backfill Russian descriptions for 21 SRD 2014 spells (PRINT-14 pass 14).

Revision ID: p14spelru9a1b2
Revises: onb03usr9c2e1
Create Date: 2026-11-15

Idempotent: only fills description / higher_levels when missing or English-only.
Does not delete or overwrite existing Russian text.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p14spelru9a1b2"
down_revision: Union[str, Sequence[str], None] = "onb03usr9c2e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_CANDIDATES = (
    Path("data/srd/2014/spell_ru_descriptions_pass14.json"),
    Path("backend/data/srd/2014/spell_ru_descriptions_pass14.json"),
    Path(__file__).resolve().parents[2] / "data/srd/2014/spell_ru_descriptions_pass14.json",
)

_LATIN = re.compile(r"[A-Za-z]{3,}")
_CYRILLIC = re.compile(r"[А-Яа-яЁё]")


def _is_english_only(text: object) -> bool:
    if not isinstance(text, str):
        return False
    value = text.strip()
    if not value:
        return False
    return bool(_LATIN.search(value)) and not bool(_CYRILLIC.search(value))


def _load_patches() -> dict[str, dict[str, str]]:
    for path in SEED_CANDIDATES:
        if not path.is_file():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        out: dict[str, dict[str, str]] = {}
        for slug, row in payload.items():
            if slug.startswith("_") or not isinstance(row, dict):
                continue
            patch: dict[str, str] = {}
            desc = row.get("description")
            if isinstance(desc, str) and desc.strip():
                patch["description"] = desc
            higher = row.get("higher_levels")
            if isinstance(higher, str) and higher.strip():
                patch["higher_levels"] = higher
            if patch:
                out[slug] = patch
        return out
    raise FileNotFoundError(f"Spell RU seed not found; tried {SEED_CANDIDATES}")


def upgrade() -> None:
    patches = _load_patches()
    conn = op.get_bind()
    for slug, patch in patches.items():
        row = conn.execute(
            sa.text(
                """
                SELECT id, data
                FROM catalog_entries
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
        data: dict[str, Any] = dict(row["data"] or {})
        changed = False
        if "description" in patch:
            current = data.get("description")
            if not current or _is_english_only(current):
                data["description"] = patch["description"]
                changed = True
        if "higher_levels" in patch:
            current = data.get("higher_levels")
            if not current or _is_english_only(current):
                data["higher_levels"] = patch["higher_levels"]
                changed = True
        if not changed:
            continue
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb)
                WHERE id = :id
                """
            ),
            {"id": row["id"], "data": json.dumps(data, ensure_ascii=False)},
        )


def downgrade() -> None:
    # Do not revert Russian text — leaving translations in place is intentional.
    pass
