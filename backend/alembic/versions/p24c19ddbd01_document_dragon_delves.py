"""P24-C19: document Dragon Delves (DDBD) — no exclusive catalog cards.

Revision ID: p24c19ddbd01
Revises: p24c20rfull01
Create Date: 2026-11-16

Open English sources (D&D Beyond TOC, buyer reports, reviews) confirm
Dragon Delves has no exclusive creatures, magic items, or character
options beyond MM24/DMG24 references. Adventure prose/maps are out of
scope. This revision re-applies the idempotent 2024 catalog seed (no new
waves) so Alembic stays single-headed after the documentation pack.

Does not enable the 2024 create flag. Does not modify 2014 catalog.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c19ddbd01"
down_revision: Union[str, Sequence[str], None] = "p24c20rfull01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """No DDBD rows were inserted — nothing to deactivate."""
    pass
