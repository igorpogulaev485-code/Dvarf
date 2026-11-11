"""Ensure setting_artifacts (D1) after classic↔T5 merge.

Revision ID: u7v8w9x0y1z2
Revises: t6u7v8w9x0y1
Create Date: 2026-10-17

Historically D1 used revision id n5o6p7q8r9s0 which collided with C5.
Live DB already has the table from the classic tip deploy; this revision
is idempotent so upgrade head succeeds on merged tip trees.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "u7v8w9x0y1z2"
down_revision: Union[str, Sequence[str], None] = "t6u7v8w9x0y1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "setting_artifacts" in tables:
        return
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
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "setting_artifacts" not in tables:
        return
    op.drop_index("ix_setting_artifacts_setting_id", table_name="setting_artifacts")
    op.drop_table("setting_artifacts")
