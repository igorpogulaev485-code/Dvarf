#!/usr/bin/env python3
"""QI-01 seed: uikit03 user + monk (+ rogue for hdr control)."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.character import Character, RulesEdition
from app.models.user import User

EMAIL = "uikit03@example.com"
PASSWORD = "uikit03-dev"
MONK_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6")
ROGUE_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3")
WARRIOR_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5")


def _skill(proficient: bool = False, expertise: bool = False) -> dict:
    return {"is_proficient": proficient or expertise, "is_expertise": expertise}


def monk_sheet() -> dict:
    skills = {
        k: _skill(k in ("acrobatics", "stealth", "athletics", "religion"))
        for k in (
            "acrobatics","animal_handling","arcana","athletics","deception","history",
            "insight","intimidation","investigation","medicine","nature","perception",
            "performance","persuasion","religion","sleight_of_hand","stealth","survival",
        )
    }
    return {
        "identity": {"alignment": "Законно-нейтральный", "experience": 6500, "background": "Отшельник"},
        "classes": [{
            "id": "monk",
            "name": "Монах",
            "catalog_id": "monk",
            "level": 5,
            "subclass_name": "Путь открытой ладони",
            "subclass_catalog_id": "way_of_the_open_hand",
        }],
        "abilities": {
            "str": {"score": 12}, "dex": {"score": 16}, "con": {"score": 14},
            "int": {"score": 10}, "wis": {"score": 15}, "cha": {"score": 8},
        },
        "saves": {"str": {"is_proficient": True}, "dex": {"is_proficient": True}},
        "skills": skills,
        "combat": {
            "inspiration": False, "speed": 40, "darkvision": 0,
            "climb_speed": None, "swim_speed": None, "fly_speed": None,
            "conditions": [], "exhaustion": 0, "hp_temp": 0, "concentration": None,
            "effects": [], "hit_die": "d8", "hp_dice_current": 5,
            "is_dying": False, "death_successes": 0, "death_fails": 0,
            "turn_economy": {
                "action": False, "bonus": False, "reaction": False,
                "object": False, "movement": False, "free_object": False,
                "interaction": False,
            },
        },
        "play": {
            # Legacy label «Ки» — UI must show «Ци» via displayResourceLabel.
            "resources": [
                {
                    "id": "feat:monk:ki:monk",
                    "name": "Ки",
                    "max": 5,
                    "used": 1,
                    "reset": "short",
                    "onHot": True,
                }
            ],
            "weapons": [],
            "inventory": [],
            "spells": {"slots": {}, "known": [], "prepared": []},
            "notes": "",
            "text_blocks": [],
            "feature_picks": {},
            "companions": [],
        },
        "proficiencies": {
            "armor": [], "weapons": ["simple", "shortsword"],
            "tools": ["воровские инструменты"], "languages": ["Общий"],
        },
    }


def rogue_sheet() -> dict:
    skills = {
        k: _skill(expertise=(k in ("perception", "stealth")), proficient=(k in ("acrobatics", "sleight_of_hand")))
        for k in (
            "acrobatics","animal_handling","arcana","athletics","deception","history",
            "insight","intimidation","investigation","medicine","nature","perception",
            "performance","persuasion","religion","sleight_of_hand","stealth","survival",
        )
    }
    return {
        "identity": {"alignment": "Хаотично-нейтральный", "experience": 0, "background": "Преступник"},
        "classes": [{
            "id": "rogue", "name": "Плут", "catalog_id": "rogue", "level": 1,
            "subclass_name": None, "subclass_catalog_id": None,
        }],
        "abilities": {
            "str": {"score": 10}, "dex": {"score": 16}, "con": {"score": 12},
            "int": {"score": 12}, "wis": {"score": 14}, "cha": {"score": 10},
        },
        "saves": {"dex": {"is_proficient": True}, "int": {"is_proficient": True}},
        "skills": skills,
        "combat": {
            "inspiration": False, "speed": 30, "darkvision": 60,
            "climb_speed": 15, "swim_speed": None, "fly_speed": None,
            "conditions": [], "exhaustion": 0, "hp_temp": 0, "concentration": None,
            "effects": [], "hit_die": "d8", "hp_dice_current": 1,
            "is_dying": False, "death_successes": 0, "death_fails": 0,
            "turn_economy": {
                "action": False, "bonus": False, "reaction": False,
                "object": False, "movement": False, "free_object": False,
                "interaction": False,
            },
        },
        "play": {"resources": [], "weapons": [], "inventory": [], "spells": {"slots": {}, "known": [], "prepared": []},
                 "notes": "", "text_blocks": [], "feature_picks": {}, "companions": []},
        "proficiencies": {"armor": ["light"], "weapons": ["simple", "hand_crossbow", "longsword", "rapier", "shortsword"],
                          "tools": ["воровские инструменты"], "languages": ["Общий", "Воровской жаргон"]},
    }


def warrior_sheet() -> dict:
    skills = {
        k: _skill(k in ("athletics", "intimidation", "perception", "survival"))
        for k in (
            "acrobatics","animal_handling","arcana","athletics","deception","history",
            "insight","intimidation","investigation","medicine","nature","perception",
            "performance","persuasion","religion","sleight_of_hand","stealth","survival",
        )
    }
    return {
        "identity": {"alignment": "Законно-нейтральный", "experience": 300, "background": "Солдат"},
        "classes": [{
            "id": "fighter", "name": "Воин", "catalog_id": "fighter", "level": 2,
            "subclass_name": None, "subclass_catalog_id": None,
        }],
        "abilities": {
            "str": {"score": 16}, "dex": {"score": 14}, "con": {"score": 15},
            "int": {"score": 10}, "wis": {"score": 12}, "cha": {"score": 8},
        },
        "saves": {"str": {"is_proficient": True}, "con": {"is_proficient": True}},
        "skills": skills,
        "combat": {
            "inspiration": False, "speed": 30, "darkvision": 60,
            "climb_speed": 20, "swim_speed": None, "fly_speed": None,
            "conditions": [], "exhaustion": 0, "hp_temp": 0, "concentration": None,
            "effects": [], "hit_die": "d10", "hp_dice_current": 2,
            "is_dying": False, "death_successes": 0, "death_fails": 0,
            "turn_economy": {
                "action": False, "bonus": False, "reaction": False,
                "object": False, "movement": False, "free_object": False,
                "interaction": False,
            },
        },
        "play": {"resources": [], "weapons": [], "inventory": [], "spells": {"slots": {}, "known": [], "prepared": []},
                 "notes": "", "text_blocks": [], "feature_picks": {}, "companions": []},
        "proficiencies": {"armor": ["all", "shields"], "weapons": ["simple", "martial"],
                          "tools": [], "languages": ["Общий"]},
    }


def upsert_char(db, user_id, char_id, name, class_name, race_name, level, sheet, hp_max):
    row = db.query(Character).filter(Character.id == char_id).one_or_none()
    now = datetime.now(timezone.utc)
    if row is None:
        row = Character(
            id=char_id, user_id=user_id, name=name, level=level,
            class_name=class_name, race_name=race_name,
            hp_current=hp_max, hp_max=hp_max,
            rules_edition=RulesEdition.edition_2014,
            sheet=sheet, sheet_version=1,
            created_at=now, updated_at=now,
        )
        db.add(row)
    else:
        row.name = name
        row.level = level
        row.class_name = class_name
        row.race_name = race_name
        row.hp_current = hp_max
        row.hp_max = hp_max
        row.sheet = sheet
        row.updated_at = now
        row.deleted_at = None


def main() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).one_or_none()
        if user is None:
            user = User(
                id=uuid.uuid4(),
                email=EMAIL,
                password_hash=hash_password(PASSWORD),
                login="uikit03",
                display_name="UIKIT03",
                email_verified_at=datetime.now(timezone.utc),
            )
            db.add(user)
            db.flush()
        else:
            user.password_hash = hash_password(PASSWORD)
            user.login = user.login or "uikit03"

        upsert_char(db, user.id, MONK_ID, "Киара Тень", "Монах", "Человек", 5, monk_sheet(), 38)
        upsert_char(db, user.id, ROGUE_ID, "Лисса Тихая", "Плут", "Полурослик", 1, rogue_sheet(), 9)
        upsert_char(db, user.id, WARRIOR_ID, "Бран Дубина", "Воин", "Дварф", 2, warrior_sheet(), 20)
        db.commit()
        print(json.dumps({"email": EMAIL, "password": PASSWORD, "monk": str(MONK_ID)}, ensure_ascii=False))
    finally:
        db.close()


if __name__ == "__main__":
    main()
