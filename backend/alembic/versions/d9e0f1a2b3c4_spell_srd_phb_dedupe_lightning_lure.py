"""Deactivate SRD spell aliases; enrich Lightning Lure; remap sheet catalog_ids.

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-10-22

QA 2026-10-22 duplicates:
  arcanists_magic_aura → nystul_s_magic_aura
  arcane_hand → bigby_s_hand
  arcane_sword → mordenkainen_s_sword

Canon = PHB-named rows. Copy missing combat fields from SRD, deactivate aliases,
remap character sheet spell catalog_id references.
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, Sequence[str], None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# alias_slug → canon_slug
PAIRS: tuple[tuple[str, str], ...] = (
    ("arcanists_magic_aura", "nystul_s_magic_aura"),
    ("arcane_hand", "bigby_s_hand"),
    ("arcane_sword", "mordenkainen_s_sword"),
)

COPY_KEYS = (
    "attack_or_save",
    "damage",
    "damage_at_character_level",
    "damage_at_slot_level",
    "higher_levels",
    "description",
)

LIGHTNING_LURE = {
    "attack_or_save": "СИЛ",
    "damage": "1d8 электричество",
    "damage_at_character_level": {
        "1": "1d8",
        "5": "2d8",
        "11": "3d8",
        "17": "4d8",
    },
}


def _empty(value: Any) -> bool:
    return value is None or value == "" or value == "—"


def _merge_classes(a: Any, b: Any) -> list[str]:
    order = [
        "bard",
        "cleric",
        "druid",
        "paladin",
        "ranger",
        "sorcerer",
        "warlock",
        "wizard",
        "artificer",
    ]
    s = set(a if isinstance(a, list) else []) | set(b if isinstance(b, list) else [])
    return [c for c in order if c in s] + sorted(s - set(order))


def _load_row(conn: Any, slug: str) -> dict[str, Any] | None:
    row = (
        conn.execute(
            sa.text(
                """
                SELECT id::text AS id, data
                FROM catalog_entries
                WHERE kind = 'spell'
                  AND rules_edition = '2014'
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"slug": slug},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else None


def upgrade() -> None:
    conn = op.get_bind()
    id_map: dict[str, str] = {}

    for alias_slug, canon_slug in PAIRS:
        alias = _load_row(conn, alias_slug)
        canon = _load_row(conn, canon_slug)
        if not alias or not canon:
            continue
        alias_data = dict(alias["data"] or {})
        canon_data = dict(canon["data"] or {})
        for key in COPY_KEYS:
            if _empty(canon_data.get(key)) and not _empty(alias_data.get(key)):
                canon_data[key] = alias_data[key]
        canon_data["classes"] = _merge_classes(
            canon_data.get("classes"), alias_data.get("classes")
        )
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": canon["id"], "data": json.dumps(canon_data, ensure_ascii=False)},
        )
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET is_active = false,
                    parent_id = CAST(:parent AS uuid),
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": alias["id"], "parent": canon["id"]},
        )
        id_map[alias["id"]] = canon["id"]

    # Lightning Lure structured combat fields
    lure = _load_row(conn, "lightning_lure")
    if lure:
        data = dict(lure["data"] or {})
        data.update(LIGHTNING_LURE)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": lure["id"], "data": json.dumps(data, ensure_ascii=False)},
        )

    if not id_map:
        return

    # Remap sheet.spells.known[].catalog_id on all characters
    characters = conn.execute(sa.text("SELECT id, sheet FROM characters")).mappings()
    for row in characters:
        sheet = row["sheet"]
        if not isinstance(sheet, dict):
            continue
        spells = sheet.get("spells")
        if not isinstance(spells, dict):
            continue
        known = spells.get("known")
        if not isinstance(known, list):
            continue
        changed = False
        for spell in known:
            if not isinstance(spell, dict):
                continue
            cid = spell.get("catalog_id")
            if isinstance(cid, str) and cid in id_map:
                spell["catalog_id"] = id_map[cid]
                changed = True
        if not changed:
            continue
        conn.execute(
            sa.text(
                """
                UPDATE characters
                SET sheet = CAST(:sheet AS jsonb),
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": str(row["id"]),
                "sheet": json.dumps(sheet, ensure_ascii=False),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    for alias_slug, _canon_slug in PAIRS:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET is_active = true,
                    parent_id = NULL,
                    updated_at = now()
                WHERE kind = 'spell'
                  AND rules_edition = '2014'
                  AND slug = :slug
                """
            ),
            {"slug": alias_slug},
        )
