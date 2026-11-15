#!/usr/bin/env python3
"""ABL-01 seed: piety-on char + sorcerer with ancestor only in subclass_setups (bug repro)."""
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
PIETY_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-ccccccccab01")
DRAGON_BUG_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-ccccccccab02")


def _skills(*proficient: str) -> dict:
    keys = (
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
    )
    return {
        k: {"is_proficient": k in proficient, "is_expertise": False} for k in keys
    }


def piety_sheet() -> dict:
    return {
        "identity": {
            "alignment": "Законно-добрый",
            "experience": 6500,
            "background": "Аколит",
        },
        "race": {"name": "Человек", "slug": "human"},
        "classes": [
            {
                "id": "cleric",
                "name": "Жрец",
                "catalog_id": "cleric",
                "level": 5,
                "subclass_name": "Жизнь",
                "subclass_catalog_id": "life_domain",
            }
        ],
        "abilities": {
            "str": {"score": 10},
            "dex": {"score": 12},
            "con": {"score": 14},
            "int": {"score": 10},
            "wis": {"score": 16},
            "cha": {"score": 12},
        },
        "saves": {"wis": {"is_proficient": True}, "cha": {"is_proficient": True}},
        "skills": _skills("insight", "religion", "medicine", "persuasion"),
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
            "hp_dice_current": 5,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "ac": 16,
            "hp_current": 38,
            "hp_max": 38,
        },
        "play": {
            "resources": [],
            "weapons": [],
            "inventory": [],
            "spells": {
                "casting_ability": "wis",
                "max_prepared": 8,
                "slots": {
                    "1": {"max": 4, "used": 0},
                    "2": {"max": 3, "used": 0},
                    "3": {"max": 2, "used": 0},
                },
                "known": [],
                "has_spell_focus": True,
                "has_component_pouch": True,
            },
            "notes": "",
            "text_blocks": [],
            "feature_picks": {},
            "companions": [],
        },
        "inventory": {"coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 20, "pp": 0}, "items": []},
        "feature_picks": {"values": {}},
        "piety": {
            "god": "heliod",
            "score": 3,
            "journal": [],
            "champion_ability": None,
            "champion_applied": 0,
            "gift": None,
        },
        "notes": "ABL-01 piety-on",
    }


def dragon_bug_sheet() -> dict:
    """Ancestor chosen in subclass_setups / choice.id only — card must not say «не выбрано»."""
    return {
        "identity": {
            "alignment": "Хаотично-добрый",
            "experience": 6500,
            "background": "Артист",
        },
        "race": {"name": "Человек", "slug": "human"},
        "classes": [
            {
                "id": "sorcerer",
                "name": "Чародей",
                "catalog_id": "sorcerer",
                "level": 5,
                "subclass_name": "Наследие драконьей крови",
                "subclass_catalog_id": "draconic_bloodline",
            }
        ],
        "abilities": {
            "str": {"score": 10},
            "dex": {"score": 14},
            "con": {"score": 14},
            "int": {"score": 10},
            "wis": {"score": 10},
            "cha": {"score": 16},
        },
        "saves": {"con": {"is_proficient": True}, "cha": {"is_proficient": True}},
        "skills": _skills("arcana", "persuasion", "deception", "insight"),
        "combat": {
            "inspiration": False,
            "speed": 30,
            "darkvision": 0,
            "conditions": [],
            "exhaustion": 0,
            "hp_temp": 0,
            "concentration": None,
            "effects": [],
            "hit_die": "d6",
            "hp_dice_current": 5,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "ac": 13,
            "hp_current": 32,
            "hp_max": 32,
        },
        "play": {
            "resources": [
                {
                    "id": "feat:sorcery_points:sorcerer",
                    "name": "Очки чародейства",
                    "max": 5,
                    "used": 0,
                    "reset": "long",
                    "track": "pool",
                }
            ],
            "weapons": [],
            "inventory": [],
            "spells": {
                "casting_ability": "cha",
                "max_prepared": None,
                "slots": {
                    "1": {"max": 4, "used": 0},
                    "2": {"max": 3, "used": 0},
                    "3": {"max": 2, "used": 0},
                },
                "known": [],
                "has_spell_focus": True,
                "has_component_pouch": True,
            },
            "notes": "",
            "text_blocks": [],
            "feature_picks": {},
            "companions": [],
        },
        "inventory": {"coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 15, "pp": 0}, "items": []},
        # Empty feature card picks — only setup / choice.id key.
        "feature_picks": {"values": {"sorcerer:draconic_ancestry": "red"}},
        "subclass_setups": {
            "sorcerer": {
                "entry": {
                    "id": "draconic_bloodline",
                    "slug": "draconic_bloodline",
                    "name_ru": "Наследие драконьей крови",
                },
                "picks": {"values": {"dragon_ancestor": "red"}},
            }
        },
        "notes": "ABL-01 dragon ancestor bridge",
    }


def upsert_char(
    db,
    user_id,
    char_id,
    name,
    class_name,
    race_name,
    level,
    sheet,
    hp_max,
) -> None:
    row = db.query(Character).filter(Character.id == char_id).one_or_none()
    now = datetime.now(timezone.utc)
    if row is None:
        row = Character(
            id=char_id,
            user_id=user_id,
            name=name,
            level=level,
            class_name=class_name,
            race_name=race_name,
            hp_current=hp_max,
            hp_max=hp_max,
            rules_edition=RulesEdition.edition_2014,
            sheet=sheet,
            sheet_version=1,
            created_at=now,
            updated_at=now,
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

        upsert_char(
            db,
            user.id,
            PIETY_ID,
            "ABL-01 Гелиод",
            "Жрец",
            "Человек",
            5,
            piety_sheet(),
            38,
        )
        upsert_char(
            db,
            user.id,
            DRAGON_BUG_ID,
            "ABL-01 Драконий предок",
            "Чародей",
            "Человек",
            5,
            dragon_bug_sheet(),
            32,
        )
        db.commit()
        print(
            json.dumps(
                {
                    "email": EMAIL,
                    "password": PASSWORD,
                    "piety_on": str(PIETY_ID),
                    "dragon_bug": str(DRAGON_BUG_ID),
                },
                ensure_ascii=False,
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
