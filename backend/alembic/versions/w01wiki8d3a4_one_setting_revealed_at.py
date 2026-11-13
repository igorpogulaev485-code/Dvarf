"""W-01: settings.is_extra + setting_pages.revealed_at; orphan world_notes → note.

Revision ID: w01wiki8d3a4
Revises: l16start7c4e2
Create Date: 2026-11-13

- settings.is_extra (bool, default false) — лишние сеттинги до корзины W-02.
- setting_pages.revealed_at (timestamptz, nullable); уже раскрытые → updated_at.
- Хвост world_notes, которого нет ни в одной странице, → корневая note «Заметки мира».
- Без уникального индекса и без захардкоженных id (B-08).
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "w01wiki8d3a4"
down_revision: Union[str, Sequence[str], None] = "l16start7c4e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

IS_EXTRA = "is_extra"
REVEALED_AT = "revealed_at"


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_column(bind, "settings", IS_EXTRA):
        op.add_column(
            "settings",
            sa.Column(
                IS_EXTRA,
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if not _has_column(bind, "setting_pages", REVEALED_AT):
        op.add_column(
            "setting_pages",
            sa.Column(REVEALED_AT, sa.DateTime(timezone=True), nullable=True),
        )

    # Уже раскрытые: лучшего момента нет — берём updated_at.
    bind.execute(
        sa.text(
            f"""
            UPDATE setting_pages
            SET {REVEALED_AT} = updated_at
            WHERE revealed IS TRUE
              AND {REVEALED_AT} IS NULL
            """
        )
    )

    # Хвосты world_notes, которых нет ни в одной странице сеттинга.
    rows = bind.execute(
        sa.text(
            """
            SELECT id, COALESCE(world_notes, '')
            FROM settings
            WHERE TRIM(COALESCE(world_notes, '')) <> ''
            """
        )
    ).fetchall()
    for setting_id, notes in rows:
        body = notes or ""
        found = bind.execute(
            sa.text(
                """
                SELECT 1 FROM setting_pages
                WHERE setting_id = :sid AND body = :body
                LIMIT 1
                """
            ),
            {"sid": setting_id, "body": body},
        ).fetchone()
        if found:
            continue
        max_sort = bind.execute(
            sa.text(
                """
                SELECT COALESCE(MAX(sort_order), -1)
                FROM setting_pages
                WHERE setting_id = :sid AND parent_id IS NULL
                """
            ),
            {"sid": setting_id},
        ).fetchone()
        sort_order = int(max_sort[0]) + 1 if max_sort else 0
        bind.execute(
            sa.text(
                """
                INSERT INTO setting_pages
                  (id, setting_id, parent_id, title, body, gm_body, sort_order,
                   revealed, page_kind, fields, tags)
                VALUES
                  (:id, :sid, NULL, 'Заметки мира', :body, '', :sort,
                   false, 'note', '{}'::jsonb, ARRAY[]::varchar[])
                """
            ),
            {
                "id": uuid.uuid4(),
                "sid": setting_id,
                "body": body,
                "sort": sort_order,
            },
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_column(bind, "setting_pages", REVEALED_AT):
        op.drop_column("setting_pages", REVEALED_AT)
    if _has_column(bind, "settings", IS_EXTRA):
        op.drop_column("settings", IS_EXTRA)
