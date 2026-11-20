"""P24-M03: skill name «Восприятие» -> «Внимательность» in 2024 catalog texts.

Revision ID: p24m03pr01
Revises: p24n01r01
Create Date: 2026-11-16

Re-upserts the 2024 catalog after renaming the skill in species / background /
feat / subclass descriptions (the sheet skill chip already says «Внимательность»).
Does not touch the 2014 catalog or the 2024 create flag.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24m03pr01"
down_revision: Union[str, Sequence[str], None] = "p24n01r01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """No data rollback — the old skill wording is not restored."""
    pass
