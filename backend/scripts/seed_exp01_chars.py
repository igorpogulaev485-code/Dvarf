#!/usr/bin/env python3
"""EXP-01 seed: wizard-like + acolyte/rogue sheets with null starting weights.

No migrations. Run from backend/:
  PYTHONPATH=. python scripts/seed_exp01_chars.py
"""

from __future__ import annotations

import json
import uuid

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.character import Character, RulesEdition
from app.models.user import User

EMAIL = "uikit03@example.com"
PASSWORD = "uikit03-dev"
WIZ20_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-ccccccccccc1")
ROGUE_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-ccccccccccc2")
GEAR_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-ccccccccccc3")


def _skills(*proficient: str) -> dict:
    keys = [
        "acrobatics",
        "animal_handling",
        "arcana",
        "athletics",
        "deception",
        "history",
        "insight",
        "intimidation",
        "investigation",
        "medicine",
        "nature",
        "perception",
        "performance",
        "persuasion",
        "religion",
        "sleight_of_hand",
        "stealth",
        "survival",
    ]
    return {
        k: {"is_proficient": k in proficient, "is_expertise": False} for k in keys
    }


def _item(
    iid: str,
    name: str,
    *,
    weight_lb=None,
    qty: int = 1,
    equipped: bool = False,
    armor_kind: str = "none",
    base_ac=None,
    weapon_grip=None,
    requires_attunement: bool = False,
    attuned: bool = False,
    wear_slot: str | None = None,
    notes: str = "Стартовое снаряжение",
) -> dict:
    return {
        "id": iid,
        "name": name,
        "qty": qty,
        "weight_lb": weight_lb,
        "equipped": equipped,
        "armor_kind": armor_kind,
        "base_ac": base_ac,
        "weapon_grip": weapon_grip,
        "requires_attunement": requires_attunement,
        "attuned": attuned,
        "wear_slot": wear_slot,
        "notes": notes,
        "cost_gp": None,
        "catalog_id": None,
        "parent_id": None,
    }


def wizard_sheet() -> dict:
    return {
        "identity": {
            "alignment": "Нейтрально-добрый",
            "experience": 355000,
            "background": "Мудрец",
            "subclassName": "Школа воплощения",
        },
        "classes": [
            {
                "id": "wizard",
                "name": "Волшебник",
                "catalog_id": "wizard",
                "level": 20,
                "subclass_name": "Школа воплощения",
                "subclass_catalog_id": "school_of_evocation",
            }
        ],
        "abilities": {
            "str": {"score": 8},
            "dex": {"score": 14},
            "con": {"score": 14},
            "int": {"score": 20},
            "wis": {"score": 12},
            "cha": {"score": 10},
        },
        "saves": {
            "int": {"is_proficient": True},
            "wis": {"is_proficient": True},
        },
        "skills": _skills("arcana", "history", "investigation", "religion"),
        "combat": {
            "inspiration": False,
            "speed": 30,
            "darkvision": 60,
            "conditions": [],
            "exhaustion": 0,
            "hp_temp": 0,
            "concentration": None,
            "effects": [],
            "hit_die": "d6",
            "hp_dice_current": 20,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "turn_economy": {
                "action": False,
                "bonus": False,
                "reaction": False,
                "movement": False,
            },
            "ac": 12,
            "hp_current": 104,
            "hp_max": 104,
        },
        "resources": [],
        "play": {},
        "inventory": {
            "items": [
                _item("w-pack", "Набор учёного"),
                _item("w-staff", "Боевой посох", weapon_grip="two_hand"),
                _item("w-book", "Книга заклинаний"),
                _item("w-focus", "Магический фокус"),
                _item("w-dagger", "Кинжал", weapon_grip="one_hand", qty=1),
            ],
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 120, "pp": 0},
            "notes": "",
        },
        "proficiency": {
            "armor": {
                "light": False,
                "medium": False,
                "heavy": False,
                "shields": False,
            },
            "weapons": {"simple": True, "martial": False, "extras": ["dagger", "quarterstaff"]},
            "languages": ["Общий", "Эльфийский"],
            "tools": [],
        },
        "companions": [],
        "text_blocks": [],
        "weapons": [
            {
                "id": "atk-staff",
                "name": "Боевой посох",
                "ability": "str",
                "proficient": True,
                "damage": "1к6",
                "damage_type": "дробящий",
                "held": False,
                "qty": 1,
                "inventory_item_id": "w-staff",
            }
        ],
        "spells": {"known": [], "prepared": [], "slots": {}},
    }


def rogue_sheet() -> dict:
    return {
        "identity": {
            "alignment": "Хаотично-нейтральный",
            "experience": 0,
            "background": "Прислужник",
        },
        "classes": [
            {
                "id": "rogue",
                "name": "Плут",
                "catalog_id": "rogue",
                "level": 1,
                "subclass_name": None,
                "subclass_catalog_id": None,
            }
        ],
        "abilities": {
            "str": {"score": 10},
            "dex": {"score": 16},
            "con": {"score": 12},
            "int": {"score": 12},
            "wis": {"score": 14},
            "cha": {"score": 10},
        },
        "saves": {
            "dex": {"is_proficient": True},
            "int": {"is_proficient": True},
        },
        "skills": _skills("stealth", "sleight_of_hand", "perception", "religion"),
        "combat": {
            "inspiration": False,
            "speed": 30,
            "darkvision": 0,
            "conditions": [],
            "exhaustion": 0,
            "hp_temp": 0,
            "concentration": None,
            "effects": [],
            "hit_die": "d8",
            "hp_dice_current": 1,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "turn_economy": {
                "action": False,
                "bonus": False,
                "reaction": False,
                "movement": False,
            },
            "ac": 14,
            "hp_current": 9,
            "hp_max": 9,
        },
        "resources": [],
        "play": {},
        "inventory": {
            "items": [
                _item(
                    "r-leather",
                    "Кожаный доспех",
                    armor_kind="light",
                    base_ac=11,
                    weight_lb=10,
                    equipped=True,
                ),
                _item("r-rapier", "Рапира", weapon_grip="one_hand"),
                _item("r-tools", "Воровские инструменты"),
                _item("r-symbol", "Священный символ"),
                _item("r-incense", "Палочка благовоний", qty=5),
                _item("r-robe", "Ряса"),
                _item("r-clothes", "Комплект обычной одежды"),
                _item("r-pack", "Набор взломщика"),
            ],
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 15, "pp": 0},
            "notes": "",
        },
        "proficiency": {
            "armor": {
                "light": True,
                "medium": False,
                "heavy": False,
                "shields": False,
            },
            "weapons": {
                "simple": True,
                "martial": False,
                "extras": ["rapier", "shortsword", "hand_crossbow"],
            },
            "languages": ["Общий"],
            "tools": ["Воровские инструменты"],
        },
        "companions": [],
        "text_blocks": [],
        "weapons": [
            {
                "id": "atk-rapier",
                "name": "Рапира",
                "ability": "dex",
                "proficient": True,
                "damage": "1к8",
                "damage_type": "колющий",
                "held": False,
                "qty": 1,
                "inventory_item_id": "r-rapier",
            }
        ],
        "spells": {"known": [], "prepared": [], "slots": {}},
    }


def gear_sheet() -> dict:
    """Equipped armor + attuned cloak for filter / equip icon shots."""
    sheet = rogue_sheet()
    sheet["identity"]["background"] = "Солдат"
    sheet["inventory"]["items"].extend(
        [
            _item(
                "g-cloak",
                "Плащ защиты",
                requires_attunement=True,
                attuned=True,
                equipped=True,
                wear_slot="cloak",
                weight_lb=1,
                notes="Тестовая настройка",
            ),
            _item(
                "g-ring",
                "Кольцо защиты",
                requires_attunement=True,
                attuned=False,
                equipped=False,
                wear_slot="ring",
                weight_lb=0,
            ),
        ]
    )
    sheet["inventory"]["coins"] = {"cp": 12, "sp": 4, "ep": 0, "gp": 40, "pp": 1}
    return sheet


def upsert_char(
    db,
    *,
    user: User,
    char_id: uuid.UUID,
    name: str,
    race_name: str,
    class_name: str,
    level: int,
    sheet: dict,
) -> None:
    row = db.get(Character, char_id)
    combat = sheet.get("combat") or {}
    if row is None:
        row = Character(
            id=char_id,
            user_id=user.id,
            name=name,
            race_name=race_name,
            class_name=class_name,
            level=level,
            hp_current=int(combat.get("hp_current") or 1),
            hp_max=int(combat.get("hp_max") or 1),
            rules_edition=RulesEdition.edition_2014,
            sheet=sheet,
            sheet_version=1,
            is_draft=False,
        )
        db.add(row)
    else:
        row.user_id = user.id
        row.name = name
        row.race_name = race_name
        row.class_name = class_name
        row.level = level
        row.hp_current = int(combat.get("hp_current") or 1)
        row.hp_max = int(combat.get("hp_max") or 1)
        row.sheet = sheet
        row.is_draft = False


def main() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).one_or_none()
        if user is None:
            user = User(
                email=EMAIL,
                password_hash=hash_password(PASSWORD),
                display_name="UIKIT03",
                is_email_verified=True,
            )
            db.add(user)
            db.flush()
        upsert_char(
            db,
            user=user,
            char_id=WIZ20_ID,
            name="Волшебник 20 EXP",
            race_name="Высший эльф",
            class_name="Волшебник 20",
            level=20,
            sheet=wizard_sheet(),
        )
        upsert_char(
            db,
            user=user,
            char_id=ROGUE_ID,
            name="Плут Тест EXP",
            race_name="Человек",
            class_name="Плут 1",
            level=1,
            sheet=rogue_sheet(),
        )
        upsert_char(
            db,
            user=user,
            char_id=GEAR_ID,
            name="Плут Надет EXP",
            race_name="Человек",
            class_name="Плут 1",
            level=1,
            sheet=gear_sheet(),
        )
        db.commit()
        print(
            json.dumps(
                {
                    "email": EMAIL,
                    "password": PASSWORD,
                    "wiz20": str(WIZ20_ID),
                    "rogue": str(ROGUE_ID),
                    "gear": str(GEAR_ID),
                },
                ensure_ascii=False,
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
