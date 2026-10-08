"""Add catalog_kind enum value bestiary (empty catalog for now).

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-10-08 05:10:00.000000

Reserves kind=bestiary for the future Bestiary agent. No seed rows.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, Sequence[str], None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Compatible with PG < 15 (no IF NOT EXISTS on ADD VALUE).
    op.execute(
        """
        DO $$ BEGIN
          ALTER TYPE catalog_kind ADD VALUE 'bestiary';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
        """
    )


def downgrade() -> None:
    # Enum values are not removed — safe no-op (rows of this kind should be none).
    pass
