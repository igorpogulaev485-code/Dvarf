"""Align catalog gear RU names, dice notation, and dedupe item∩weapon/armor.

Revision ID: s8b9c0d1e2f3
Revises: r7a8b9c0d1e2
Create Date: 2026-10-07 11:20:00.000000

Prod already has SRD weapon/armor/item rows. Schema matches sheet pickers
(damage/damage_type/ability for weapons; armor_kind/base_ac for armor), but:

1. Many mundane PHB names were still English (Rapier, Greataxe, …).
2. Damage dice used Latin ``d`` (1d8) while the sheet uses Cyrillic ``к`` (1к8).
3. SRD 5.2 also inserted the same gear again as kind=item → duplicate pickers.

This migration maps in place (no full wipe): rename + normalize + delete
redundant item rows. Magic items with empty combat fields are left alone —
they are not starting equipment and remain usable as named catalog picks.
"""

from __future__ import annotations

import json
import re
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "s8b9c0d1e2f3"
down_revision: Union[str, Sequence[str], None] = "r7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Mundane PHB weapons → RU labels used by starting equipment / weaponPresets.
WEAPON_NAME_RU: dict[str, str] = {
    "club": "Дубинка",
    "dagger": "Кинжал",
    "greatclub": "Двуручная дубина",
    "handaxe": "Ручной топор",
    "javelin": "Метательное копьё",
    "light_hammer": "Лёгкий молот",
    "mace": "Булава",
    "quarterstaff": "Боевой посох",
    "sickle": "Серп",
    "spear": "Копьё",
    "crossbow_light": "Лёгкий арбалет",
    "light_crossbow": "Лёгкий арбалет",
    "dart": "Дротик",
    "shortbow": "Короткий лук",
    "sling": "Праща",
    "battleaxe": "Боевой топор",
    "flail": "Цеп",
    "glaive": "Глефа",
    "greataxe": "Секира",
    "greatsword": "Двуручный меч",
    "halberd": "Алебарда",
    "lance": "Длинное копьё",
    "longsword": "Длинный меч",
    "maul": "Молот",
    "morningstar": "Моргенштерн",
    "pike": "Пика",
    "rapier": "Рапира",
    "scimitar": "Ятаган",
    "shortsword": "Короткий меч",
    "trident": "Трезубец",
    "war_pick": "Клевец",
    "warhammer": "Боевой молот",
    "whip": "Кнут",
    "blowgun": "Духовая трубка",
    "crossbow_hand": "Ручной арбалет",
    "hand_crossbow": "Ручной арбалет",
    "crossbow_heavy": "Тяжёлый арбалет",
    "heavy_crossbow": "Тяжёлый арбалет",
    "longbow": "Длинный лук",
    "net": "Сеть",
    "musket": "Мушкет",
    "pistol": "Пистолет",
}

ARMOR_NAME_RU: dict[str, str] = {
    "padded_armor": "Стёганый доспех",
    "leather_armor": "Кожаный доспех",
    "studded_leather_armor": "Клёпаный кожаный доспех",
    "hide_armor": "Шкурный доспех",
    "chain_shirt": "Кольчужная рубаха",
    "scale_mail": "Чешуйчатый доспех",
    "breastplate": "Кираса",
    "half_plate_armor": "Полулаты",
    "ring_mail": "Колечный доспех",
    "chain_mail": "Кольчуга",
    "splint_armor": "Наборный доспех",
    "plate_armor": "Латы",
    "shield": "Щит",
}

_DICE_D_TO_K = re.compile(r"(\d+)d(\d+)", re.IGNORECASE)


def _normalize_damage(value: Any) -> Any:
    if not isinstance(value, str) or not value.strip():
        return value
    return _DICE_D_TO_K.sub(r"\1к\2", value)


def upgrade() -> None:
    conn = op.get_bind()

    # 1) Drop redundant 2024 item rows that mirror weapon/armor by slug.
    deleted = conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries AS item
            WHERE item.kind = 'item'
              AND item.rules_edition = '2024'
              AND EXISTS (
                SELECT 1
                FROM catalog_entries AS gear
                WHERE gear.rules_edition = '2024'
                  AND gear.slug = item.slug
                  AND gear.kind IN ('weapon', 'armor')
              )
            """
        )
    )
    print(
        "dedupe 2024 item∩weapon/armor: deleted "
        f"{deleted.rowcount if deleted.rowcount is not None else -1} rows"
    )

    # 2) RU names for mundane weapons/armor (both editions).
    for slug, name_ru in WEAPON_NAME_RU.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET name_ru = :name_ru,
                    updated_at = NOW()
                WHERE kind = 'weapon'
                  AND slug = :slug
                """
            ),
            {"name_ru": name_ru, "slug": slug},
        )
    for slug, name_ru in ARMOR_NAME_RU.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET name_ru = :name_ru,
                    updated_at = NOW()
                WHERE kind = 'armor'
                  AND slug = :slug
                """
            ),
            {"name_ru": name_ru, "slug": slug},
        )

    # 3) Normalize weapon damage dice to Cyrillic «к» (1d8 → 1к8).
    rows = conn.execute(
        sa.text(
            """
            SELECT id, data
            FROM catalog_entries
            WHERE kind = 'weapon'
              AND is_active IS TRUE
            """
        )
    ).mappings()
    updated = 0
    for row in rows:
        data = dict(row["data"] or {})
        before = data.get("damage")
        after = _normalize_damage(before)
        if after == before:
            continue
        data["damage"] = after
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
        )
        updated += 1
    print(f"normalized weapon damage dice on {updated} rows")


def downgrade() -> None:
    # Name/dice changes are not reverted; deleted item rows need SRD reload.
    pass
