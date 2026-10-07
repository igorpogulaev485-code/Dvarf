"""Deactivate stub 2024 class rows that mirror 2014 names.

Revision ID: d1e2f3a4b5c6
Revises: c0d1e2f3a4b5
Create Date: 2026-10-06 18:05:00.000000

SRD 5.2 seeded kind=class for 2024 with the same Russian names as PHB 2014.
Within an edition the list is unique, but any caller that omits edition (or
users inspecting the full catalog) see «Плут» ×2, «Воин» ×2, etc.

Until the 2024 class sheet wave, keep only active 2014 (+ Artificer) classes.
Re-enable 2024 rows when that slice lands (downgrade restores is_active).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c0d1e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    result = op.get_bind().execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false,
                updated_at = now()
            WHERE kind = 'class'
              AND rules_edition = '2024'
              AND is_active = true
            """
        )
    )
    print(f"deactivated 2024 class stubs: {result.rowcount}")


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = true,
                updated_at = now()
            WHERE kind = 'class'
              AND rules_edition = '2024'
              AND is_active = false
            """
        )
    )
