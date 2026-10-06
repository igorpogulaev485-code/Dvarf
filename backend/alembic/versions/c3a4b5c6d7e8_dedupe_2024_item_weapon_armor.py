"""Remove 2024 item rows that duplicate weapon/armor by slug.

Revision ID: c3a4b5c6d7e8
Revises: b9d0e1f2a3c4
Create Date: 2026-10-06 17:55:00.000000

SRD 5.2 loader inserted equipment both as kind=weapon|armor and again as
kind=item with the same slug. Inventory/attacks pickers query multiple
kinds, so users saw exact duplicates (e.g. Dagger ×2).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3a4b5c6d7e8"
down_revision: Union[str, Sequence[str], None] = "b9d0e1f2a3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Soft-delete first so a mistaken run is recoverable from DB history;
    # then hard-delete the redundant rows (they are pure duplicates of
    # weapon/armor entries and should not reappear in catalog lists).
    result = conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries AS item
            WHERE item.kind = 'item'
              AND item.rules_edition = '2024'
              AND EXISTS (
                SELECT 1
                FROM catalog_entries AS gear
                WHERE gear.rules_edition = '2024'
                  AND gear.slug = item.slug
                  AND gear.kind IN ('weapon', 'armor')
              )
            """
        )
    )
    # alembic/sqlalchemy CursorResult
    deleted = result.rowcount if result.rowcount is not None else -1
    print(f"dedupe 2024 item∩weapon/armor: deleted {deleted} rows")


def downgrade() -> None:
    # Irreversible without reloading SRD 2024 catalog JSON.
    # Re-run c2b8b2062024 (or regenerate from scripts) if needed.
    pass
