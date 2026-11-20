"""P24-N01R: sync embedded slug name_ru refs in 2024 catalog.

Revision ID: p24n01r01
Revises: p24n01names01
Create Date: 2026-11-16

Re-upserts 2024 catalog after aligning nested refs (e.g. origin_feat.name_ru)
with the target card's current name_ru. Does not enable the 2024 create flag.
Does not modify 2014 catalog.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24n01r01"
down_revision: Union[str, Sequence[str], None] = "p24n01names01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """No data rollback — previous embedded names are not restored."""
    pass
