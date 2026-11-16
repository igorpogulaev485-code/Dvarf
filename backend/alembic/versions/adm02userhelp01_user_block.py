"""ADM-02: блокировка аккаунта (blocked_at / blocked_by).

Revision ID: adm02userhelp01
Revises: adm01framework01
Create Date: 2026-11-16

- users.blocked_at — дата блокировки (NULL = не заблокирован)
- users.blocked_by — кто заблокировал (ON DELETE SET NULL)
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "adm02userhelp01"
down_revision: Union[str, Sequence[str], None] = "adm01framework01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}

    if "blocked_at" not in columns:
        op.add_column(
            "users",
            sa.Column("blocked_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "blocked_by" not in columns:
        op.add_column(
            "users",
            sa.Column(
                "blocked_by",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    fks = {fk["name"] for fk in inspector.get_foreign_keys("users") if fk.get("name")}

    # Имя FK от alembic может отличаться — снимаем по совпадению колонки.
    for fk in inspector.get_foreign_keys("users"):
        if fk.get("constrained_columns") == ["blocked_by"] and fk.get("name"):
            op.drop_constraint(fk["name"], "users", type_="foreignkey")
            break
    else:
        # Запасной путь, если имя известно заранее.
        for name in ("users_blocked_by_fkey", "fk_users_blocked_by_users"):
            if name in fks:
                op.drop_constraint(name, "users", type_="foreignkey")
                break

    if "blocked_by" in columns:
        op.drop_column("users", "blocked_by")
    if "blocked_at" in columns:
        op.drop_column("users", "blocked_at")
