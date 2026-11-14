#!/usr/bin/env python3
"""SCN-01 seed: UIKIT-03 cleric/loaded + rogue (expertise) + paladin (Lay on Hands 25).

No migrations. Run from backend/:
  PYTHONPATH=. python scripts/seed_uikit03_hot_chars.py
  PYTHONPATH=. python scripts/seed_scn01_chars.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import uuid
from pathlib import Path

from app.db.session import SessionLocal
from app.models.character import Character, RulesEdition
from app.models.user import User

EMAIL = "uikit03@example.com"
ROGUE_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3")
PALADIN_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4")


def _skill(proficient: bool = False, expertise: bool = False) -> dict:
    return {"is_proficient": proficient or expertise, "is_expertise": expertise}


def rogue_sheet() -> dict:
    # LP-01 screenshots: darkvision sense
    skills = {
        "acrobatics": _skill(True),
        "animal_handling": _skill(),
        "arcana": _skill(),
        "athletics": _skill(),
        "deception": _skill(),
        "history": _skill(),
        "insight": _skill(),
        "intimidation": _skill(),
        "investigation": _skill(),
        "medicine": _skill(),
        "nature": _skill(),
        "perception": _skill(expertise=True),
        "performance": _skill(),
        "persuasion": _skill(),
        "religion": _skill(),
        "sleight_of_hand": _skill(True),
        "stealth": _skill(expertise=True),
        "survival": _skill(),
    }
    return {
        "identity": {
            "alignment": "Хаотично-нейтральный",
            "experience": 0,
            "background": "Преступник",
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
        "skills": skills,
        "combat": {
            "inspiration": False,
            "speed": 30,
            "darkvision": 60,
            "climb_speed": 15,
            "swim_speed": None,
            "fly_speed": None,
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
        },
        "resources": [],
        "play": {},
        "inventory": {
            "items": [],
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 15, "pp": 0},
            "notes": "",
        },
        "proficiency": {
            "armor": {"light": True, "medium": False, "heavy": False, "shields": False},
            "weapons": {
                "simple": True,
                "martial": False,
                "extras": ["Рапира", "Короткий меч", "Арбалет ручной", "Длинный лук"],
            },
            "languages": ["Общий", "Воровской жаргон", "Эльфийский", "Дварфийский"],
            "tools": ["Воровские инструменты", "Карты", "Набор для грима"],
        },
        "companions": [],
        "spells": {"known": [], "slots": {}, "casting_ability": None},
        "weapons": [],
        "text_blocks": [],
        "ui": {
            "sheetUi": {
                "collapsedAbilities": [],
            }
        },
        "subclassGrants": [],
        "subclassTransitions": [],
        "featurePicks": {},
    }


def paladin_sheet() -> dict:
    return {
        "identity": {
            "alignment": "Законно-добрый",
            "experience": 6500,
            "background": "Солдат",
        },
        "classes": [
            {
                "id": "paladin",
                "name": "Паладин",
                "catalog_id": "paladin",
                "level": 5,
                "subclass_name": "Клятва преданности",
                "subclass_catalog_id": "oath_of_devotion",
            }
        ],
        "abilities": {
            "str": {"score": 16},
            "dex": {"score": 10},
            "con": {"score": 14},
            "int": {"score": 8},
            "wis": {"score": 12},
            "cha": {"score": 16},
        },
        "saves": {
            "wis": {"is_proficient": True},
            "cha": {"is_proficient": True},
        },
        "skills": {
            "athletics": {"is_proficient": True, "is_expertise": False},
            "persuasion": {"is_proficient": True, "is_expertise": False},
            "insight": {"is_proficient": True, "is_expertise": False},
            "religion": {"is_proficient": True, "is_expertise": False},
        },
        "combat": {
            "inspiration": False,
            "speed": 30,
            "conditions": [],
            "exhaustion": 0,
            "hp_temp": 0,
            "concentration": None,
            "effects": [],
            "hit_die": "d10",
            "hp_dice_current": 5,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "turn_economy": {
                "action": False,
                "bonus": False,
                "reaction": False,
                "movement": False,
            },
        },
        "resources": [
            {
                "id": "feat:lay_on_hands",
                "name": "Наложение рук",
                "max": 25,
                "used": 7,
                "reset": "long",
                "on_hot": True,
                "track": "spend",
            },
            {
                "id": "feat:divine_sense",
                "name": "Божественное чувство",
                "max": 4,
                "used": 1,
                "reset": "long",
                "on_hot": True,
                "track": "spend",
            },
        ],
        "play": {},
        "inventory": {
            "items": [],
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 40, "pp": 0},
            "notes": "",
        },
        "companions": [],
        "spells": {"known": [], "slots": {}, "casting_ability": "cha"},
        "weapons": [],
        "text_blocks": [],
        "ui": {},
        "subclassGrants": [],
        "subclassTransitions": [],
        "featurePicks": {},
    }


def upsert_char(
    db,
    *,
    cid: uuid.UUID,
    user_id,
    name: str,
    class_name: str,
    level: int,
    sheet: dict,
    race: str,
) -> None:
    row = db.get(Character, cid)
    if row:
        db.delete(row)
        db.commit()
    db.add(
        Character(
            id=cid,
            user_id=user_id,
            name=name,
            race_name=race,
            class_name=class_name,
            level=level,
            hp_current=max(8, level * 7),
            hp_max=max(8, level * 8),
            rules_edition=RulesEdition.edition_2014,
            sheet=sheet,
            sheet_version=1,
            is_draft=False,
        )
    )
    db.commit()


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    subprocess.check_call(
        [sys.executable, str(root / "scripts" / "seed_uikit03_hot_chars.py")],
        cwd=str(root),
        env={**dict(**{k: v for k, v in __import__("os").environ.items()}), "PYTHONPATH": str(root)},
    )
    db = SessionLocal()
    user = db.query(User).filter(User.email == EMAIL).one()
    upsert_char(
        db,
        cid=ROGUE_ID,
        user_id=user.id,
        name="Лили Теневой Клинок",
        class_name="Плут 1",
        level=1,
        sheet=rogue_sheet(),
        race="Халфлинг (легконогий)",
    )
    upsert_char(
        db,
        cid=PALADIN_ID,
        user_id=user.id,
        name="Серен Праведный",
        class_name="Паладин 5",
        level=5,
        sheet=paladin_sheet(),
        race="Человек",
    )
    print("seeded scn01", ROGUE_ID, PALADIN_ID)
    print(json.dumps({"email": EMAIL, "password": "uikit03-dev"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
