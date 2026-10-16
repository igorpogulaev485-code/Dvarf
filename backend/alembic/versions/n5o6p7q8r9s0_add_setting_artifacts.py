"""Add setting_artifacts library (D1).

Revision ID: n5o6p7q8r9s0
Revises: m4n5o6p7q8r9
Create Date: 2026-10-16 03:40:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "n5o6p7q8r9s0"
down_revision: Union[str, Sequence[str], None] = "m4n5o6p7q8r9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "setting_artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "setting_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("settings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=120), nullable=False, server_default="Новый артефакт"),
        sa.Column("rarity", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "requires_attunement",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "abilities",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("attack_damage", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("attack_damage_type", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("attack_ability", sa.String(length=8), nullable=False, server_default="str"),
        sa.Column(
            "attack_range_kind",
            sa.String(length=16),
            nullable=False,
            server_default="melee",
        ),
        sa.Column("weight_lb", sa.Float(), nullable=True),
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
    op.create_index(
        "ix_setting_artifacts_setting_id",
        "setting_artifacts",
        ["setting_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_setting_artifacts_setting_id", table_name="setting_artifacts")
    op.drop_table("setting_artifacts")
