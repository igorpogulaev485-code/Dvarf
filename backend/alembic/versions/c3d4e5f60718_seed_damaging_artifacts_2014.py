"""seed damaging artifact items for attack picker

Revision ID: c3d4e5f60718
Revises: b2c3d4e5f607
Create Date: 2026-10-06 01:15:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c3d4e5f60718"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f607"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

catalog_kind = postgresql.ENUM(name="catalog_kind", create_type=False)
catalog_rules_edition = postgresql.ENUM(name="catalog_rules_edition", create_type=False)


def upgrade() -> None:
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

    artifacts = [
        (
            "44444444-4444-4444-8444-444444444401",
            "storm_hammer",
            "Молот бури",
            "Storm Hammer",
            10,
            {
                "ability": "str",
                "damage": "1d8",
                "damage_type": "дробящий",
                "attack_role": "artifact",
                "notes": "пример артефакта с уроном для пикера атак",
            },
        ),
        (
            "44444444-4444-4444-8444-444444444402",
            "ember_blade",
            "Пылающий клинок",
            "Ember Blade",
            20,
            {
                "ability": "str",
                "damage": "1d8",
                "damage_type": "рубящий",
                "attack_role": "artifact",
                "notes": "пример артефакта с уроном для пикера атак",
            },
        ),
        (
            "44444444-4444-4444-8444-444444444403",
            "whisper_bow",
            "Лук шёпота",
            "Whisper Bow",
            30,
            {
                "ability": "dex",
                "damage": "1d8",
                "damage_type": "колющий",
                "attack_role": "artifact",
                "ranged": True,
                "notes": "пример артефакта с уроном для пикера атак",
            },
        ),
    ]

    op.bulk_insert(
        catalog_entries,
        [
            {
                "id": entry_id,
                "kind": "item",
                "slug": slug,
                "name_ru": name_ru,
                "name_en": name_en,
                "rules_edition": "2014",
                "parent_id": None,
                "source": "manual",
                "external_ref": None,
                "data": data,
                "sort_order": sort_order,
                "is_active": True,
            }
            for entry_id, slug, name_ru, name_en, sort_order, data in artifacts
        ],
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM catalog_entries WHERE id IN ("
            "'44444444-4444-4444-8444-444444444401',"
            "'44444444-4444-4444-8444-444444444402',"
            "'44444444-4444-4444-8444-444444444403'"
            ")"
        )
    )
