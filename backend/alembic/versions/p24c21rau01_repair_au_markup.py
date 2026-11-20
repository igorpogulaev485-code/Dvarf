"""P24-C21R: repair AU/AUD (+ EFA nbsp) live markup leftovers.

Revision ID: p24c21rau01
Revises: p24c21au01
Create Date: 2026-11-16

Re-upserts the 2024 catalog after scrubbing HTML/JS chrome, flattened
tables, Latin prerequisite codes, and rarity dictionary wording in
AU/AUD waves (plus EFA &nbsp;). Does not enable the 2024 create flag.
Does not modify 2014 catalog.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c21rau01"
down_revision: Union[str, Sequence[str], None] = "p24c21au01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """No data rollback — previous markup-tainted texts are not restored."""
    pass
