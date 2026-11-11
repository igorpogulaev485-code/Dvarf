"""EGW dunamancy: wizard + Chronurgy/Graviturgy subclass gates.

Revision ID: i4d5e6f7a8b9
Revises: h3c4d5e6f7a8
Create Date: 2026-10-22

Q2: Explorer's Guide to Wildemount dunamancy spells are on the wizard list
only for Chronurgy Magic / Graviturgy Magic (RAW EGW sidebar). Also tag
GGtR Encode Thoughts as wizard cantrip; enrich combat fields for cast UI.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "h3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DUNAMANCY_SUBCLASSES = [
    {"class": "wizard", "subclass": "chronurgy_magic"},
    {"class": "wizard", "subclass": "graviturgy_magic"},
]

EGW_SLUGS: tuple[str, ...] = (
    "sapping_sting",
    "gift_of_alacrity",
    "magnify_gravity",
    "fortune_s_favor",
    "immovable_object",
    "wristpocket",
    "pulse_wave",
    "gravity_sinkhole",
    "temporal_shunt",
    "gravity_fissure",
    "tether_essence",
    "dark_star",
    "reality_break",
    "ravenous_void",
    "time_ravage",
)

SEED_CANDIDATES = (
    Path("data/srd/2014/spells_rest_books_v1.json"),
    Path("backend/data/srd/2014/spells_rest_books_v1.json"),
    Path(__file__).resolve().parents[2] / "data/srd/2014/spells_rest_books_v1.json",
)


def _slot_scale(base_dice: int, die: str, start_level: int) -> dict[str, str]:
    return {
        str(lvl): f"{base_dice + (lvl - start_level)}{die}"
        for lvl in range(start_level, 10)
    }


COMBAT: dict[str, dict[str, Any]] = {
    "sapping_sting": {
        "attack_or_save": "ТЕЛ",
        "damage": "1d4 некротическая энергия",
        "damage_at_character_level": {
            "1": "1d4",
            "5": "2d4",
            "11": "3d4",
            "17": "4d4",
        },
    },
    "gift_of_alacrity": {"attack_or_save": "—"},
    "magnify_gravity": {
        "attack_or_save": "ТЕЛ",
        "damage": "2d8 силовое поле",
        "damage_at_slot_level": _slot_scale(2, "d8", 1),
    },
    "fortune_s_favor": {"attack_or_save": "—"},
    "immovable_object": {"attack_or_save": "—"},
    "wristpocket": {"attack_or_save": "—"},
    "pulse_wave": {
        "attack_or_save": "ТЕЛ",
        "damage": "6d6 силовое поле",
        "damage_at_slot_level": _slot_scale(6, "d6", 3),
    },
    "gravity_sinkhole": {
        "attack_or_save": "ТЕЛ",
        "damage": "5d10 силовое поле",
        "damage_at_slot_level": _slot_scale(5, "d10", 4),
    },
    "temporal_shunt": {"attack_or_save": "МУД"},
    "gravity_fissure": {
        "attack_or_save": "ТЕЛ",
        "damage": "8d8 силовое поле",
        "damage_at_slot_level": _slot_scale(8, "d8", 6),
    },
    "tether_essence": {"attack_or_save": "ТЕЛ"},
    "dark_star": {
        "attack_or_save": "ТЕЛ",
        "damage": "8d10 силовое поле",
    },
    "reality_break": {"attack_or_save": "МУД"},
    "ravenous_void": {
        "attack_or_save": "ТЕЛ",
        "damage": "5d10 силовое поле",
    },
    "time_ravage": {
        "attack_or_save": "ТЕЛ",
        "damage": "10d12 некротическая энергия",
    },
    "encode_thoughts": {"attack_or_save": "—"},
}


def _load_seed_patch(slug: str) -> dict[str, Any] | None:
    for path in SEED_CANDIDATES:
        if not path.is_file():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        for row in payload:
            if row.get("slug") == slug and isinstance(row.get("data"), dict):
                return deepcopy(row["data"])
    return None


def _patch_data(slug: str, data: dict[str, Any]) -> dict[str, Any]:
    next_data = dict(data)
    seed = _load_seed_patch(slug)
    if seed:
        # Prefer mirrored seed (already patched in repo) for classes/subclasses/combat.
        for key in (
            "classes",
            "subclasses",
            "attack_or_save",
            "damage",
            "damage_at_character_level",
            "damage_at_slot_level",
        ):
            if key in seed:
                next_data[key] = deepcopy(seed[key])
            elif key == "subclasses" and slug == "encode_thoughts":
                next_data.pop("subclasses", None)
        return next_data

    if slug == "encode_thoughts":
        next_data["classes"] = ["wizard"]
        next_data.pop("subclasses", None)
    elif slug in EGW_SLUGS:
        next_data["classes"] = ["wizard"]
        next_data["subclasses"] = deepcopy(DUNAMANCY_SUBCLASSES)
    combat = COMBAT.get(slug) or {}
    for key, value in combat.items():
        next_data[key] = deepcopy(value) if isinstance(value, (dict, list)) else value
    return next_data


def upgrade() -> None:
    conn = op.get_bind()
    slugs = list(EGW_SLUGS) + ["encode_thoughts"]
    for slug in slugs:
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
        raw = row["data"]
        if isinstance(raw, str):
            data = json.loads(raw)
        elif isinstance(raw, dict):
            data = dict(raw)
        else:
            data = {}
        patched = _patch_data(slug, data)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(patched, ensure_ascii=False)},
        )


def downgrade() -> None:
    conn = op.get_bind()
    for slug in list(EGW_SLUGS) + ["encode_thoughts"]:
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
        raw = row["data"]
        data = json.loads(raw) if isinstance(raw, str) else dict(raw or {})
        data["classes"] = []
        data.pop("subclasses", None)
        for key in (
            "attack_or_save",
            "damage",
            "damage_at_character_level",
            "damage_at_slot_level",
        ):
            data.pop(key, None)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
