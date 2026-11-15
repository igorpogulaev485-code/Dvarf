"""P24-C13: seed MM 2024 bestiary beyond SRD (wave 1).

Revision ID: p24c13mmw101
Revises: p24c11dmg01
Create Date: 2026-11-15

Idempotent upsert via edition_2024_catalog_seed (wave creatures_mm24_w1 +
prior C01–C11). source=mm24 → content_layer community_ref. Alphabet cut:
name_en < «Kuo-toa Archpriest». Does not touch rules_edition=2014.
Does not enable the 2024 create flag. C12 (bastions) skipped.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c13mmw101"
down_revision: Union[str, Sequence[str], None] = "p24c11dmg01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 MM24 wave-1 bestiary rows inserted by this pack."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition::text = '2024'
              AND source = 'mm24'
              AND kind::text = 'bestiary'
            """
        )
    )
