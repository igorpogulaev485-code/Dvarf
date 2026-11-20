"""P24-C04: seed SRD 2024 classes and subclasses into catalog_entries.

Revision ID: p24c04class01
Revises: p24c03gear01
Create Date: 2026-11-15

Idempotent upsert via edition_2024_catalog_seed (waves classes/subclasses
+ prior C01–C03 waves). Does not touch catalog_entries with rules_edition=2014.
Does not enable the 2024 create flag.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c04class01"
down_revision: Union[str, Sequence[str], None] = "p24c03gear01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 class/subclass rows inserted by this pack (idempotent)."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition::text = '2024'
              AND kind::text IN ('class', 'subclass')
              AND source IN ('srd-5.2', 'srd-5.2.1')
            """
        )
    )
