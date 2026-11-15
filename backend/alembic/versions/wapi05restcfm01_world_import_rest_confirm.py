"""W-API-05: тумблер ai_can_confirm, журнал подтверждений, снимок до confirm.

Revision ID: wapi05restcfm01
Revises: wapi04setcrt01
Create Date: 2026-11-15

- settings.ai_can_confirm — ИИ может подтверждать (по умолчанию false).
- world_import_confirmations — кто/когда подтвердил (user | ai_token).
- world_import_jobs.confirm_snapshot — снимок «до confirm» для undo (W-API-07).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "wapi05restcfm01"
down_revision: Union[str, Sequence[str], None] = "wapi04setcrt01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_CONFIRMATIONS = "world_import_confirmations"


def _column_names(inspector: sa.Inspector, table: str) -> set[str]:
    if table not in set(inspector.get_table_names()):
        return set()
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if "settings" in existing:
        cols = _column_names(inspector, "settings")
        if "ai_can_confirm" not in cols:
            op.add_column(
                "settings",
                sa.Column(
                    "ai_can_confirm",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.text("false"),
                ),
            )

    if "world_import_jobs" in existing:
        cols = _column_names(inspector, "world_import_jobs")
        if "confirm_snapshot" not in cols:
            op.add_column(
                "world_import_jobs",
                sa.Column(
                    "confirm_snapshot",
                    postgresql.JSONB(astext_type=sa.Text()),
                    nullable=True,
                ),
            )
        if "last_confirmed_at" not in cols:
            op.add_column(
                "world_import_jobs",
                sa.Column(
                    "last_confirmed_at",
                    sa.DateTime(timezone=True),
                    nullable=True,
                ),
            )

    if _CONFIRMATIONS not in existing:
        op.create_table(
            _CONFIRMATIONS,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "job_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("world_import_jobs.id", ondelete="CASCADE"),
                nullable=False,
            ),
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
            sa.Column("actor_kind", sa.String(16), nullable=False, server_default="user"),
            sa.Column(
                "actor_user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "actor_token_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("world_api_tokens.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "item_ids",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "snapshot_before",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=True,
            ),
            sa.Column(
                "confirmed_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "undone_at",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
        )
        op.create_index(
            "ix_world_import_confirmations_job_id",
            _CONFIRMATIONS,
            ["job_id"],
        )
        op.create_index(
            "ix_world_import_confirmations_setting_id",
            _CONFIRMATIONS,
            ["setting_id"],
        )
        op.create_index(
            "ix_world_import_confirmations_lobby_id",
            _CONFIRMATIONS,
            ["lobby_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if _CONFIRMATIONS in existing:
        op.drop_index("ix_world_import_confirmations_lobby_id", table_name=_CONFIRMATIONS)
        op.drop_index("ix_world_import_confirmations_setting_id", table_name=_CONFIRMATIONS)
        op.drop_index("ix_world_import_confirmations_job_id", table_name=_CONFIRMATIONS)
        op.drop_table(_CONFIRMATIONS)

    if "world_import_jobs" in existing:
        cols = _column_names(inspector, "world_import_jobs")
        if "last_confirmed_at" in cols:
            op.drop_column("world_import_jobs", "last_confirmed_at")
        if "confirm_snapshot" in cols:
            op.drop_column("world_import_jobs", "confirm_snapshot")

    if "settings" in existing:
        cols = _column_names(inspector, "settings")
        if "ai_can_confirm" in cols:
            op.drop_column("settings", "ai_can_confirm")
