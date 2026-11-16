"""P24-C20R: restore full live 2024 catalog texts (no mid-word ellipsis).

Revision ID: p24c20rfull01
Revises: p24c20rtw01
Create Date: 2026-11-16

Idempotent upsert of all registered 2024 waves after repairing truncated
text_ru / traits_text and fixing RTW ebonbane rarity/sentient.
Does not enable the 2024 create flag. Does not modify 2014 catalog.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24c20rfull01"
down_revision: Union[str, Sequence[str], None] = "p24c20rtw01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """No data rollback — previous truncated texts are not restored."""
    pass
