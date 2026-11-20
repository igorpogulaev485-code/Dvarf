"""P24-C18: seed FRAiF + ABH + LFL + NsF catalog waves.

Revision ID: p24c18fraif01
Revises: p24c12bast01
Create Date: 2026-11-16

Idempotent upsert via edition_2024_catalog_seed (creatures/magic items/
backgrounds/feats/species for FRAiF, ABH, LFL, NsF).
source=fraif|abh|lfl|nsf → content_layer community_ref.
Does not enable the 2024 create flag. Does not modify 2014 catalog.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c18fraif01"
down_revision: Union[str, Sequence[str], None] = "p24c12bast01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 FRAiF/ABH/LFL/NsF catalog rows inserted by this pack."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition = '2024'
              AND source IN ('fraif', 'abh', 'lfl', 'nsf')
              AND is_active IS TRUE
            """
        )
    )
