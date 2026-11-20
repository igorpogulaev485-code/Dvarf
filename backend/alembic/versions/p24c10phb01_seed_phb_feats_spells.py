"""P24-C10: seed PHB 2024 feats + spells beyond SRD.

Revision ID: p24c10phb01
Revises: p24c09phb01
Create Date: 2026-11-15

Idempotent upsert via edition_2024_catalog_seed (waves feats_ph24,
spells_ph24 + prior C01–C09). source=ph24 → content_layer community_ref.
Named spells carry data.srd_alias → SRD unprefixed slug. Does not touch
rules_edition=2014. Does not enable the 2024 create flag.
Equipment/magic_items PH24 beyond SRD: 0 rows after C03/C06.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c10phb01"
down_revision: Union[str, Sequence[str], None] = "p24c09phb01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 PHB-beyond feats/spells inserted by this pack (idempotent)."""
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
              AND kind::text IN ('feat', 'spell')
            """
        )
    )
