"""seed race data effects 2014 + missing PHB races

Revision ID: d041e5f2a3b4
Revises: c930b1c2d3e4
Create Date: 2026-10-06 10:20:00.000000

"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d041e5f2a3b4"
down_revision: Union[str, Sequence[str], None] = "c930b1c2d3e4"
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

RACE_DATA: dict[str, dict] = {
    "human": {
        "speed": 30,
        "size": "medium",
        "darkvision": 0,
        "ability_bonuses": {"str": 1, "dex": 1, "con": 1, "int": 1, "wis": 1, "cha": 1},
        "languages": ["Общий"],
        "languages_choose": 1,
        "traits_text": (
            "Человек (2014): +1 ко всем характеристикам. "
            "Дополнительный язык на выбор. Скорость 30 фт."
        ),
    },
    "elf": {
        "speed": 30,
        "size": "medium",
        "darkvision": 60,
        "ability_bonuses": {"dex": 2},
        "languages": ["Общий", "Эльфийский"],
        "languages_choose": 0,
        "traits_text": (
            "Эльф (2014): +2 Ловкость. Тёмное зрение 60 фт. "
            "Наследие фей (преимущество к спасброскам от очарования, магия не усыпляет). "
            "Транс. Острое чутьё (владение Внимательностью)."
        ),
    },
    "dwarf": {
        "speed": 25,
        "size": "medium",
        "darkvision": 60,
        "ability_bonuses": {"con": 2},
        "languages": ["Общий", "Дварфийский"],
        "languages_choose": 0,
        "traits_text": (
            "Дварф (2014): +2 Телосложение. Тёмное зрение 60 фт. "
            "Скорость 25 фт (не снижается тяжёлым доспехом). "
            "Устойчивость к яду. Владение боевыми топорами, ручными топорами, "
            "лёгкими и боевыми молотами. Инструменты камнетёса/кузнеца/пивовара (выбор)."
        ),
    },
    "orc": {
        "speed": 30,
        "size": "medium",
        "darkvision": 60,
        "ability_bonuses": {"str": 2, "con": 1},
        "languages": ["Общий", "Орочий"],
        "languages_choose": 0,
        "traits_text": (
            "Орк (упрощ. 2014): +2 Сила, +1 Телосложение. Тёмное зрение 60 фт. "
            "Угрожающий вид (владение Запугиванием). Непреклонная выносливость / "
            "свирепые атаки — по согласованию со столом."
        ),
    },
    "dragonborn": {
        "speed": 30,
        "size": "medium",
        "darkvision": 0,
        "ability_bonuses": {"str": 2, "cha": 1},
        "languages": ["Общий", "Драконий"],
        "languages_choose": 0,
        "traits_text": (
            "Драконорожденный (2014): +2 Сила, +1 Харизма. "
            "Драконье происхождение (сопротивление + дыхание по типу предка). "
            "Скорость 30 фт."
        ),
    },
    "halfling": {
        "speed": 25,
        "size": "small",
        "darkvision": 0,
        "ability_bonuses": {"dex": 2},
        "languages": ["Общий", "Полуросликов"],
        "languages_choose": 0,
        "traits_text": (
            "Полурослик (2014): +2 Ловкость. Скорость 25 фт. "
            "Удачливый (переброс 1 на d20). Храбрый. Полуросличья ловкость "
            "(проходит через пространство существа большего размера)."
        ),
    },
    "gnome": {
        "speed": 25,
        "size": "small",
        "darkvision": 60,
        "ability_bonuses": {"int": 2},
        "languages": ["Общий", "Гномий"],
        "languages_choose": 0,
        "traits_text": (
            "Гном (2014): +2 Интеллект. Тёмное зрение 60 фт. Скорость 25 фт. "
            "Гномья хитрость (преимущество к спасброскам Интеллекта, Мудрости и Харизмы от магии)."
        ),
    },
    "half_elf": {
        "speed": 30,
        "size": "medium",
        "darkvision": 60,
        "ability_bonuses": {"cha": 2},
        "languages": ["Общий", "Эльфийский"],
        "languages_choose": 1,
        "traits_text": (
            "Полуэльф (2014): +2 Харизма и +1 к двум другим характеристикам (вручную). "
            "Тёмное зрение 60 фт. Наследие фей. Два навыка на выбор. "
            "Дополнительный язык на выбор."
        ),
    },
    "half_orc": {
        "speed": 30,
        "size": "medium",
        "darkvision": 60,
        "ability_bonuses": {"str": 2, "con": 1},
        "languages": ["Общий", "Орочий"],
        "languages_choose": 0,
        "traits_text": (
            "Полуорк (2014): +2 Сила, +1 Телосложение. Тёмное зрение 60 фт. "
            "Угрожающий вид. Непреклонная выносливость. Свирепые атаки."
        ),
    },
    "tiefling": {
        "speed": 30,
        "size": "medium",
        "darkvision": 60,
        "ability_bonuses": {"cha": 2, "int": 1},
        "languages": ["Общий", "Инфернальный"],
        "languages_choose": 0,
        "traits_text": (
            "Тифлинг (2014): +2 Харизма, +1 Интеллект. Тёмное зрение 60 фт. "
            "Сопротивление огню. Адское сопротивление / наследие Преисподней "
            "(заговоры и заклинания — по таблице)."
        ),
    },
}

NEW_RACES = [
    ("11111111-1111-4111-8111-111111111106", "halfling", "Полурослик", "Halfling", 40),
    ("11111111-1111-4111-8111-111111111107", "gnome", "Гном", "Gnome", 50),
    ("11111111-1111-4111-8111-111111111108", "half_elf", "Полуэльф", "Half-Elf", 60),
    ("11111111-1111-4111-8111-111111111109", "half_orc", "Полуорк", "Half-Orc", 70),
    ("11111111-1111-4111-8111-111111111110", "tiefling", "Тифлинг", "Tiefling", 80),
]

SORT_UPDATES = {
    "human": 10,
    "dwarf": 20,
    "elf": 30,
    "halfling": 40,
    "gnome": 50,
    "half_elf": 60,
    "half_orc": 70,
    "tiefling": 80,
    "dragonborn": 90,
    "orc": 100,
}


def upgrade() -> None:
    conn = op.get_bind()
    for slug, data in RACE_DATA.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    sort_order = COALESCE(:sort_order, sort_order),
                    updated_at = now()
                WHERE kind = 'race'
                  AND rules_edition = '2014'
                  AND slug = :slug
                """
            ),
            {
                "slug": slug,
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": SORT_UPDATES.get(slug),
            },
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

    existing = {
        row[0]
        for row in conn.execute(
            sa.text(
                """
                SELECT slug FROM catalog_entries
                WHERE kind = 'race' AND rules_edition = '2014'
                """
            )
        )
    }

    rows = []
    for entry_id, slug, name_ru, name_en, sort_order in NEW_RACES:
        if slug in existing:
            continue
        rows.append(
            {
                "id": entry_id,
                "kind": "race",
                "slug": slug,
                "name_ru": name_ru,
                "name_en": name_en,
                "rules_edition": "2014",
                "parent_id": None,
                "source": "manual",
                "external_ref": None,
                "data": RACE_DATA[slug],
                "sort_order": sort_order,
                "is_active": True,
            }
        )
    if rows:
        op.bulk_insert(catalog_entries, rows)


def downgrade() -> None:
    conn = op.get_bind()
    for slug in RACE_DATA:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = '{}'::jsonb, updated_at = now()
                WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
                """
            ),
            {"slug": slug},
        )
    for _, slug, *_ in NEW_RACES:
        conn.execute(
            sa.text(
                """
                DELETE FROM catalog_entries
                WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
                """
            ),
            {"slug": slug},
        )
