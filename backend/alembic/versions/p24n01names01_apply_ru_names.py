"""P24-N01: apply Russian naming decision to 2024 catalog.

Revision ID: p24n01names01
Revises: p24c21rau01
Create Date: 2026-11-16

Re-upserts the 2024 catalog after resolving name_ru (2014 pair, else
next.dnd.su) and normalizing rarity_ru «редкость варьируется».
Does not enable the 2024 create flag. Does not modify 2014 catalog.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24n01names01"
down_revision: Union[str, Sequence[str], None] = "p24c21rau01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """No data rollback — previous proposed names are not restored."""
    pass
