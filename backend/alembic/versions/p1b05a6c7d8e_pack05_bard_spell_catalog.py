"""Pack 05 bard catalog: Antipathy on the bard list, Revivify school, saves.

Revision ID: p1b05a6c7d8e
Revises: o0e1f2a3b4c5
Create Date: 2026-11-11

PHB bard 8th includes Antipathy/Sympathy. Revivify is necromancy, so a
College of Spirits session can offer it. Bard spells whose cast requires a
save had an empty «Атака/спас». Light's Dexterity save and the XGE reprint
of Thunderclap / Earth Tremor are left as they are.

Ids of catalog rows are not changed.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p1b05a6c7d8e"
down_revision: Union[str, Sequence[str], None] = "o0e1f2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# slug -> attack_or_save written by this revision.
SAVES: dict[str, str] = {
    "phantasmal_force": "ИНТ",
    "crown_of_madness": "МУД",
    "detect_thoughts": "МУД",
    "irresistible_dance": "МУД",
    "seeming": "ХАР",
    "true_polymorph": "МУД",
    "zone_of_truth": "ХАР",
    "forcecage": "ХАР",
    "power_word_stun": "ТЕЛ",
    "charm_monster": "МУД",
    "enemies_abound": "ИНТ",
    "psychic_scream": "ИНТ",
    "synaptic_static": "ИНТ",
    "mass_polymorph": "МУД",
    "pyrotechnics": "ТЕЛ",
    "fast_friends": "МУД",
    "antagonize": "МУД",
    "nathair_s_mischief": "МУД/ЛОВ",
}


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{classes}',
              COALESCE(data->'classes', '[]'::jsonb) || '"bard"'::jsonb,
              true
            ),
            updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = 'antipathy_sympathy'
              AND NOT COALESCE(data->'classes', '[]'::jsonb) ? 'bard'
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{school}', '"necromancy"'::jsonb, true),
                updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = 'revivify'
            """
        )
    )
    for slug, save in SAVES.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = jsonb_set(
                  COALESCE(data, '{}'::jsonb),
                  '{attack_or_save}',
                  to_jsonb(CAST(:save AS text)),
                  true
                ),
                updated_at = now()
                WHERE kind = 'spell'
                  AND rules_edition = '2014'
                  AND slug = :slug
                """
            ),
            {"slug": slug, "save": save},
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{classes}',
              (
                SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
                FROM jsonb_array_elements_text(COALESCE(data->'classes', '[]'::jsonb)) AS value
                WHERE value <> 'bard'
              ),
              true
            ),
            updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = 'antipathy_sympathy'
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{school}', '"conjuration"'::jsonb, true),
                updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = 'revivify'
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = data - 'attack_or_save',
                updated_at = now()
            WHERE kind = 'spell'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(SAVES)},
    )
