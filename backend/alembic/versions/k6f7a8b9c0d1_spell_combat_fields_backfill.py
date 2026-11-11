"""Backfill attack_or_save / damage scales for PHB/XGE/TCE (+) spells.

Revision ID: k6f7a8b9c0d1
Revises: j5e6f7a8b9c0
Create Date: 2026-10-22

Q2 depth: fill cast-UI combat fields left empty on community_ref / book rows
(cantrips Friends/Blade Ward/Thorn Whip + L1–3 PHB/XGE/TCE combat spells).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = "j5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_CANDIDATES = (
    Path("data/srd/2014/spells_enriched_v1.json"),
    Path("backend/data/srd/2014/spells_enriched_v1.json"),
    Path(__file__).resolve().parents[2] / "data/srd/2014/spells_enriched_v1.json",
)

COMBAT_KEYS = (
    "attack_or_save",
    "damage",
    "damage_at_character_level",
    "damage_at_slot_level",
)

# Slugs touched by this backfill (must stay in sync with seed mirrors).
TARGET_SLUGS: tuple[str, ...] = (
    "aganazzar_s_scorcher",
    "air_bubble",
    "arms_of_hadar",
    "aura_of_vitality",
    "blade_ward",
    "blinding_smite",
    "cause_fear",
    "chaos_bolt",
    "chromatic_orb",
    "cloud_of_daggers",
    "conjure_barrage",
    "crusader_s_mantle",
    "dust_devil",
    "earth_tremor",
    "ensnaring_strike",
    "feign_death",
    "flock_of_familiars",
    "friends",
    "frost_fingers",
    "galder_s_tower",
    "hail_of_thorns",
    "healing_spirit",
    "hunger_of_hadar",
    "ice_knife",
    "jims_magic_missile",
    "life_transference",
    "melf_s_minute_meteors",
    "ray_of_sickness",
    "rime_s_binding_ice",
    "searing_smite",
    "snilloc_s_snowball_swarm",
    "spirit_shroud",
    "spray_of_cards",
    "summon_beast",
    "summon_fey",
    "summon_lesser_demons",
    "summon_shadowspawn",
    "summon_undead",
    "tasha_s_caustic_brew",
    "thorn_whip",
    "thunder_step",
    "thunderous_smite",
    "tidal_wave",
    "vortex_warp",
    "wall_of_sand",
    "wall_of_water",
    "warding_wind",
    "witch_bolt",
    "wither_and_bloom",
    "wrathful_smite",
)


def _load_seed_combat() -> dict[str, dict[str, Any]]:
    for path in SEED_CANDIDATES:
        if not path.is_file():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        out: dict[str, dict[str, Any]] = {}
        for row in payload:
            slug = row.get("slug")
            if slug not in TARGET_SLUGS:
                continue
            data = row.get("data")
            if not isinstance(data, dict):
                continue
            patch = {k: data[k] for k in COMBAT_KEYS if k in data}
            if patch:
                out[slug] = patch
        return out
    raise FileNotFoundError(f"Spell seed not found; tried {SEED_CANDIDATES}")


def upgrade() -> None:
    patches = _load_seed_combat()
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
        raw = row["data"]
        data = json.loads(raw) if isinstance(raw, str) else dict(raw or {})
        data.update(patch)
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


def downgrade() -> None:
    # Non-destructive: leave combat fields in place (safe for sheets).
    pass
