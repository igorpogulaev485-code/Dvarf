"""P24-C21: seed Arcana Unleashed (AU) + Deadfall (AUD) catalog waves.

Revision ID: p24c21au01
Revises: p24c19ddbd01
Create Date: 2026-11-16

Idempotent upsert via edition_2024_catalog_seed (subclasses / backgrounds /
feats / spells / magic items / creatures for AU; magic items / creatures for AUD).
source=au|aud → content_layer community_ref.
Does not enable the 2024 create flag. Does not modify 2014 catalog.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c21au01"
down_revision: Union[str, Sequence[str], None] = "p24c19ddbd01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 AU/AUD catalog rows inserted by this pack."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition = '2024'
              AND source IN ('au', 'aud')
              AND is_active IS TRUE
            """
        )
    )
