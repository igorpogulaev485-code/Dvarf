"""W-02: setting_page_versions + soft-delete trash; is_extra → корзина.

Revision ID: w02wiki0a2e0f
Revises: w01wiki8d3a4
Create Date: 2026-11-13

- settings.deleted_at, setting_pages.deleted_at (корзина 30 дней).
- Таблица setting_page_versions (снимки правок; id выдаёт приложение).
- Лишние сеттинги (is_extra) → deleted_at = now() (кандидаты W-01 в корзину).
- Без захардкоженных UUID (B-08).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "w02wiki0a2e0f"
down_revision: Union[str, Sequence[str], None] = "w01wiki8d3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DELETED_AT = "deleted_at"
VERSIONS = "setting_page_versions"


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return any(c["name"] == column for c in insp.get_columns(table))


def _has_table(bind, table: str) -> bool:
    insp = sa.inspect(bind)
    return table in insp.get_table_names()


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_column(bind, "settings", DELETED_AT):
        op.add_column(
            "settings",
            sa.Column(DELETED_AT, sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_settings_deleted_at", "settings", [DELETED_AT])

    if not _has_column(bind, "setting_pages", DELETED_AT):
        op.add_column(
            "setting_pages",
            sa.Column(DELETED_AT, sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_setting_pages_deleted_at", "setting_pages", [DELETED_AT])

    # W-01 is_extra → корзина (сессии остаются привязаны: FK не трогаем).
    bind.execute(
        sa.text(
            f"""
            UPDATE settings
            SET {DELETED_AT} = COALESCE({DELETED_AT}, NOW())
            WHERE is_extra IS TRUE
              AND {DELETED_AT} IS NULL
            """
        )
    )

    if not _has_table(bind, VERSIONS):
        op.create_table(
            VERSIONS,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "page_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("setting_pages.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "setting_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("settings.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "created_by",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("author_name", sa.String(length=120), nullable=False, server_default=""),
            sa.Column(
                "snapshot",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index(
            "ix_setting_page_versions_page_created",
            VERSIONS,
            ["page_id", "created_at"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, VERSIONS):
        op.drop_index("ix_setting_page_versions_page_created", table_name=VERSIONS)
        op.drop_table(VERSIONS)
    if _has_column(bind, "setting_pages", DELETED_AT):
        op.drop_index("ix_setting_pages_deleted_at", table_name="setting_pages")
        op.drop_column("setting_pages", DELETED_AT)
    if _has_column(bind, "settings", DELETED_AT):
        op.drop_index("ix_settings_deleted_at", table_name="settings")
        op.drop_column("settings", DELETED_AT)
