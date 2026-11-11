"""Attunement rules, ability caps, and the alignment catalog.

Revision ID: i02rule9c4e1
Revises: i01seed8f2a7
Create Date: 2026-11-11

Upserts I02 gear rules (Ioun +2 max 20, giant-belt family, class/race/alignment
gates) through the I01 helper, then Russian alignment names plus «без
мировоззрения». Inventory rows that already point at the catalog receive the
new rules. Old alignment prose becomes a slug, or stays in alignment_text.
A second run writes nothing.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "i02rule9c4e1"
down_revision: Union[str, Sequence[str], None] = "i01seed8f2a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.services.alignment_catalog import (
        apply_alignment_catalog,
        migrate_character_alignments,
    )
    from app.services.gear_catalog_seed import (
        apply_gear_catalog_waves,
        refresh_inventory_from_catalog,
    )

    conn = op.get_bind()
    apply_gear_catalog_waves(conn)
    apply_alignment_catalog(conn)
    refresh_inventory_from_catalog(conn)
    migrate_character_alignments(conn)


def downgrade() -> None:
    # Catalog names, item rules, and sheet text stay. The previous wording
    # is not recoverable once a slug replaced it.
    pass
