"""ADM-03: журнал продуктовых событий product_events.

Revision ID: adm03metrics01
Revises: adm02userhelp01
Create Date: 2026-11-16

- product_events: signup / login / character_created / lobby_created / play_started
- индекс (event_type, created_at)
- user_id ON DELETE SET NULL; rules_edition только для персонажа
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "adm03metrics01"
down_revision: Union[str, Sequence[str], None] = "adm02userhelp01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "product_events" not in tables:
        op.create_table(
            "product_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("event_type", sa.String(length=64), nullable=False),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("rules_edition", sa.String(length=16), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index(
            "ix_product_events_user_id",
            "product_events",
            ["user_id"],
            unique=False,
        )
        op.create_index(
            "ix_product_events_type_created_at",
            "product_events",
            ["event_type", "created_at"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "product_events" not in tables:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("product_events") if idx.get("name")}
    for name in ("ix_product_events_type_created_at", "ix_product_events_user_id"):
        if name in indexes:
            op.drop_index(name, table_name="product_events")

    op.drop_table("product_events")
