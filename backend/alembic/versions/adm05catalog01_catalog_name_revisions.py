"""ADM-05: таблица правок названий справочника catalog_name_revisions.

Revision ID: adm05catalog01
Revises: adm04feedback01
Create Date: 2026-11-16

- Черновик / принято / отклонено / откатили
- Частичный уникальный индекс: не больше одного pending на запись каталога
- Сиды catalog_entries.name_ru не трогаем — живое имя накладывается при чтении
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "adm05catalog01"
down_revision: Union[str, Sequence[str], None] = "adm04feedback01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "catalog_name_revisions" not in tables:
        op.create_table(
            "catalog_name_revisions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "catalog_entry_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("catalog_entries.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("name_ru", sa.String(length=160), nullable=False),
            sa.Column("name_en", sa.String(length=160), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column(
                "author_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "reviewer_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("previous_name_ru", sa.String(length=160), nullable=True),
            sa.Column("previous_name_en", sa.String(length=160), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        )

    indexes = {idx["name"] for idx in inspector.get_indexes("catalog_name_revisions")} if "catalog_name_revisions" in set(sa.inspect(bind).get_table_names()) else set()
    # Re-inspect after possible create
    inspector = sa.inspect(bind)
    if "catalog_name_revisions" in set(inspector.get_table_names()):
        indexes = {idx["name"] for idx in inspector.get_indexes("catalog_name_revisions")}
    else:
        indexes = set()

    if "ix_catalog_name_revisions_catalog_entry_id" not in indexes:
        op.create_index(
            "ix_catalog_name_revisions_catalog_entry_id",
            "catalog_name_revisions",
            ["catalog_entry_id"],
        )
    if "ix_catalog_name_revisions_status" not in indexes:
        op.create_index(
            "ix_catalog_name_revisions_status",
            "catalog_name_revisions",
            ["status"],
        )
    if "ix_catalog_name_revisions_entry_status" not in indexes:
        op.create_index(
            "ix_catalog_name_revisions_entry_status",
            "catalog_name_revisions",
            ["catalog_entry_id", "status"],
        )
    if "ix_catalog_name_revisions_created_at" not in indexes:
        op.create_index(
            "ix_catalog_name_revisions_created_at",
            "catalog_name_revisions",
            ["created_at"],
        )
    if "ix_catalog_name_revisions_reviewed_at" not in indexes:
        op.create_index(
            "ix_catalog_name_revisions_reviewed_at",
            "catalog_name_revisions",
            ["reviewed_at"],
        )
    if "uq_catalog_name_revisions_one_pending" not in indexes:
        op.create_index(
            "uq_catalog_name_revisions_one_pending",
            "catalog_name_revisions",
            ["catalog_entry_id"],
            unique=True,
            postgresql_where=sa.text("status = 'pending'"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "catalog_name_revisions" not in tables:
        return

    indexes = {idx["name"] for idx in inspector.get_indexes("catalog_name_revisions")}
    for name in (
        "uq_catalog_name_revisions_one_pending",
        "ix_catalog_name_revisions_reviewed_at",
        "ix_catalog_name_revisions_created_at",
        "ix_catalog_name_revisions_entry_status",
        "ix_catalog_name_revisions_status",
        "ix_catalog_name_revisions_catalog_entry_id",
    ):
        if name in indexes:
            op.drop_index(name, table_name="catalog_name_revisions")

    op.drop_table("catalog_name_revisions")
