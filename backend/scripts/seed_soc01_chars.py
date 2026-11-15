#!/usr/bin/env python3
"""SOC-01 seed: uikit03 + two social-scene sheets (empty / filled personality).

  PYTHONPATH=. python scripts/seed_uikit03_hot_chars.py
  PYTHONPATH=. python scripts/seed_soc01_chars.py
"""

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
EMPTY_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-ccccccccccc1")
FILLED_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-ccccccccccc2")


def text_block(value: str = "", *, hidden: bool = False) -> dict:
    return {
        "customLabel": None,
        "isHidden": hidden,
        "value": value,
        "resourceId": None,
        "parts": [{"id": f"part-{uuid.uuid4()}", "kind": "text", "value": value}],
    }


def base_sheet(*, personality: dict, physique: dict, appearance: str = "") -> dict:
    blocks = {
        "traits": text_block(""),
        "features": text_block(""),
        "feats": text_block(""),
        "personality": text_block(personality.get("personality", "")),
        "ideals": text_block(personality.get("ideals", "")),
        "bonds": text_block(personality.get("bonds", "")),
        "flaws": text_block(personality.get("flaws", "")),
        "appearance": text_block(appearance),
        "background": text_block(personality.get("background", "")),
        "quests": text_block(personality.get("quests", "")),
    }
    return {
        "meta": {"edition": "2014"},
        "identity": {
            "name": "",
            "player_name": "",
            "experience": 0,
            "subclass_name": "",
            "background": "Народный герой",
            "background_slug": "folk_hero",
            "alignment": "neutral_good",
            "alignment_text": "",
            "gender": "male",
            "size": "Средний",
            "carry": "",
            "darkvision": 0,
            "armor": {"light": True, "medium": False, "heavy": False, "shields": False},
            "weapons": {"simple": True, "martial": False, "extras": []},
            "languages": ["Общий"],
            "tools": [],
            "race_applied_languages": [],
            # Flat keys — readIdentityExtras reads identity.age/height/… (not nested).
            "age": physique.get("age", ""),
            "height": physique.get("height", ""),
            "weight": physique.get("weight", ""),
            "eyes": physique.get("eyes", ""),
            "skin": physique.get("skin", ""),
            "hair": physique.get("hair", ""),
        },
        "abilities": {
            "str": 10,
            "dex": 14,
            "con": 12,
            "int": 16,
            "wis": 13,
            "cha": 15,
        },
        "skills": {},
        "text_blocks": blocks,
        "text_blocks_order": list(blocks.keys()),
        "personality": {
            "personality": personality.get("personality", ""),
            "ideals": personality.get("ideals", ""),
            "bonds": personality.get("bonds", ""),
            "flaws": personality.get("flaws", ""),
        },
        "notes": {
            "appearance": appearance,
            "background": personality.get("background", ""),
            "quests": personality.get("quests", ""),
            "free": "",
        },
        "features_text": {"traits": "", "features": "", "feats": ""},
        "play": {"resources": [], "effects": []},
        "combat": {"hp": {"current": 20, "max": 20, "temp": 0}},
        "classes": [{"slug": "bard", "name": "Бард", "level": 3}],
        "race": {"slug": "human", "name": "Человек"},
    }


def upsert(db, user_id: uuid.UUID, char_id: uuid.UUID, name: str, sheet: dict) -> None:
    now = datetime.now(timezone.utc)
    row = db.get(Character, char_id)
    if row is None:
        row = Character(
            id=char_id,
            user_id=user_id,
            name=name,
            level=3,
            class_name="Бард",
            race_name="Человек",
            hp_current=20,
            hp_max=20,
            rules_edition=RulesEdition.edition_2014,
            sheet=sheet,
            sheet_version=1,
            is_draft=False,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        row.user_id = user_id
        row.name = name
        row.level = 3
        row.class_name = "Бард"
        row.race_name = "Человек"
        row.hp_current = 20
        row.hp_max = 20
        row.rules_edition = RulesEdition.edition_2014
        row.sheet = sheet
        row.sheet_version = int(row.sheet_version or 1) + 1
        row.is_draft = False
        row.deleted_at = None
        row.updated_at = now


def main() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).one_or_none()
        if user is None:
            user = User(
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

        empty_sheet = base_sheet(
            personality={},
            physique={
                "age": "",
                "height": "",
                "weight": "",
                "eyes": "",
                "skin": "",
                "hair": "",
            },
            appearance="",
        )
        empty_sheet["identity"]["name"] = "Плут Тест SOC"
        upsert(db, user.id, EMPTY_ID, "Плут Тест SOC", empty_sheet)

        filled_sheet = base_sheet(
            personality={
                "personality": "Весельчак и болтун.\nЛюбит сцену и шумную компанию.\nНе любит тишину.",
                "ideals": "Свобода слова важнее порядка.",
                "bonds": "",
                "flaws": "",
                "background": "Вырос в бродячем театре.",
                "quests": "",
            },
            physique={
                "age": "24",
                "height": "5 футов 7 дюймов",
                "weight": "150 фунтов",
                "eyes": "карие",
                "skin": "смуглая",
                "hair": "чёрные",
            },
            appearance="Шрам над бровью, яркий плащ и всегда улыбка.",
        )
        filled_sheet["identity"]["name"] = "Бард Взгляд SOC"
        upsert(db, user.id, FILLED_ID, "Бард Взгляд SOC", filled_sheet)

        db.commit()
        print(
            json.dumps(
                {
                    "email": EMAIL,
                    "password": PASSWORD,
                    "empty_id": str(EMPTY_ID),
                    "filled_id": str(FILLED_ID),
                },
                ensure_ascii=False,
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
