#!/usr/bin/env python3
"""LP-01 seed: UIKIT-03 + SCN-01 chars + воин без компетенций.

No migrations. Run from backend/:
  PYTHONPATH=. python scripts/seed_lp01_chars.py
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
WARRIOR_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5")


def warrior_sheet() -> dict:
    return {
        "identity": {
            "alignment": "Законно-нейтральный",
            "experience": 300,
            "background": "Солдат",
        },
        "classes": [
            {
                "id": "fighter",
                "name": "Воин",
                "catalog_id": "fighter",
                "level": 2,
                "subclass_name": None,
                "subclass_catalog_id": None,
            }
        ],
        "abilities": {
            "str": {"score": 16},
            "dex": {"score": 14},
            "con": {"score": 15},
            "int": {"score": 10},
            "wis": {"score": 12},
            "cha": {"score": 8},
        },
        "saves": {
            "str": {"is_proficient": True},
            "con": {"is_proficient": True},
        },
        "skills": {
            "acrobatics": {"is_proficient": False, "is_expertise": False},
            "animal_handling": {"is_proficient": False, "is_expertise": False},
            "arcana": {"is_proficient": False, "is_expertise": False},
            "athletics": {"is_proficient": True, "is_expertise": False},
            "deception": {"is_proficient": False, "is_expertise": False},
            "history": {"is_proficient": False, "is_expertise": False},
            "insight": {"is_proficient": False, "is_expertise": False},
            "intimidation": {"is_proficient": True, "is_expertise": False},
            "investigation": {"is_proficient": False, "is_expertise": False},
            "medicine": {"is_proficient": False, "is_expertise": False},
            "nature": {"is_proficient": False, "is_expertise": False},
            "perception": {"is_proficient": True, "is_expertise": False},
            "performance": {"is_proficient": False, "is_expertise": False},
            "persuasion": {"is_proficient": False, "is_expertise": False},
            "religion": {"is_proficient": False, "is_expertise": False},
            "sleight_of_hand": {"is_proficient": False, "is_expertise": False},
            "stealth": {"is_proficient": False, "is_expertise": False},
            "survival": {"is_proficient": True, "is_expertise": False},
        },
        "combat": {
            "inspiration": False,
            "speed": 30,
            "darkvision": 60,
            "climb_speed": 20,
            "swim_speed": None,
            "fly_speed": None,
            "conditions": [],
            "exhaustion": 0,
            "hp_temp": 0,
            "concentration": None,
            "effects": [],
            "hit_die": "d10",
            "hp_dice_current": 2,
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
                "id": "feat:second_wind",
                "name": "Второе дыхание",
                "max": 1,
                "used": 0,
                "reset": "short",
                "on_hot": True,
                "track": "spend",
            }
        ],
        "play": {},
        "inventory": {
            "items": [],
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 25, "pp": 0},
            "notes": "",
        },
        "proficiency": {
            "armor": {"light": True, "medium": True, "heavy": True, "shields": True},
            "weapons": {"simple": True, "martial": True, "extras": []},
            "languages": ["Общий", "Дварфийский"],
            "tools": ["Пивоваренный набор"],
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
            hp_current=22,
            hp_max=22,
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
        [sys.executable, str(root / "scripts" / "seed_scn01_chars.py")],
        cwd=str(root),
        env={**dict(**{k: v for k, v in __import__("os").environ.items()}), "PYTHONPATH": str(root)},
    )
    db = SessionLocal()
    user = db.query(User).filter(User.email == EMAIL).one()
    upsert_char(
        db,
        cid=WARRIOR_ID,
        user_id=user.id,
        name="Бран Каменный Щит",
        class_name="Воин 2",
        level=2,
        sheet=warrior_sheet(),
        race="Дварф (горный)",
    )
    print("seeded lp01 warrior", WARRIOR_ID)
    print(json.dumps({"email": EMAIL, "password": "uikit03-dev"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
