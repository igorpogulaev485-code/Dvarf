"""W-API-08: ключ импорта на персонаже + PDF-вложения (не LobbyMedia).

Revision ID: wapi08partych01
Revises: wapi05restcfm01
Create Date: 2026-11-15

- characters.import_key / imported_setting_id / assigned_user_id
- world_import_attachments — PDF и пр. без width/height картинки
- Existing characters untouched beyond empty nullable columns.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "wapi08partych01"
down_revision: Union[str, Sequence[str], None] = "wapi05restcfm01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ATTACHMENTS = "world_import_attachments"
_CHAR_COLS = (
    ("import_key", sa.String(128)),
    ("imported_setting_id", postgresql.UUID(as_uuid=True)),
    ("assigned_user_id", postgresql.UUID(as_uuid=True)),
)


def _column_names(inspector: sa.Inspector, table: str) -> set[str]:
    if table not in set(inspector.get_table_names()):
        return set()
    return {c["name"] for c in inspector.get_columns(table)}


def _index_names(inspector: sa.Inspector, table: str) -> set[str]:
    if table not in set(inspector.get_table_names()):
        return set()
    return {i["name"] for i in inspector.get_indexes(table)}


def _uq_names(inspector: sa.Inspector, table: str) -> set[str]:
    if table not in set(inspector.get_table_names()):
        return set()
    return {u["name"] for u in inspector.get_unique_constraints(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if "characters" in existing:
        cols = _column_names(inspector, "characters")
        if "import_key" not in cols:
            op.add_column(
                "characters",
                sa.Column("import_key", sa.String(128), nullable=True),
            )
        if "imported_setting_id" not in cols:
            op.add_column(
                "characters",
                sa.Column(
                    "imported_setting_id",
                    postgresql.UUID(as_uuid=True),
                    sa.ForeignKey("settings.id", ondelete="SET NULL"),
                    nullable=True,
                ),
            )
        if "assigned_user_id" not in cols:
            op.add_column(
                "characters",
                sa.Column(
                    "assigned_user_id",
                    postgresql.UUID(as_uuid=True),
                    sa.ForeignKey("users.id", ondelete="SET NULL"),
                    nullable=True,
                ),
            )
        inspector = sa.inspect(bind)
        idxs = _index_names(inspector, "characters")
        if "ix_characters_imported_setting_id" not in idxs:
            op.create_index(
                "ix_characters_imported_setting_id",
                "characters",
                ["imported_setting_id"],
            )
        if "ix_characters_assigned_user_id" not in idxs:
            op.create_index(
                "ix_characters_assigned_user_id",
                "characters",
                ["assigned_user_id"],
            )
        uqs = _uq_names(inspector, "characters")
        if "uq_characters_setting_import_key" not in uqs:
            op.create_unique_constraint(
                "uq_characters_setting_import_key",
                "characters",
                ["imported_setting_id", "import_key"],
            )

    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    if _ATTACHMENTS not in existing:
        op.create_table(
            _ATTACHMENTS,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
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
                "character_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("characters.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("source_path", sa.String(512), nullable=False, server_default=""),
            sa.Column(
                "original_filename",
                sa.String(255),
                nullable=False,
                server_default="file.pdf",
            ),
            sa.Column(
                "content_type",
                sa.String(128),
                nullable=False,
                server_default="application/pdf",
            ),
            sa.Column("bytes_on_disk", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("storage_relpath", sa.String(512), nullable=False, server_default=""),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index(
            "ix_world_import_attachments_lobby_id",
            _ATTACHMENTS,
            ["lobby_id"],
        )
        op.create_index(
            "ix_world_import_attachments_setting_id",
            _ATTACHMENTS,
            ["setting_id"],
        )
        op.create_index(
            "ix_world_import_attachments_character_id",
            _ATTACHMENTS,
            ["character_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if _ATTACHMENTS in existing:
        for idx in (
            "ix_world_import_attachments_character_id",
            "ix_world_import_attachments_setting_id",
            "ix_world_import_attachments_lobby_id",
        ):
            if idx in _index_names(inspector, _ATTACHMENTS):
                op.drop_index(idx, table_name=_ATTACHMENTS)
        op.drop_table(_ATTACHMENTS)

    if "characters" in existing:
        inspector = sa.inspect(bind)
        uqs = _uq_names(inspector, "characters")
        if "uq_characters_setting_import_key" in uqs:
            op.drop_constraint(
                "uq_characters_setting_import_key",
                "characters",
                type_="unique",
            )
        idxs = _index_names(inspector, "characters")
        for idx in (
            "ix_characters_assigned_user_id",
            "ix_characters_imported_setting_id",
        ):
            if idx in idxs:
                op.drop_index(idx, table_name="characters")
        cols = _column_names(inspector, "characters")
        for col_name, _ in reversed(_CHAR_COLS):
            if col_name in cols:
                op.drop_column("characters", col_name)
