"""P24-C07R: rebuild SRD bestiary texts (C07/C08) + 4 subclass stubs.

Revision ID: p24c07rbest01
Revises: p24c14mmw201
Create Date: 2026-11-15

Idempotent upsert via edition_2024_catalog_seed (refreshed creatures_srd,
animals_srd, subclasses_srd). Does not touch rules_edition=2014.
Does not enable the 2024 create flag.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c07rbest01"
down_revision: Union[str, Sequence[str], None] = "p24c14mmw201"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """No-op: text rebuild is not safely reversible without prior snapshot."""
    # Intentionally empty — re-apply earlier wave JSON from a previous revision
    # if a true rollback is needed.
    return
