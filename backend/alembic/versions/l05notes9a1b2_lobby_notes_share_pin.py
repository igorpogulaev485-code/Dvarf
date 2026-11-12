"""L-05: lobby notes shared_with_master, pinned, updated_by.

Revision ID: l05notes9a1b2
Revises: l04roster8c4d2
Create Date: 2026-11-13

- shared_with_master: author can reveal one personal note to owner/comaster
- pinned: board pin to top
- updated_by_user_id: who last edited (party board attribution)
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "l05notes9a1b2"
down_revision: Union[str, Sequence[str], None] = "l04roster8c4d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_UPDATED_BY = "fk_lobby_notes_updated_by_user"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "lobby_notes" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("lobby_notes")}
    if "shared_with_master" not in cols:
        op.add_column(
            "lobby_notes",
            sa.Column(
                "shared_with_master",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )
    if "pinned" not in cols:
        op.add_column(
            "lobby_notes",
            sa.Column(
                "pinned",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )
    if "updated_by_user_id" not in cols:
        op.add_column(
            "lobby_notes",
            sa.Column(
                "updated_by_user_id",
                postgresql.UUID(as_uuid=True),
                nullable=True,
            ),
        )
        fks = {fk["name"] for fk in inspector.get_foreign_keys("lobby_notes")}
        if FK_UPDATED_BY not in fks and "users" in tables:
            op.create_foreign_key(
                FK_UPDATED_BY,
                "lobby_notes",
                "users",
                ["updated_by_user_id"],
                ["id"],
                ondelete="SET NULL",
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "lobby_notes" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("lobby_notes")}
    fks = {fk["name"] for fk in inspector.get_foreign_keys("lobby_notes")}
    if FK_UPDATED_BY in fks:
        op.drop_constraint(FK_UPDATED_BY, "lobby_notes", type_="foreignkey")
    if "updated_by_user_id" in cols:
        op.drop_column("lobby_notes", "updated_by_user_id")
    if "pinned" in cols:
        op.drop_column("lobby_notes", "pinned")
    if "shared_with_master" in cols:
        op.drop_column("lobby_notes", "shared_with_master")
