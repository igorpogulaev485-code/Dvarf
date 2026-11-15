"""P24-C01: seed SRD 2024 species + backgrounds into catalog_entries.

Revision ID: p24c01speci01
Revises: p2401lobbyed01
Create Date: 2026-11-15

Idempotent upsert via edition_2024_catalog_seed (waves species_srd + backgrounds_srd).
Does not touch catalog_entries with rules_edition=2014.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c01speci01"
down_revision: Union[str, Sequence[str], None] = "p2401lobbyed01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 race/background rows inserted by this pack (idempotent)."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition::text = '2024'
              AND kind::text IN ('race', 'background')
              AND source IN ('srd-5.2', 'srd-5.2.1')
            """
        )
    )
