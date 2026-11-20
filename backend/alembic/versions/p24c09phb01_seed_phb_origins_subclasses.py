"""P24-C09: seed PHB 2024 species/backgrounds/subclasses beyond SRD.

Revision ID: p24c09phb01
Revises: p24c08anim01
Create Date: 2026-11-15

Idempotent upsert via edition_2024_catalog_seed (waves species_ph24,
backgrounds_ph24, subclasses_ph24 + prior C01–C08). source=ph24 →
content_layer community_ref. Does not touch rules_edition=2014.
Does not enable the 2024 create flag.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c09phb01"
down_revision: Union[str, Sequence[str], None] = "p24c08anim01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 PHB-beyond-SRD rows inserted by this pack (idempotent)."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition::text = '2024'
              AND source = 'ph24'
              AND kind::text IN ('race', 'background', 'subclass')
            """
        )
    )
