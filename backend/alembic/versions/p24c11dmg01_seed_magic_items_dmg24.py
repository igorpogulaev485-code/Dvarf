"""P24-C11: seed DMG 2024 magic items beyond SRD.

Revision ID: p24c11dmg01
Revises: p24c10phb01
Create Date: 2026-11-15

Idempotent upsert via edition_2024_catalog_seed (wave magic_items_dmg24 +
prior C01–C10). source=dmg24 → content_layer community_ref. Named eponyms
carry data.srd_alias → SRD unprefixed slug. Does not touch
rules_edition=2014. Does not enable the 2024 create flag.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c11dmg01"
down_revision: Union[str, Sequence[str], None] = "p24c10phb01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """Deactivate 2024 DMG-beyond magic items inserted by this pack (idempotent)."""
    import sqlalchemy as sa
    from alembic import op

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition::text = '2024'
              AND source = 'dmg24'
              AND kind::text = 'item'
              AND data->>'equipment_group' = 'magic_item'
            """
        )
    )
