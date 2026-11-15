"""W-API-04: существа сеттинга + поля предметов 2014 на setting_artifacts.

Revision ID: wapi04setcrt01
Revises: wapi03idslnk01
Create Date: 2026-11-15

- setting_creatures: приватный бестиарий мира (не catalog_entries).
- setting_artifacts: item_kind / rules_edition / import_key.
- world_source_keys.creature_id — связь ключа импорта с существом.
- Existing lobbies/settings/wiki untouched beyond empty new columns.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "wapi04setcrt01"
down_revision: Union[str, Sequence[str], None] = "wapi03idslnk01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_CREATURES_TABLE = "setting_creatures"
_ARTIFACT_COLS = (
    ("item_kind", sa.String(16), "magic"),
    ("rules_edition", sa.String(16), "2014"),
    ("import_key", sa.String(128), None),
)


def _column_names(inspector: sa.Inspector, table: str) -> set[str]:
    if table not in set(inspector.get_table_names()):
        return set()
    return {c["name"] for c in inspector.get_columns(table)}


def _index_names(inspector: sa.Inspector, table: str) -> set[str]:
    if table not in set(inspector.get_table_names()):
        return set()
    return {i["name"] for i in inspector.get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if _CREATURES_TABLE not in existing:
        op.create_table(
            _CREATURES_TABLE,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "setting_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("settings.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("name", sa.String(120), nullable=False, server_default=""),
            sa.Column("import_key", sa.String(128), nullable=False, server_default=""),
            sa.Column(
                "rules_edition",
                sa.String(16),
                nullable=False,
                server_default="2014",
            ),
            sa.Column("source", sa.String(16), nullable=False, server_default="master"),
            sa.Column(
                "data",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column(
                "incomplete",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column(
                "incompleteness_notes",
                sa.Text(),
                nullable=False,
                server_default="",
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
                "import_key",
                name="uq_setting_creatures_setting_import_key",
            ),
        )
        op.create_index(
            "ix_setting_creatures_setting_id",
            _CREATURES_TABLE,
            ["setting_id"],
        )

    # Refresh inspector after possible create
    inspector = sa.inspect(bind)
    art_cols = _column_names(inspector, "setting_artifacts")
    if "setting_artifacts" in set(inspector.get_table_names()):
        if "item_kind" not in art_cols:
            op.add_column(
                "setting_artifacts",
                sa.Column(
                    "item_kind",
                    sa.String(16),
                    nullable=False,
                    server_default="magic",
                ),
            )
        if "rules_edition" not in art_cols:
            op.add_column(
                "setting_artifacts",
                sa.Column(
                    "rules_edition",
                    sa.String(16),
                    nullable=False,
                    server_default="2014",
                ),
            )
        if "import_key" not in art_cols:
            op.add_column(
                "setting_artifacts",
                sa.Column("import_key", sa.String(128), nullable=True),
            )
        art_idxs = _index_names(inspector, "setting_artifacts")
        if "uq_setting_artifacts_setting_import_key" not in art_idxs:
            # Partial unique: только непустые ключи (несколько NULL допустимы).
            op.create_index(
                "uq_setting_artifacts_setting_import_key",
                "setting_artifacts",
                ["setting_id", "import_key"],
                unique=True,
                postgresql_where=sa.text("import_key IS NOT NULL"),
            )

    inspector = sa.inspect(bind)
    wsk_cols = _column_names(inspector, "world_source_keys")
    if "world_source_keys" in set(inspector.get_table_names()):
        if "creature_id" not in wsk_cols:
            op.add_column(
                "world_source_keys",
                sa.Column(
                    "creature_id",
                    postgresql.UUID(as_uuid=True),
                    sa.ForeignKey("setting_creatures.id", ondelete="SET NULL"),
                    nullable=True,
                ),
            )
        idxs = _index_names(inspector, "world_source_keys")
        if "ix_world_source_keys_creature_id" not in idxs:
            op.create_index(
                "ix_world_source_keys_creature_id",
                "world_source_keys",
                ["creature_id"],
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "world_source_keys" in tables:
        idxs = _index_names(inspector, "world_source_keys")
        if "ix_world_source_keys_creature_id" in idxs:
            op.drop_index(
                "ix_world_source_keys_creature_id",
                table_name="world_source_keys",
            )
        cols = _column_names(inspector, "world_source_keys")
        if "creature_id" in cols:
            op.drop_column("world_source_keys", "creature_id")

    if "setting_artifacts" in tables:
        idxs = _index_names(inspector, "setting_artifacts")
        if "uq_setting_artifacts_setting_import_key" in idxs:
            op.drop_index(
                "uq_setting_artifacts_setting_import_key",
                table_name="setting_artifacts",
            )
        cols = _column_names(inspector, "setting_artifacts")
        for col in ("import_key", "rules_edition", "item_kind"):
            if col in cols:
                op.drop_column("setting_artifacts", col)

    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if _CREATURES_TABLE in tables:
        idxs = _index_names(inspector, _CREATURES_TABLE)
        if "ix_setting_creatures_setting_id" in idxs:
            op.drop_index(
                "ix_setting_creatures_setting_id",
                table_name=_CREATURES_TABLE,
            )
        op.drop_table(_CREATURES_TABLE)
