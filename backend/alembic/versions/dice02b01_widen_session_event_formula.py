"""DICE-02b: расширить formula/breakdown у session_events.

Revision ID: dice02b01widenroll
Revises: admqf01bootstrapsrc
Create Date: 2026-11-17

Формулы DICE-01 до 200 символов, разбор до 500.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "dice02b01widenroll"
down_revision: Union[str, Sequence[str], None] = "admqf01bootstrapsrc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "session_events" not in tables:
        return
    cols = {c["name"]: c for c in inspector.get_columns("session_events")}
    if "formula" in cols:
        op.alter_column(
            "session_events",
            "formula",
            existing_type=sa.String(length=120),
            type_=sa.String(length=200),
            existing_nullable=True,
        )
    if "breakdown" in cols:
        op.alter_column(
            "session_events",
            "breakdown",
            existing_type=sa.String(length=200),
            type_=sa.String(length=500),
            existing_nullable=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "session_events" not in tables:
        return
    cols = {c["name"] for c in inspector.get_columns("session_events")}
    if "breakdown" in cols:
        op.alter_column(
            "session_events",
            "breakdown",
            existing_type=sa.String(length=500),
            type_=sa.String(length=200),
            existing_nullable=True,
        )
    if "formula" in cols:
        op.alter_column(
            "session_events",
            "formula",
            existing_type=sa.String(length=200),
            type_=sa.String(length=120),
            existing_nullable=True,
        )
