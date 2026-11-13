"""L-06: journal drafts, chapter_id, media_id.

Revision ID: l06journ4c8e2
Revises: l05notes9a1b2
Create Date: 2026-11-13

- is_draft: master-only until published (existing rows = published)
- chapter_id: optional parent chapter entry
- media_id: lobby_media attachment for journal images
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "l06journ4c8e2"
down_revision: Union[str, Sequence[str], None] = "l05notes9a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_CHAPTER = "fk_campaign_journal_entries_chapter_id"
FK_MEDIA = "fk_campaign_journal_entries_media_id"
IX_CHAPTER = "ix_campaign_journal_entries_chapter_id"
IX_MEDIA = "ix_campaign_journal_entries_media_id"
IX_DRAFT = "ix_campaign_journal_entries_is_draft"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "campaign_journal_entries" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("campaign_journal_entries")}
    fks = {fk["name"] for fk in inspector.get_foreign_keys("campaign_journal_entries")}
    indexes = {ix["name"] for ix in inspector.get_indexes("campaign_journal_entries")}

    if "is_draft" not in cols:
        op.add_column(
            "campaign_journal_entries",
            sa.Column(
                "is_draft",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )
        cols.add("is_draft")
    if IX_DRAFT not in indexes:
        op.create_index(IX_DRAFT, "campaign_journal_entries", ["is_draft"], unique=False)
        indexes.add(IX_DRAFT)

    if "chapter_id" not in cols:
        op.add_column(
            "campaign_journal_entries",
            sa.Column(
                "chapter_id",
                postgresql.UUID(as_uuid=True),
                nullable=True,
            ),
        )
        cols.add("chapter_id")
    if FK_CHAPTER not in fks:
        op.create_foreign_key(
            FK_CHAPTER,
            "campaign_journal_entries",
            "campaign_journal_entries",
            ["chapter_id"],
            ["id"],
            ondelete="SET NULL",
        )
        fks.add(FK_CHAPTER)
    if IX_CHAPTER not in indexes:
        op.create_index(IX_CHAPTER, "campaign_journal_entries", ["chapter_id"], unique=False)
        indexes.add(IX_CHAPTER)

    if "media_id" not in cols:
        op.add_column(
            "campaign_journal_entries",
            sa.Column(
                "media_id",
                postgresql.UUID(as_uuid=True),
                nullable=True,
            ),
        )
        cols.add("media_id")
    if "lobby_media" in tables and FK_MEDIA not in fks:
        op.create_foreign_key(
            FK_MEDIA,
            "campaign_journal_entries",
            "lobby_media",
            ["media_id"],
            ["id"],
            ondelete="SET NULL",
        )
        fks.add(FK_MEDIA)
    if IX_MEDIA not in indexes:
        op.create_index(IX_MEDIA, "campaign_journal_entries", ["media_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "campaign_journal_entries" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("campaign_journal_entries")}
    fks = {fk["name"] for fk in inspector.get_foreign_keys("campaign_journal_entries")}
    indexes = {ix["name"] for ix in inspector.get_indexes("campaign_journal_entries")}

    if FK_MEDIA in fks:
        op.drop_constraint(FK_MEDIA, "campaign_journal_entries", type_="foreignkey")
    if IX_MEDIA in indexes:
        op.drop_index(IX_MEDIA, table_name="campaign_journal_entries")
    if "media_id" in cols:
        op.drop_column("campaign_journal_entries", "media_id")

    if FK_CHAPTER in fks:
        op.drop_constraint(FK_CHAPTER, "campaign_journal_entries", type_="foreignkey")
    if IX_CHAPTER in indexes:
        op.drop_index(IX_CHAPTER, table_name="campaign_journal_entries")
    if "chapter_id" in cols:
        op.drop_column("campaign_journal_entries", "chapter_id")

    if IX_DRAFT in indexes:
        op.drop_index(IX_DRAFT, table_name="campaign_journal_entries")
    if "is_draft" in cols:
        op.drop_column("campaign_journal_entries", "is_draft")
