"""P24-01: lobbies.rules_edition + live 2024 catalog seed skeleton.

Revision ID: p2401lobbyed01
Revises: wapi08partych01
Create Date: 2026-11-16

- Add lobbies.rules_edition (reuse PG enum rules_edition), default 2014
- Call idempotent edition_2024_catalog_seed (no stub activation, no character purge)
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p2401lobbyed01"
down_revision: Union[str, Sequence[str], None] = "wapi08partych01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(inspector: sa.Inspector, table: str) -> set[str]:
    if table not in set(inspector.get_table_names()):
        return set()
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = _column_names(inspector, "lobbies")
    if "rules_edition" not in cols:
        # Reuse existing PostgreSQL enum ``rules_edition`` from characters.
        rules_edition = sa.Enum(
            "2014",
            "2024",
            name="rules_edition",
            create_type=False,
        )
        op.add_column(
            "lobbies",
            sa.Column(
                "rules_edition",
                rules_edition,
                nullable=False,
                server_default="2014",
            ),
        )

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(bind)
    # Explicit: this migration never deletes characters.


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = _column_names(inspector, "lobbies")
    if "rules_edition" in cols:
        op.drop_column("lobbies", "rules_edition")
