"""No-op: PHB backgrounds already live via background-grants tip (v1e2).

Revision ID: j7f8a9b0c1d2
Revises: j6e7f8a9b0c1
Create Date: 2026-10-07 18:00:00.000000

Originally upserted a thin PHB background slice from the feats branch.
Prod tip `cursor/background-grants-ef23` already has the full catalog
(variants, choice tables, personality, gear → attacks). Running the old
upsert would overwrite richer rows — keep the revision id for chain
continuity, but do nothing on upgrade.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "j7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "j6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Intentionally empty — see module docstring.
    pass


def downgrade() -> None:
    pass
