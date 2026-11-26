"""TCE Additional Bard Spells: add bard to class lists.

Revision ID: k18bardtce01
Revises: k17braceammo01
Create Date: 2026-11-26

Tasha's optional «Additional Bard Spells» expands the 2014 bard list
(Color Spray … Phantasmal Killer … Prismatic Wall). Keep in sync with
frontend/public/spells-2014.json and tceAdditionalBardSpells.ts.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "k18bardtce01"
down_revision: Union[str, Sequence[str], None] = "k17braceammo01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TCE_ADDITIONAL_BARD_SPELL_SLUGS: tuple[str, ...] = (
    "color_spray",
    "command",
    "aid",
    "enlarge_reduce",
    "mirror_image",
    "intellect_fortress",
    "mass_healing_word",
    "slow",
    "phantasmal_killer",
    "telepathic_bond",
    "heroes_feast",
    "dream_of_the_blue_veil",
    "prismatic_spray",
    "antipathy_sympathy",
    "prismatic_wall",
)


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              jsonb_set(
                COALESCE(data, '{}'::jsonb),
                '{classes}',
                COALESCE(data->'classes', '[]'::jsonb) || '"bard"'::jsonb,
                true
              ),
              '{tce_additional_classes}',
              COALESCE(data->'tce_additional_classes', '[]'::jsonb) || '"bard"'::jsonb,
              true
            ),
            updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
              AND NOT COALESCE(data->'classes', '[]'::jsonb) ? 'bard'
            """
        ),
        {"slugs": list(TCE_ADDITIONAL_BARD_SPELL_SLUGS)},
    )
    # Rows that already had bard (TCE-native) still get the marker.
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{tce_additional_classes}',
              COALESCE(data->'tce_additional_classes', '[]'::jsonb) || '"bard"'::jsonb,
              true
            ),
            updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
              AND NOT COALESCE(data->'tce_additional_classes', '[]'::jsonb) ? 'bard'
            """
        ),
        {"slugs": list(TCE_ADDITIONAL_BARD_SPELL_SLUGS)},
    )


# Already had bard before this expansion (TCE-native / prior catalog).
_NATIVE_BARD_SLUGS: tuple[str, ...] = (
    "intellect_fortress",
    "dream_of_the_blue_veil",
    "antipathy_sympathy",
)


def downgrade() -> None:
    conn = op.get_bind()
    strip_slugs = [
        slug for slug in TCE_ADDITIONAL_BARD_SPELL_SLUGS if slug not in _NATIVE_BARD_SLUGS
    ]
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              jsonb_set(
                COALESCE(data, '{}'::jsonb),
                '{classes}',
                (
                  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
                  FROM jsonb_array_elements_text(COALESCE(data->'classes', '[]'::jsonb)) AS value
                  WHERE value <> 'bard'
                ),
                true
              ),
              '{tce_additional_classes}',
              (
                SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
                FROM jsonb_array_elements_text(
                  COALESCE(data->'tce_additional_classes', '[]'::jsonb)
                ) AS value
                WHERE value <> 'bard'
              ),
              true
            ),
            updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": strip_slugs},
    )
    # Clear marker only on native-bard rows.
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{tce_additional_classes}',
              (
                SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
                FROM jsonb_array_elements_text(
                  COALESCE(data->'tce_additional_classes', '[]'::jsonb)
                ) AS value
                WHERE value <> 'bard'
              ),
              true
            ),
            updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(_NATIVE_BARD_SLUGS)},
    )
