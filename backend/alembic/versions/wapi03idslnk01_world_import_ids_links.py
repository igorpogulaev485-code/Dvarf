"""W-API-03: алиасы ключей источника и предложенные связи черновика.

Revision ID: wapi03idslnk01
Revises: wapi01impfnd01
Create Date: 2026-11-15

- New tables only; no seed rows; ids issued at runtime via uuid4.
- Existing lobbies/settings/wiki untouched.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "wapi03idslnk01"
down_revision: Union[str, Sequence[str], None] = "wapi01impfnd01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = (
    "world_import_draft_links",
    "world_source_aliases",
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if "world_source_aliases" not in existing:
        op.create_table(
            "world_source_aliases",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "setting_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("settings.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "source_key_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("world_source_keys.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("alias", sa.String(200), nullable=False, server_default=""),
            sa.Column("alias_norm", sa.String(200), nullable=False, server_default=""),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.UniqueConstraint(
                "setting_id",
                "alias_norm",
                name="uq_world_source_aliases_setting_norm",
            ),
        )
        op.create_index(
            "ix_world_source_aliases_setting_id",
            "world_source_aliases",
            ["setting_id"],
        )
        op.create_index(
            "ix_world_source_aliases_source_key_id",
            "world_source_aliases",
            ["source_key_id"],
        )

    if "world_import_draft_links" not in existing:
        op.create_table(
            "world_import_draft_links",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "job_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("world_import_jobs.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("from_source_key", sa.String(512), nullable=False, server_default=""),
            sa.Column("to_source_key", sa.String(512), nullable=True),
            sa.Column("to_alias", sa.String(200), nullable=True),
            sa.Column("kind", sa.String(16), nullable=False, server_default="mention"),
            sa.Column("label", sa.String(120), nullable=False, server_default=""),
            sa.Column("confidence", sa.String(16), nullable=False, server_default="explicit"),
            sa.Column("status", sa.String(32), nullable=False, server_default="proposed"),
            sa.Column("office_title", sa.String(120), nullable=True),
            sa.Column("office_holder_status", sa.String(16), nullable=True),
            sa.Column("succession_order", sa.Integer(), nullable=True),
            sa.Column("tenure_from", sa.String(200), nullable=True),
            sa.Column("tenure_to", sa.String(200), nullable=True),
            sa.Column("hint", sa.String(300), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.UniqueConstraint(
                "job_id",
                "from_source_key",
                "to_source_key",
                "kind",
                "label",
                "confidence",
                "office_title",
                "succession_order",
                name="uq_world_import_draft_links_edge",
            ),
        )
        op.create_index(
            "ix_world_import_draft_links_job_id",
            "world_import_draft_links",
            ["job_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if "world_import_draft_links" in existing:
        op.drop_index(
            "ix_world_import_draft_links_job_id",
            table_name="world_import_draft_links",
        )
        op.drop_table("world_import_draft_links")

    if "world_source_aliases" in existing:
        op.drop_index(
            "ix_world_source_aliases_source_key_id",
            table_name="world_source_aliases",
        )
        op.drop_index(
            "ix_world_source_aliases_setting_id",
            table_name="world_source_aliases",
        )
        op.drop_table("world_source_aliases")
