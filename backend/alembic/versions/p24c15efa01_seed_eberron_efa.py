"""P24-C15: seed Eberron Forge of the Artificer catalog.

Revision ID: p24c15efa01
Revises: p24c07rbest01
Create Date: 2026-11-16

Idempotent upsert via edition_2024_catalog_seed (classes/subclasses/species/
backgrounds/feats/spells/magic_items EFA waves). source=efa →
content_layer community_ref. Artificer 2024 only — does not modify
2014 Tasha artificer. Does not enable the 2024 create flag. C12 skipped.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c15efa01"
down_revision: Union[str, Sequence[str], None] = "p24c07rbest01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 EFA catalog rows inserted by this pack."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition = '2024'
              AND source = 'efa'
              AND is_active IS TRUE
            """
        )
    )
