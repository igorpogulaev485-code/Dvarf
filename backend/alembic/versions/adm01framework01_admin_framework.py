"""ADM-01: роли админки, пароль админки (хеш), журнал действий.

Revision ID: adm01framework01
Revises: wapi08partych01
Create Date: 2026-11-16

- admin_roles — полный админ / модератор справочников
- admin_secrets — хеш пароля админки на пользователя + лимит попыток
- admin_audit_log — журнал действий (расширяемый тип action)
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "adm01framework01"
down_revision: Union[str, Sequence[str], None] = "wapi08partych01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ROLES = "admin_roles"
_SECRETS = "admin_secrets"
_AUDIT = "admin_audit_log"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if _ROLES not in tables:
        op.create_table(
            _ROLES,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("role", sa.String(64), nullable=False),
            sa.Column(
                "granted_by",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.UniqueConstraint("user_id", "role", name="uq_admin_roles_user_role"),
        )
        op.create_index("ix_admin_roles_user_id", _ROLES, ["user_id"])
        op.create_index("ix_admin_roles_role", _ROLES, ["role"])

    if _SECRETS not in tables:
        op.create_table(
            _SECRETS,
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                primary_key=True,
                nullable=False,
            ),
            sa.Column("password_hash", sa.String(255), nullable=False),
            sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )

    if _AUDIT not in tables:
        op.create_table(
            _AUDIT,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "actor_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("action", sa.String(64), nullable=False),
            sa.Column("target_type", sa.String(64), nullable=True),
            sa.Column("target_id", sa.String(64), nullable=True),
            sa.Column(
                "meta",
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
        op.create_index("ix_admin_audit_log_actor_id", _AUDIT, ["actor_id"])
        op.create_index("ix_admin_audit_log_action", _AUDIT, ["action"])
        op.create_index("ix_admin_audit_log_created_at", _AUDIT, ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if _AUDIT in tables:
        op.drop_index("ix_admin_audit_log_created_at", table_name=_AUDIT)
        op.drop_index("ix_admin_audit_log_action", table_name=_AUDIT)
        op.drop_index("ix_admin_audit_log_actor_id", table_name=_AUDIT)
        op.drop_table(_AUDIT)
    if _SECRETS in tables:
        op.drop_table(_SECRETS)
    if _ROLES in tables:
        op.drop_index("ix_admin_roles_role", table_name=_ROLES)
        op.drop_index("ix_admin_roles_user_id", table_name=_ROLES)
        op.drop_table(_ROLES)
