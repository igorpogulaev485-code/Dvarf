"""expand spell seed for grimoire; add class tags

Revision ID: f6071829a0b1
Revises: e5f6071829a0
Create Date: 2026-10-06 05:45:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f6071829a0b1"
down_revision: Union[str, Sequence[str], None] = "e5f6071829a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

catalog_kind = postgresql.ENUM(name="catalog_kind", create_type=False)
catalog_rules_edition = postgresql.ENUM(name="catalog_rules_edition", create_type=False)

EXISTING_CLASSES = {
    "sacred_flame": ["cleric"],
    "guidance": ["cleric", "druid"],
    "toll_the_dead": ["cleric", "warlock", "wizard"],
    "cure_wounds": ["bard", "cleric", "druid", "paladin", "ranger"],
    "healing_word": ["bard", "cleric"],
    "guiding_bolt": ["cleric"],
    "shield_of_faith": ["cleric", "paladin"],
    "bless": ["cleric", "paladin"],
    "magic_missile": ["sorcerer", "wizard"],
    "shield": ["sorcerer", "wizard"],
    "misty_step": ["sorcerer", "warlock", "wizard"],
    "hold_person": ["bard", "cleric", "druid", "sorcerer", "warlock", "wizard"],
}

NEW_SPELLS = [
    (
        "66666666-6666-4666-8666-666666666613",
        "fire_bolt",
        "Огненный снаряд",
        "Fire Bolt",
        130,
        {
            "level": 0,
            "school": "evocation",
            "casting_time": "Д",
            "range": "120 футов",
            "attack_or_save": "атака",
            "damage": "1d10",
            "concentration": False,
            "classes": ["sorcerer", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666614",
        "eldritch_blast",
        "Мистический заряд",
        "Eldritch Blast",
        140,
        {
            "level": 0,
            "school": "evocation",
            "casting_time": "Д",
            "range": "120 футов",
            "attack_or_save": "атака",
            "damage": "1d10",
            "concentration": False,
            "classes": ["warlock"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666615",
        "vicious_mockery",
        "Злая насмешка",
        "Vicious Mockery",
        150,
        {
            "level": 0,
            "school": "enchantment",
            "casting_time": "Д",
            "range": "60 футов",
            "attack_or_save": "МУД",
            "damage": "1d4",
            "concentration": False,
            "classes": ["bard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666616",
        "druidcraft",
        "Друидизм",
        "Druidcraft",
        160,
        {
            "level": 0,
            "school": "transmutation",
            "casting_time": "Д",
            "range": "30 футов",
            "attack_or_save": "—",
            "damage": "утилита",
            "concentration": False,
            "classes": ["druid"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666617",
        "mage_armor",
        "Доспехи мага",
        "Mage Armor",
        170,
        {
            "level": 1,
            "school": "abjuration",
            "casting_time": "Д",
            "range": "касание",
            "attack_or_save": "—",
            "damage": "КД 13+ЛОВ",
            "concentration": False,
            "classes": ["sorcerer", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666618",
        "detect_magic",
        "Обнаружение магии",
        "Detect Magic",
        180,
        {
            "level": 1,
            "school": "divination",
            "casting_time": "Д",
            "range": "на себя",
            "attack_or_save": "—",
            "damage": "ритуал",
            "concentration": True,
            "classes": ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666619",
        "charm_person",
        "Очарование личности",
        "Charm Person",
        190,
        {
            "level": 1,
            "school": "enchantment",
            "casting_time": "Д",
            "range": "30 футов",
            "attack_or_save": "МУД",
            "damage": "очарование",
            "concentration": False,
            "classes": ["bard", "druid", "sorcerer", "warlock", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666620",
        "sleep",
        "Усыпление",
        "Sleep",
        200,
        {
            "level": 1,
            "school": "enchantment",
            "casting_time": "Д",
            "range": "90 футов",
            "attack_or_save": "—",
            "damage": "5d8 HP",
            "concentration": False,
            "classes": ["bard", "sorcerer", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666621",
        "thunderwave",
        "Волна грома",
        "Thunderwave",
        210,
        {
            "level": 1,
            "school": "evocation",
            "casting_time": "Д",
            "range": "на себя (15фт куб)",
            "attack_or_save": "ТЕЛ",
            "damage": "2d8",
            "concentration": False,
            "classes": ["bard", "druid", "sorcerer", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666622",
        "faerie_fire",
        "Огонь фей",
        "Faerie Fire",
        220,
        {
            "level": 1,
            "school": "evocation",
            "casting_time": "Д",
            "range": "60 футов",
            "attack_or_save": "ЛОВ",
            "damage": "подсветка",
            "concentration": True,
            "classes": ["bard", "druid"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666623",
        "hex",
        "Сглаз",
        "Hex",
        230,
        {
            "level": 1,
            "school": "enchantment",
            "casting_time": "БД",
            "range": "90 футов",
            "attack_or_save": "—",
            "damage": "1d6 некрот.",
            "concentration": True,
            "classes": ["warlock"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666624",
        "hunter_mark",
        "Метка охотника",
        "Hunter's Mark",
        240,
        {
            "level": 1,
            "school": "divination",
            "casting_time": "БД",
            "range": "90 футов",
            "attack_or_save": "—",
            "damage": "1d6",
            "concentration": True,
            "classes": ["ranger"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666625",
        "scorching_ray",
        "Палящий луч",
        "Scorching Ray",
        250,
        {
            "level": 2,
            "school": "evocation",
            "casting_time": "Д",
            "range": "120 футов",
            "attack_or_save": "атака",
            "damage": "2d6×3",
            "concentration": False,
            "classes": ["sorcerer", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666626",
        "invisibility",
        "Невидимость",
        "Invisibility",
        260,
        {
            "level": 2,
            "school": "illusion",
            "casting_time": "Д",
            "range": "касание",
            "attack_or_save": "—",
            "damage": "невидимость",
            "concentration": True,
            "classes": ["bard", "sorcerer", "warlock", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666627",
        "spiritual_weapon",
        "Духовное оружие",
        "Spiritual Weapon",
        270,
        {
            "level": 2,
            "school": "evocation",
            "casting_time": "БД",
            "range": "60 футов",
            "attack_or_save": "атака",
            "damage": "1d8+мод",
            "concentration": False,
            "classes": ["cleric"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666628",
        "lesser_restoration",
        "Малое восстановление",
        "Lesser Restoration",
        280,
        {
            "level": 2,
            "school": "abjuration",
            "casting_time": "Д",
            "range": "касание",
            "attack_or_save": "—",
            "damage": "снятие состояния",
            "concentration": False,
            "classes": ["bard", "cleric", "druid", "paladin", "ranger"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666629",
        "web",
        "Паутина",
        "Web",
        290,
        {
            "level": 2,
            "school": "conjuration",
            "casting_time": "Д",
            "range": "60 футов",
            "attack_or_save": "ЛОВ",
            "damage": "опутывание",
            "concentration": True,
            "classes": ["sorcerer", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666630",
        "fireball",
        "Огненный шар",
        "Fireball",
        300,
        {
            "level": 3,
            "school": "evocation",
            "casting_time": "Д",
            "range": "150 футов",
            "attack_or_save": "ЛОВ",
            "damage": "8d6",
            "concentration": False,
            "classes": ["sorcerer", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666631",
        "counterspell",
        "Контрзаклинание",
        "Counterspell",
        310,
        {
            "level": 3,
            "school": "abjuration",
            "casting_time": "Р",
            "range": "60 футов",
            "attack_or_save": "—",
            "damage": "отмена",
            "concentration": False,
            "classes": ["sorcerer", "warlock", "wizard"],
        },
    ),
    (
        "66666666-6666-4666-8666-666666666632",
        "revivify",
        "Оживление",
        "Revivify",
        320,
        {
            "level": 3,
            "school": "necromancy",
            "casting_time": "Д",
            "range": "касание",
            "attack_or_save": "—",
            "damage": "воскрешение",
            "concentration": False,
            "classes": ["cleric", "paladin"],
        },
    ),
]


def upgrade() -> None:
    import json

    conn = op.get_bind()
    for slug, classes in EXISTING_CLASSES.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = COALESCE(data, '{}'::jsonb) || CAST(:payload AS jsonb)
                WHERE kind = 'spell' AND slug = :slug
                """
            ),
            {"slug": slug, "payload": json.dumps({"classes": classes})},
        )

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
            for row in NEW_SPELLS
        ],
    )


def downgrade() -> None:
    conn = op.get_bind()
    slugs = [row[1] for row in NEW_SPELLS]
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'spell' AND slug IN :slugs
            """.replace(
                "IN :slugs",
                "IN (" + ", ".join(f"'{s}'" for s in slugs) + ")",
            )
        )
    )
    for slug in EXISTING_CLASSES:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = data - 'classes'
                WHERE kind = 'spell' AND slug = :slug
                """
            ),
            {"slug": slug},
        )
