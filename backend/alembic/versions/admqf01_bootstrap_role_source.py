"""ADM-QF: source у admin_roles (bootstrap vs manual).

Revision ID: admqf01bootstrapsrc
Revises: adm05catalog01
Create Date: 2026-11-16

- Колонка source: bootstrap / NULL (ручная выдача)
- Ручные роли при смене почты не трогаем
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "admqf01bootstrapsrc"
down_revision: Union[str, Sequence[str], None] = "adm05catalog01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "admin_roles" not in tables:
        return
    cols = {c["name"] for c in inspector.get_columns("admin_roles")}
    if "source" not in cols:
        op.add_column(
            "admin_roles",
            sa.Column("source", sa.String(length=32), nullable=True),
        )
        op.create_index(
            "ix_admin_roles_source",
            "admin_roles",
            ["source"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "admin_roles" not in tables:
        return
    cols = {c["name"] for c in inspector.get_columns("admin_roles")}
    if "source" in cols:
        op.drop_index("ix_admin_roles_source", table_name="admin_roles")
        op.drop_column("admin_roles", "source")
