"""W-API-01: каркас импорта мира — jobs, draft items, source keys, api tokens.

Revision ID: wapi01impfnd01
Revises: p14spelru9a1b2
Create Date: 2026-11-15

- New tables only; no seed rows; ids issued at runtime via uuid4.
- Existing lobbies/settings untouched.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "wapi01impfnd01"
down_revision: Union[str, Sequence[str], None] = "p14spelru9a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = (
    "world_api_tokens",
    "world_source_keys",
    "world_import_draft_items",
    "world_import_jobs",
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if "world_import_jobs" not in existing:
        op.create_table(
            "world_import_jobs",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "setting_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("settings.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "lobby_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("lobbies.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "author_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("status", sa.String(32), nullable=False, server_default="received"),
            sa.Column("rules_edition", sa.String(16), nullable=False, server_default="2014"),
            sa.Column("source_kind", sa.String(16), nullable=False, server_default="api"),
            sa.Column("idempotency_key", sa.String(128), nullable=True),
            sa.Column("source_ref", sa.Text(), nullable=True),
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
            sa.UniqueConstraint(
                "setting_id",
                "idempotency_key",
                name="uq_world_import_jobs_setting_idempotency",
            ),
        )
        op.create_index("ix_world_import_jobs_setting_id", "world_import_jobs", ["setting_id"])
        op.create_index("ix_world_import_jobs_lobby_id", "world_import_jobs", ["lobby_id"])
        op.create_index("ix_world_import_jobs_author_id", "world_import_jobs", ["author_id"])

    if "world_import_draft_items" not in existing:
        op.create_table(
            "world_import_draft_items",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "job_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("world_import_jobs.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("item_type", sa.String(64), nullable=False, server_default="unknown"),
            sa.Column("source_key", sa.String(512), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="proposed"),
            sa.Column(
                "proposal",
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
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index(
            "ix_world_import_draft_items_job_id",
            "world_import_draft_items",
            ["job_id"],
        )

    if "world_source_keys" not in existing:
        op.create_table(
            "world_source_keys",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "setting_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("settings.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("source_path", sa.String(512), nullable=True),
            sa.Column("source_slug", sa.String(128), nullable=True),
            sa.Column(
                "page_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("setting_pages.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "artifact_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("setting_artifacts.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "character_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("characters.id", ondelete="SET NULL"),
                nullable=True,
            ),
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
            sa.UniqueConstraint(
                "setting_id",
                "source_path",
                name="uq_world_source_keys_setting_path",
            ),
            sa.UniqueConstraint(
                "setting_id",
                "source_slug",
                name="uq_world_source_keys_setting_slug",
            ),
        )
        op.create_index("ix_world_source_keys_setting_id", "world_source_keys", ["setting_id"])
        op.create_index("ix_world_source_keys_page_id", "world_source_keys", ["page_id"])
        op.create_index("ix_world_source_keys_artifact_id", "world_source_keys", ["artifact_id"])
        op.create_index("ix_world_source_keys_character_id", "world_source_keys", ["character_id"])

    if "world_api_tokens" not in existing:
        op.create_table(
            "world_api_tokens",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("token_prefix", sa.String(16), nullable=False),
            sa.Column(
                "lobby_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("lobbies.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "setting_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("settings.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "owner_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("can_read", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("can_write", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.UniqueConstraint("token_hash", name="uq_world_api_tokens_token_hash"),
        )
        op.create_index("ix_world_api_tokens_lobby_id", "world_api_tokens", ["lobby_id"])
        op.create_index("ix_world_api_tokens_setting_id", "world_api_tokens", ["setting_id"])
        op.create_index("ix_world_api_tokens_owner_id", "world_api_tokens", ["owner_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if "world_api_tokens" in existing:
        op.drop_index("ix_world_api_tokens_owner_id", table_name="world_api_tokens")
        op.drop_index("ix_world_api_tokens_setting_id", table_name="world_api_tokens")
        op.drop_index("ix_world_api_tokens_lobby_id", table_name="world_api_tokens")
        op.drop_table("world_api_tokens")

    if "world_source_keys" in existing:
        op.drop_index("ix_world_source_keys_character_id", table_name="world_source_keys")
        op.drop_index("ix_world_source_keys_artifact_id", table_name="world_source_keys")
        op.drop_index("ix_world_source_keys_page_id", table_name="world_source_keys")
        op.drop_index("ix_world_source_keys_setting_id", table_name="world_source_keys")
        op.drop_table("world_source_keys")

    if "world_import_draft_items" in existing:
        op.drop_index(
            "ix_world_import_draft_items_job_id",
            table_name="world_import_draft_items",
        )
        op.drop_table("world_import_draft_items")

    if "world_import_jobs" in existing:
        op.drop_index("ix_world_import_jobs_author_id", table_name="world_import_jobs")
        op.drop_index("ix_world_import_jobs_lobby_id", table_name="world_import_jobs")
        op.drop_index("ix_world_import_jobs_setting_id", table_name="world_import_jobs")
        op.drop_table("world_import_jobs")
