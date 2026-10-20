"""C5: page_kind, fields, quest_status + setting_page_templates.

Revision ID: n5o6p7q8r9s0
Revises: m4n5o6p7q8r9
Create Date: 2026-10-17 04:20:00.000000
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
        "setting_page_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "setting_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("settings.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("page_kind", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("body_seed", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "schema",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
        "ix_setting_page_templates_setting_id",
        "setting_page_templates",
        ["setting_id"],
    )
    op.create_index(
        "ix_setting_page_templates_page_kind",
        "setting_page_templates",
        ["page_kind"],
    )

    op.add_column(
        "setting_pages",
        sa.Column(
            "page_kind",
            sa.String(length=32),
            nullable=False,
            server_default="note",
        ),
    )
    op.add_column(
        "setting_pages",
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("setting_page_templates.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "setting_pages",
        sa.Column(
            "fields",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "setting_pages",
        sa.Column("quest_status", sa.String(length=32), nullable=True),
    )
    op.create_index("ix_setting_pages_page_kind", "setting_pages", ["page_kind"])
    op.create_index("ix_setting_pages_template_id", "setting_pages", ["template_id"])

    # Системные шаблоны (setting_id NULL) — стабильные UUID из app.dnd.setting_templates
    templates = sa.table(
        "setting_page_templates",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("setting_id", postgresql.UUID(as_uuid=True)),
        sa.column("page_kind", sa.String),
        sa.column("name", sa.String),
        sa.column("body_seed", sa.Text),
        sa.column("schema", postgresql.JSONB),
        sa.column("enabled", sa.Boolean),
    )

    from app.dnd.setting_templates import SYSTEM_TEMPLATES

    rows = [
        {
            "id": t["id"],
            "setting_id": None,
            "page_kind": t["page_kind"],
            "name": t["name"],
            "body_seed": t.get("body_seed") or "",
            "schema": t.get("schema") or [],
            "enabled": True,
        }
        for t in SYSTEM_TEMPLATES
    ]
    op.bulk_insert(templates, rows)


def downgrade() -> None:
    op.drop_index("ix_setting_pages_template_id", table_name="setting_pages")
    op.drop_index("ix_setting_pages_page_kind", table_name="setting_pages")
    op.drop_column("setting_pages", "quest_status")
    op.drop_column("setting_pages", "fields")
    op.drop_column("setting_pages", "template_id")
    op.drop_column("setting_pages", "page_kind")
    op.drop_index("ix_setting_page_templates_page_kind", table_name="setting_page_templates")
    op.drop_index("ix_setting_page_templates_setting_id", table_name="setting_page_templates")
    op.drop_table("setting_page_templates")
