"""Pack 06: Underdark circle spells and druid weapon list.

Revision ID: q2c06e7f8a9b
Revises: p1b05a6c7d8e
Create Date: 2026-11-11

Circle of the Land / Underdark at druid level 5 grants Gaseous Form and
Stinking Cloud, not Gust of Wind and Lightning Bolt. Druid weapon
proficiency is the PHB list of ten weapons, not every simple weapon.
Summon spell upcast text includes the 9th-level counts and TCE stat blocks.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "q2c06e7f8a9b"
down_revision: Union[str, Sequence[str], None] = "p1b05a6c7d8e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")
LAND_SLUG = "circle_of_the_land"

DRUID_WEAPON_EXTRAS = [
    "club",
    "dagger",
    "dart",
    "javelin",
    "mace",
    "quarterstaff",
    "scimitar",
    "sickle",
    "sling",
    "spear",
]

HIGHER_LEVELS = {
    "conjure_animals": (
        "На 5-м круге существ вдвое больше, на 7-м — втрое, на 9-м — вчетверо. "
        "Варианты: КР ≤2, ≤1, ≤½, ≤¼. На 9-м круге это 4, 8, 16 и 32 существа."
    ),
    "conjure_fey": (
        "Если ячейка 7-го круга или выше, предел показателя опасности растёт на 1 "
        "за каждый круг выше 6-го. На 9-м круге предел КР ≤9. Карточка берёт предел "
        "ячейки, а не базовый КР 6."
    ),
    "summon_beast": (
        "Круг ячейки подставляется в блок духа зверя. КД 11+круг. Хиты: земля и вода "
        "30+5 за каждый круг выше 2-го, воздух 20+5 за каждый круг выше 2-го. "
        "Атак — половина круга (вниз), минимум одна. Попадание бонусом заклинания, "
        "урон 1к8+4+круг колющего. Скорость 30; земля — лазание 30, воздух — полёт 60, "
        "вода — плавание 30."
    ),
    "summon_fey": (
        "Круг ячейки подставляется в блок духа феи. КД 12+круг. Хиты 30+10 за каждый "
        "круг выше 3-го. Атак — половина круга (вниз), минимум одна. Попадание бонусом "
        "заклинания, урон 1к6+3+круг колющего. Скорость 40. Настроение (сердитое, "
        "довольное, игривое) задаёт особое действие."
    ),
    "summon_elemental": (
        "Круг ячейки подставляется в блок духа стихии. КД 11+круг. Хиты 50+10 за каждый "
        "круг выше 4-го. Атак — половина круга (вниз), минимум одна. Попадание бонусом "
        "заклинания, урон 1к10+4+круг дробящего. Стихия (воздух, земля, огонь, вода) "
        "добавляет особое свойство. Скорость 40."
    ),
}


def _load_land_spells() -> list:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((item for item in candidates if item.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"Subclass seed not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    for cls in payload.get("classes") or []:
        if cls.get("parent_slug") != "druid":
            continue
        for sub in cls.get("subclasses") or []:
            if sub.get("slug") == LAND_SLUG:
                spells = sub.get("always_prepared_spells") or []
                if len(spells) != 64:
                    raise ValueError(f"land table expected 64 spells, got {len(spells)}")
                return spells
    raise ValueError("circle_of_the_land missing from subclass seed")


def upgrade() -> None:
    conn = op.get_bind()
    spells = _load_land_spells()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
                  COALESCE(data, '{}'::jsonb),
                  '{always_prepared_spells}',
                  CAST(:spells AS jsonb),
                  true
                ),
                updated_at = now()
            WHERE kind = 'subclass'
              AND slug = :slug
              AND rules_edition = '2014'
            """
        ),
        {"slug": LAND_SLUG, "spells": json.dumps(spells, ensure_ascii=False)},
    )
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = jsonb_set(
                  COALESCE(data, '{}'::jsonb),
                  '{weapons}',
                  CAST(:weapons AS jsonb),
                  true
                ),
                updated_at = now()
            WHERE kind = 'class'
              AND slug = 'druid'
              AND rules_edition = '2014'
            """
        ),
        {
            "weapons": json.dumps(
                {
                    "simple": False,
                    "martial": False,
                    "extras": DRUID_WEAPON_EXTRAS,
                    "note": (
                        "PHB: дубинка, кинжал, дротик, метательное копьё, булава, "
                        "боевой посох, ятаган, серп, праща, копьё — не вся категория "
                        "простого оружия"
                    ),
                },
                ensure_ascii=False,
            )
        },
    )
    for slug, higher in HIGHER_LEVELS.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = jsonb_set(
                      COALESCE(data, '{}'::jsonb),
                      '{higher_levels}',
                      to_jsonb(CAST(:higher AS text)),
                      true
                    ),
                    updated_at = now()
                WHERE kind = 'spell'
                  AND slug = :slug
                  AND rules_edition = '2014'
                """
            ),
            {"slug": slug, "higher": higher},
        )


def downgrade() -> None:
    pass
