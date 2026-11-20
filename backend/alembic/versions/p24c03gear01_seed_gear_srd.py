"""P24-C03: seed SRD 2024 weapons, armor, equipment into catalog_entries.

Revision ID: p24c03gear01
Revises: p24c02feats01
Create Date: 2026-11-15

Idempotent upsert via edition_2024_catalog_seed (waves weapons/armor/equipment
+ prior C01/C02 waves). Does not touch catalog_entries with rules_edition=2014.
Does not enable the 2024 create flag.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c03gear01"
down_revision: Union[str, Sequence[str], None] = "p24c02feats01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 gear rows inserted by this pack (idempotent)."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition::text = '2024'
              AND kind::text IN ('weapon', 'armor', 'item')
              AND source IN ('srd-5.2', 'srd-5.2.1')
            """
        )
    )
