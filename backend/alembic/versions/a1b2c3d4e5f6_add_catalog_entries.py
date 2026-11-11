"""add catalog_entries with race/class seed

Revision ID: a1b2c3d4e5f6
Revises: 7e7ba8bf7ec1
Create Date: 2026-10-05 19:15:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "7e7ba8bf7ec1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

catalog_kind = postgresql.ENUM(
    "race",
    "class",
    "subclass",
    "background",
    "alignment",
    "skill",
    "feat",
    "spell",
    "weapon",
    "armor",
    "item",
    "condition",
    name="catalog_kind",
    create_type=False,
)
catalog_rules_edition = postgresql.ENUM(
    "2014",
    "2024",
    "both",
    name="catalog_rules_edition",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(
        "race",
        "class",
        "subclass",
        "background",
        "alignment",
        "skill",
        "feat",
        "spell",
        "weapon",
        "armor",
        "item",
        "condition",
        name="catalog_kind",
    ).create(bind, checkfirst=True)
    postgresql.ENUM(
        "2014",
        "2024",
        "both",
        name="catalog_rules_edition",
    ).create(bind, checkfirst=True)

    op.create_table(
        "catalog_entries",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("kind", catalog_kind, nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("name_ru", sa.String(length=160), nullable=False),
        sa.Column("name_en", sa.String(length=160), nullable=True),
        sa.Column("rules_edition", catalog_rules_edition, nullable=False),
        sa.Column("parent_id", sa.UUID(), nullable=True),
        sa.Column("source", sa.String(length=80), nullable=True),
        sa.Column("external_ref", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
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
        sa.ForeignKeyConstraint(["parent_id"], ["catalog_entries.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "kind",
            "slug",
            "rules_edition",
            name="uq_catalog_entries_kind_slug_edition",
        ),
    )
    op.create_index(
        op.f("ix_catalog_entries_parent_id"),
        "catalog_entries",
        ["parent_id"],
        unique=False,
    )
    op.create_index(
        "ix_catalog_entries_kind_edition_active",
        "catalog_entries",
        ["kind", "rules_edition", "is_active"],
        unique=False,
    )

    seed_rows = [
        # races 2014
        ("11111111-1111-4111-8111-111111111101", "race", "human", "Человек", "Human", 10),
        ("11111111-1111-4111-8111-111111111102", "race", "elf", "Эльф", "Elf", 20),
        ("11111111-1111-4111-8111-111111111103", "race", "dwarf", "Дварф", "Dwarf", 30),
        ("11111111-1111-4111-8111-111111111104", "race", "orc", "Орк", "Orc", 40),
        (
            "11111111-1111-4111-8111-111111111105",
            "race",
            "dragonborn",
            "Драконорожденный",
            "Dragonborn",
            50,
        ),
        # classes 2014
        ("22222222-2222-4222-8222-222222222201", "class", "rogue", "Плут", "Rogue", 10),
        (
            "22222222-2222-4222-8222-222222222202",
            "class",
            "barbarian",
            "Варвар",
            "Barbarian",
            20,
        ),
        (
            "22222222-2222-4222-8222-222222222203",
            "class",
            "paladin",
            "Паладин",
            "Paladin",
            30,
        ),
    ]

    catalog_entries = sa.table(
        "catalog_entries",
        sa.column("id", sa.UUID()),
        sa.column("kind", catalog_kind),
        sa.column("slug", sa.String()),
        sa.column("name_ru", sa.String()),
        sa.column("name_en", sa.String()),
        sa.column("rules_edition", catalog_rules_edition),
        sa.column("parent_id", sa.UUID()),
        sa.column("source", sa.String()),
        sa.column("external_ref", postgresql.JSONB()),
        sa.column("data", postgresql.JSONB()),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
    )

    op.bulk_insert(
        catalog_entries,
        [
            {
                "id": entry_id,
                "kind": kind,
                "slug": slug,
                "name_ru": name_ru,
                "name_en": name_en,
                "rules_edition": "2014",
                "parent_id": None,
                "source": "manual",
                "external_ref": None,
                "data": {},
                "sort_order": sort_order,
                "is_active": True,
            }
            for entry_id, kind, slug, name_ru, name_en, sort_order in seed_rows
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_catalog_entries_kind_edition_active", table_name="catalog_entries")
    op.drop_index(op.f("ix_catalog_entries_parent_id"), table_name="catalog_entries")
    op.drop_table("catalog_entries")
    bind = op.get_bind()
    postgresql.ENUM(name="catalog_rules_edition").drop(bind, checkfirst=True)
    postgresql.ENUM(name="catalog_kind").drop(bind, checkfirst=True)
