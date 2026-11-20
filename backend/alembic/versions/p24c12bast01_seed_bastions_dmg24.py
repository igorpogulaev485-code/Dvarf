"""P24-C12: add catalog kind=bastion + seed DMG 2024 bastions.

Revision ID: p24c12bast01
Revises: p24c17frh01
Create Date: 2026-11-16

Adds enum value ``bastion`` and idempotent upsert of bastions_dmg24 wave
via edition_2024_catalog_seed. Also re-applies FRHoF C17 text fixes
(rarity_ru / damage RU / .; glue) already present in live JSON.
Does not enable the 2024 create flag. Does not modify 2014 catalog.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c12bast01"
down_revision: Union[str, Sequence[str], None] = "p24c17frh01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    with op.get_context().autocommit_block():
        op.execute(
            """
            DO $$ BEGIN
              ALTER TYPE catalog_kind ADD VALUE 'bastion';
            EXCEPTION
              WHEN duplicate_object THEN NULL;
            END $$;
            """
        )

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 bastion rows inserted by this pack."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition = '2024'
              AND kind::text = 'bastion'
              AND source = 'dmg24'
              AND is_active IS TRUE
            """
        )
    )
