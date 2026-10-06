"""seed sample 2014 spells for sheet picker

Revision ID: e5f6071829a0
Revises: d4e5f6071829
Create Date: 2026-10-06 05:15:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e5f6071829a0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6071829"
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

    spells = [
        (
            "66666666-6666-4666-8666-666666666601",
            "sacred_flame",
            "Священное пламя",
            "Sacred Flame",
            10,
            {
                "level": 0,
                "school": "evocation",
                "casting_time": "Д",
                "range": "60 футов",
                "attack_or_save": "ЛОВ",
                "damage": "1d8",
                "concentration": False,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666602",
            "guidance",
            "Указание",
            "Guidance",
            20,
            {
                "level": 0,
                "school": "divination",
                "casting_time": "Д",
                "range": "касание",
                "attack_or_save": "—",
                "damage": "1d4",
                "concentration": True,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666603",
            "toll_the_dead",
            "Погребальный звон",
            "Toll the Dead",
            30,
            {
                "level": 0,
                "school": "necromancy",
                "casting_time": "Д",
                "range": "60 футов",
                "attack_or_save": "МУД",
                "damage": "1d8/1d12",
                "concentration": False,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666604",
            "cure_wounds",
            "Лечение ран",
            "Cure Wounds",
            40,
            {
                "level": 1,
                "school": "evocation",
                "casting_time": "Д",
                "range": "касание",
                "attack_or_save": "—",
                "damage": "1d8+мод",
                "concentration": False,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666605",
            "healing_word",
            "Лечащее слово",
            "Healing Word",
            50,
            {
                "level": 1,
                "school": "evocation",
                "casting_time": "БД",
                "range": "60 футов",
                "attack_or_save": "—",
                "damage": "1d4+мод",
                "concentration": False,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666606",
            "guiding_bolt",
            "Направленный снаряд",
            "Guiding Bolt",
            60,
            {
                "level": 1,
                "school": "evocation",
                "casting_time": "Д",
                "range": "120 футов",
                "attack_or_save": "атака",
                "damage": "4d6",
                "concentration": False,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666607",
            "shield_of_faith",
            "Щит веры",
            "Shield of Faith",
            70,
            {
                "level": 1,
                "school": "abjuration",
                "casting_time": "БД",
                "range": "60 футов",
                "attack_or_save": "—",
                "damage": "+2 КД",
                "concentration": True,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666608",
            "bless",
            "Благословение",
            "Bless",
            80,
            {
                "level": 1,
                "school": "enchantment",
                "casting_time": "Д",
                "range": "30 футов",
                "attack_or_save": "—",
                "damage": "1d4",
                "concentration": True,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666609",
            "magic_missile",
            "Волшебная стрела",
            "Magic Missile",
            90,
            {
                "level": 1,
                "school": "evocation",
                "casting_time": "Д",
                "range": "120 футов",
                "attack_or_save": "авто",
                "damage": "1d4+1×3",
                "concentration": False,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666610",
            "shield",
            "Щит",
            "Shield",
            100,
            {
                "level": 1,
                "school": "abjuration",
                "casting_time": "Р",
                "range": "на себя",
                "attack_or_save": "—",
                "damage": "+5 КД",
                "concentration": False,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666611",
            "misty_step",
            "Туманный шаг",
            "Misty Step",
            110,
            {
                "level": 2,
                "school": "conjuration",
                "casting_time": "БД",
                "range": "на себя",
                "attack_or_save": "—",
                "damage": "телепорт 30фт",
                "concentration": False,
            },
        ),
        (
            "66666666-6666-4666-8666-666666666612",
            "hold_person",
            "Удержание личности",
            "Hold Person",
            120,
            {
                "level": 2,
                "school": "enchantment",
                "casting_time": "Д",
                "range": "60 футов",
                "attack_or_save": "МУД",
                "damage": "паралич",
                "concentration": True,
            },
        ),
    ]

    op.bulk_insert(
        catalog_entries,
        [
            {
                "id": row[0],
                "kind": "spell",
                "slug": row[1],
                "name_ru": row[2],
                "name_en": row[3],
                "rules_edition": "2014",
                "parent_id": None,
                "source": "SRD 5.1 (sample)",
                "external_ref": None,
                "data": row[5],
                "sort_order": row[4],
                "is_active": True,
            }
            for row in spells
        ],
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'spell'
              AND slug IN (
                'sacred_flame', 'guidance', 'toll_the_dead', 'cure_wounds',
                'healing_word', 'guiding_bolt', 'shield_of_faith', 'bless',
                'magic_missile', 'shield', 'misty_step', 'hold_person'
              )
            """
        )
    )
