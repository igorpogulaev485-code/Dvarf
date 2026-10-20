"""stamp content_layer on spell + race catalog_entries (B0)

Revision ID: w9x0y1z2a3b4
Revises: v8w9x0y1z2a3
Create Date: 2026-10-20

Idempotent: sets data.content_layer from source / SRD race slug allowlist.
Does not delete or hide catalog rows.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "w9x0y1z2a3b4"
down_revision: Union[str, Sequence[str], None] = "v8w9x0y1z2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Keep in sync with app.dnd.content_layer.SRD_RACE_SLUGS
_SRD_RACES = (
    "dragonborn",
    "dwarf",
    "elf",
    "gnome",
    "half_elf",
    "half_orc",
    "halfling",
    "human",
    "tiefling",
)


def upgrade() -> None:
    conn = op.get_bind()
    # Spells / races whose source is SRD*
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{content_layer}',
              '"srd"'::jsonb,
              true
            ),
            updated_at = now()
            WHERE kind IN ('spell', 'race')
              AND source IS NOT NULL
              AND lower(source) LIKE 'srd%'
            """
        )
    )
    # Explicit homebrew-ish sources
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{content_layer}',
              '"homebrew"'::jsonb,
              true
            ),
            updated_at = now()
            WHERE kind IN ('spell', 'race')
              AND source IS NOT NULL
              AND (
                lower(source) LIKE '%homebrew%'
                OR lower(source) LIKE '%хомбр%'
                OR lower(source) IN ('custom', 'homebrew', 'хомбрю')
              )
            """
        )
    )
    # Base SRD race slugs even if source says phb / empty
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{content_layer}',
              '"srd"'::jsonb,
              true
            ),
            updated_at = now()
            WHERE kind = 'race'
              AND slug = ANY(:slugs)
              AND (
                data->>'content_layer' IS NULL
                OR data->>'content_layer' = 'community_ref'
              )
              AND (
                source IS NULL
                OR lower(source) NOT LIKE '%homebrew%'
              )
            """
        ),
        {"slugs": list(_SRD_RACES)},
    )
    # Everything else spell/race without a layer yet → community_ref
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{content_layer}',
              '"community_ref"'::jsonb,
              true
            ),
            updated_at = now()
            WHERE kind IN ('spell', 'race')
              AND (data->>'content_layer' IS NULL OR data->>'content_layer' = '')
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            """
            UPDATE catalog_entries
            SET data = data - 'content_layer',
                updated_at = now()
            WHERE kind IN ('spell', 'race')
              AND data ? 'content_layer'
            """
        )
    )
