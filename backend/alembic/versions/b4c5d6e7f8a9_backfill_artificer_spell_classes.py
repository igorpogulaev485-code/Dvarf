"""Backfill artificer onto PHB/TCE class spell lists.

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-10-21

Artificer was only tagged on XGE/TCE-native rows; PHB staples (fire_bolt,
cure_wounds, …) never got `artificer` in data.classes, so grimoire / prepare
pickers showed ~9 cantrips and ~4 L1 spells.

Chained after live tip head a3b4c5d6e7f8 (tiefling hellish rebuke).
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, Sequence[str], None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Keep in sync with frontend/public/spells-2014.json + spells_enriched_v1.json
ARTIFICER_CLASS_SLUGS: tuple[str, ...] = (
    # cantrips
    "acid_splash",
    "fire_bolt",
    "guidance",
    "light",
    "mage_hand",
    "mending",
    "message",
    "poison_spray",
    "prestidigitation",
    "ray_of_frost",
    "resistance",
    "shocking_grasp",
    "spare_the_dying",
    # 1st
    "alarm",
    "cure_wounds",
    "detect_magic",
    "disguise_self",
    "expeditious_retreat",
    "faerie_fire",
    "false_life",
    "feather_fall",
    "grease",
    "identify",
    "jump",
    "longstrider",
    "purify_food_and_drink",
    "sanctuary",
    # 2nd
    "aid",
    "alter_self",
    "arcane_lock",
    "blur",
    "continual_flame",
    "darkvision",
    "enhance_ability",
    "enlarge_reduce",
    "heat_metal",
    "invisibility",
    "lesser_restoration",
    "levitate",
    "magic_mouth",
    "magic_weapon",
    "protection_from_poison",
    "rope_trick",
    "see_invisibility",
    "spider_climb",
    "web",
    # 3rd
    "blink",
    "fly",
    "glyph_of_warding",
    "haste",
    "protection_from_energy",
    "revivify",
    "water_breathing",
    "water_walk",
    # 4th
    "arcane_eye",
    "fabricate",
    "freedom_of_movement",
    "faithful_hound",
    "private_sanctum",
    "resilient_sphere",
    "stone_shape",
    # 5th
    "animate_objects",
    "creation",
    "greater_restoration",
    "wall_of_stone",
)


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{classes}',
              COALESCE(data->'classes', '[]'::jsonb) || '"artificer"'::jsonb,
              true
            ),
            updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
              AND NOT COALESCE(data->'classes', '[]'::jsonb) ? 'artificer'
            """
        ),
        {"slugs": list(ARTIFICER_CLASS_SLUGS)},
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{classes}',
              (
                SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
                FROM jsonb_array_elements_text(COALESCE(data->'classes', '[]'::jsonb)) AS value
                WHERE value <> 'artificer'
              ),
              true
            ),
            updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
              AND COALESCE(data->'classes', '[]'::jsonb) ? 'artificer'
            """
        ),
        {"slugs": list(ARTIFICER_CLASS_SLUGS)},
    )
