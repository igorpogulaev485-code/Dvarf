"""W-04: сеты артефактов + связь item_lore → артефакт.

Revision ID: w04sets8a1b2c
Revises: w03cmbt7b4e2a
Create Date: 2026-11-13

- setting_artifact_sets + setting_artifact_set_members
- setting_pages.artifact_id (nullable FK)
- Id строк не зашиты (B-08)
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "w04sets8a1b2c"
down_revision: Union[str, Sequence[str], None] = "w03cmbt7b4e2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "setting_artifact_sets" not in inspector.get_table_names():
        op.create_table(
            "setting_artifact_sets",
            sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "setting_id",
                UUID(as_uuid=True),
                sa.ForeignKey("settings.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("name", sa.String(120), nullable=False, server_default="Новый сет"),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("thresholds", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
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
        )

    member_tables = inspector.get_table_names()
    if "setting_artifact_set_members" not in member_tables:
        op.create_table(
            "setting_artifact_set_members",
            sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "set_id",
                UUID(as_uuid=True),
                sa.ForeignKey("setting_artifact_sets.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "artifact_id",
                UUID(as_uuid=True),
                sa.ForeignKey("setting_artifacts.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.UniqueConstraint("artifact_id", name="uq_setting_artifact_set_members_artifact"),
        )

    pages_cols = {c["name"] for c in inspector.get_columns("setting_pages")}
    if "artifact_id" not in pages_cols:
        op.add_column(
            "setting_pages",
            sa.Column(
                "artifact_id",
                UUID(as_uuid=True),
                sa.ForeignKey("setting_artifacts.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
        op.create_index(
            "ix_setting_pages_artifact_id",
            "setting_pages",
            ["artifact_id"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    pages_cols = {c["name"] for c in inspector.get_columns("setting_pages")}
    if "artifact_id" in pages_cols:
        op.drop_index("ix_setting_pages_artifact_id", table_name="setting_pages")
        op.drop_column("setting_pages", "artifact_id")

    tables = inspector.get_table_names()
    if "setting_artifact_set_members" in tables:
        op.drop_table("setting_artifact_set_members")
    if "setting_artifact_sets" in tables:
        op.drop_table("setting_artifact_sets")
