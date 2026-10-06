"""seed 2014 weapon catalog entries

Revision ID: b2c3d4e5f607
Revises: a1b2c3d4e5f6
Create Date: 2026-10-06 01:10:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f607"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
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

    weapons = [
        (
            "33333333-3333-4333-8333-333333333301",
            "dagger",
            "Кинжал",
            "Dagger",
            10,
            {"ability": "dex", "damage": "1d4", "damage_type": "колющий", "category": "simple", "finesse": True},
        ),
        (
            "33333333-3333-4333-8333-333333333302",
            "mace",
            "Булава",
            "Mace",
            20,
            {"ability": "str", "damage": "1d6", "damage_type": "дробящий", "category": "simple"},
        ),
        (
            "33333333-3333-4333-8333-333333333303",
            "quarterstaff",
            "Боевой посох",
            "Quarterstaff",
            30,
            {"ability": "str", "damage": "1d6", "damage_type": "дробящий", "category": "simple"},
        ),
        (
            "33333333-3333-4333-8333-333333333304",
            "handaxe",
            "Ручной топор",
            "Handaxe",
            40,
            {"ability": "str", "damage": "1d6", "damage_type": "рубящий", "category": "simple"},
        ),
        (
            "33333333-3333-4333-8333-333333333305",
            "javelin",
            "Метательное копье",
            "Javelin",
            50,
            {"ability": "str", "damage": "1d6", "damage_type": "колющий", "category": "simple"},
        ),
        (
            "33333333-3333-4333-8333-333333333306",
            "warhammer",
            "Боевой молот",
            "Warhammer",
            60,
            {"ability": "str", "damage": "1d8", "damage_type": "дробящий", "category": "martial"},
        ),
        (
            "33333333-3333-4333-8333-333333333307",
            "longsword",
            "Длинный меч",
            "Longsword",
            70,
            {"ability": "str", "damage": "1d8", "damage_type": "рубящий", "category": "martial"},
        ),
        (
            "33333333-3333-4333-8333-333333333308",
            "shortsword",
            "Короткий меч",
            "Shortsword",
            80,
            {"ability": "dex", "damage": "1d6", "damage_type": "колющий", "category": "martial", "finesse": True},
        ),
        (
            "33333333-3333-4333-8333-333333333309",
            "light_crossbow",
            "Арбалет, лёгкий",
            "Light Crossbow",
            90,
            {"ability": "dex", "damage": "1d8", "damage_type": "колющий", "category": "simple", "ranged": True},
        ),
        (
            "33333333-3333-4333-8333-333333333310",
            "shortbow",
            "Короткий лук",
            "Shortbow",
            100,
            {"ability": "dex", "damage": "1d6", "damage_type": "колющий", "category": "simple", "ranged": True},
        ),
    ]

    op.bulk_insert(
        catalog_entries,
        [
            {
                "id": entry_id,
                "kind": "weapon",
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
            for entry_id, slug, name_ru, name_en, sort_order, data in weapons
        ],
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM catalog_entries WHERE id IN ("
            "'33333333-3333-4333-8333-333333333301',"
            "'33333333-3333-4333-8333-333333333302',"
            "'33333333-3333-4333-8333-333333333303',"
            "'33333333-3333-4333-8333-333333333304',"
            "'33333333-3333-4333-8333-333333333305',"
            "'33333333-3333-4333-8333-333333333306',"
            "'33333333-3333-4333-8333-333333333307',"
            "'33333333-3333-4333-8333-333333333308',"
            "'33333333-3333-4333-8333-333333333309',"
            "'33333333-3333-4333-8333-333333333310'"
            ")"
        )
    )
