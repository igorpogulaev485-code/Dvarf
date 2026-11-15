#!/usr/bin/env python3
"""COMP-01 seed: companions scene sheets for uikit03.

Run from backend/ after DB is up:
  PYTHONPATH=. python scripts/seed_comp01_chars.py
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

EMPTY_WIZ_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccd01")
RANGER_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccd02")
FAM_WIZ_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccd03")
DRUID_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccd04")
STEED_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccd05")


def _skill(proficient: bool = False) -> dict:
    return {"is_proficient": proficient, "is_expertise": False}


def _skills(*keys: str) -> dict:
    all_keys = (
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
    return {k: _skill(k in keys) for k in all_keys}


def _empty_te() -> dict:
    return {
        "action": False,
        "bonus": False,
        "reaction": False,
        "object_interaction": False,
        "movement": False,
    }


def _base_sheet(**extra: object) -> dict:
    sheet = {
        "schema_version": 1,
        "name": "COMP",
        "rules_edition": "2014",
        "hpCurrent": 20,
        "hpMax": 20,
        "armorClass": 14,
        "speed": 30,
        "proficiencyBonus": 2,
        "abilities": {
            "str": 12,
            "dex": 14,
            "con": 14,
            "int": 12,
            "wis": 14,
            "cha": 10,
        },
        "skills": _skills("perception", "survival"),
        "classes": [],
        "inventory": {"items": [], "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 10, "pp": 0}},
        "companions": [],
        "textBlocks": [],
        "attacks": [],
        "spells": {
            "casting_ability": "wis",
            "max_prepared": None,
            "slots": {str(i): {"max": 0, "used": 0} for i in range(1, 10)},
            "pact_slots": None,
            "known": [],
            "has_spell_focus": True,
            "has_component_pouch": True,
        },
        "play": {
            "resources": [],
            "conditions": [],
            "concentration": None,
            "inspiration": False,
            "death_saves": {"successes": 0, "failures": 0},
            "turn_economy": _empty_te(),
        },
        "featurePicks": {"values": {}},
        "knownForms": [],
    }
    sheet.update(extra)
    return sheet


def upsert_char(
    db,
    *,
    user_id,
    char_id,
    name,
    sheet,
    class_name: str,
    level: int,
    hp_max: int = 20,
) -> None:
    row = db.get(Character, char_id)
    now = datetime.now(timezone.utc)
    payload = json.loads(json.dumps(sheet, ensure_ascii=False))
    if row is None:
        row = Character(
            id=char_id,
            user_id=user_id,
            name=name,
            level=level,
            class_name=class_name,
            race_name="Человек",
            hp_current=hp_max,
            hp_max=hp_max,
            rules_edition=RulesEdition.edition_2014,
            sheet=payload,
            sheet_version=1,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        row.name = name
        row.level = level
        row.class_name = class_name
        row.hp_current = hp_max
        row.hp_max = hp_max
        row.sheet = payload
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
                login="uikit03",
                display_name="UIKIT03",
                password_hash=hash_password(PASSWORD),
                email_verified_at=datetime.now(timezone.utc),
            )
            db.add(user)
            db.flush()
        else:
            user.login = user.login or "uikit03"
            user.display_name = user.display_name or "UIKIT03"
            user.password_hash = hash_password(PASSWORD)

        empty = _base_sheet(
            name="COMP Пустой волшебник",
            classes=[{"id": "wiz1", "name": "Волшебник", "level": 20, "subclass_name": None}],
            spells={
                "casting_ability": "int",
                "max_prepared": 20,
                "slots": {str(i): {"max": 4 if i <= 3 else 2, "used": 0} for i in range(1, 10)},
                "pact_slots": None,
                "known": [
                    {
                        "id": "ff1",
                        "name": "Поиск фамильяра",
                        "catalog_id": None,
                        "level": 1,
                        "prepared": True,
                        "in_spellbook": True,
                        "notes": "",
                        "casting_time": "1 час",
                        "range": "10 фт.",
                        "attack_or_save": "",
                        "damage": "",
                        "concentration": False,
                        "ritual": True,
                        "school": "conjuration",
                        "components": {"v": True, "s": True, "m": "уголь, благовония и трава стоимостью не менее 10 зм, которые заклинание поглощает"},
                        "class_slug": "wizard",
                    }
                ],
                "has_spell_focus": True,
                "has_component_pouch": True,
                "wizard_spellbook": {
                    "primaryBookItemId": "comp01-wizard-book",
                    "bookLost": False,
                    "backupBookItemIds": [],
                },
            },
            companions=[],
        )
        upsert_char(
            db,
            user_id=user.id,
            char_id=EMPTY_WIZ_ID,
            name=empty["name"],
            sheet=empty,
            class_name="Волшебник",
            level=20,
        )

        ranger = _base_sheet(
            name="COMP Следопыт зверь",
            classes=[
                {
                    "id": "rng1",
                    "name": "Следопыт",
                    "level": 3,
                    "subclass_name": "Повелитель зверей",
                }
            ],
            companions=[
                {
                    "id": "beast1",
                    "kind": "beast_companion",
                    "role": "companion",
                    "nature": "living",
                    "name": "Волк",
                    "active": True,
                    "is_primary": True,
                    "stats": {
                        "hp": 11,
                        "hp_max": 11,
                        "ac": 13,
                        "speed": 40,
                        "str": 12,
                        "dex": 15,
                        "con": 12,
                    },
                    "actions": "Укус +4 2к4+2 колющий",
                    "notes": "Спутник архетипа",
                    "source": {
                        "kind": "subclass",
                        "labelRu": "Зверь следопыта",
                        "feature": "rangers_companion",
                        "classEntryId": "rng1",
                    },
                    "initiativeMode": "with_master",
                    "commandCost": "action",
                    "control": "bonus_action_command",
                    "turnMarks": {
                        "action": False,
                        "bonus": False,
                        "reaction": False,
                        "dodge": False,
                        "commanded": False,
                    },
                    "resources": [],
                    "death": None,
                    "mounted": False,
                    "story": False,
                }
            ],
        )
        upsert_char(
            db,
            user_id=user.id,
            char_id=RANGER_ID,
            name=ranger["name"],
            sheet=ranger,
            class_name="Следопыт",
            level=3,
            hp_max=28,
        )

        fam = _base_sheet(
            name="COMP Волшебник фамильяр",
            classes=[{"id": "wiz2", "name": "Волшебник", "level": 3, "subclass_name": None}],
            spells={
                "casting_ability": "int",
                "max_prepared": 6,
                "slots": {
                    "1": {"max": 4, "used": 0},
                    "2": {"max": 2, "used": 0},
                    **{str(i): {"max": 0, "used": 0} for i in range(3, 10)},
                },
                "pact_slots": None,
                "known": [
                    {
                        "id": "ff2",
                        "name": "Поиск фамильяра",
                        "catalog_id": None,
                        "level": 1,
                        "prepared": True,
                        "in_spellbook": True,
                        "notes": "",
                        "casting_time": "1 час",
                        "range": "10 фт.",
                        "attack_or_save": "",
                        "damage": "",
                        "concentration": False,
                        "ritual": True,
                        "school": "conjuration",
                        "components": {
                            "v": True,
                            "s": True,
                            "m": "уголь, благовония и трава стоимостью не менее 10 зм, которые заклинание поглощает",
                        },
                        "class_slug": "wizard",
                    }
                ],
                "has_spell_focus": True,
                "has_component_pouch": False,
                "wizard_spellbook": {
                    "primaryBookItemId": "comp01-fam-wizard-book",
                    "bookLost": False,
                    "backupBookItemIds": [],
                },
            },
            companions=[
                {
                    "id": "fam1",
                    "kind": "familiar",
                    "role": "ally",
                    "nature": "summoned",
                    "name": "Сова",
                    "active": True,
                    "stats": {
                        "hp": 1,
                        "hp_max": 1,
                        "ac": 11,
                        "speed": 5,
                        "speed_fly": 60,
                        "dex": 13,
                    },
                    "actions": "Не атакует; телепатия; передача касания.",
                    "notes": "Заклинание: Поиск фамильяра",
                    "source": {
                        "kind": "spell",
                        "labelRu": "Заклинание: Поиск фамильяра",
                        "feature": "spell:find_familiar",
                        "spellId": "ff2",
                    },
                    "initiativeMode": "own_initiative",
                    "commandCost": "none",
                    "control": "own_initiative",
                    "turnMarks": {
                        "action": False,
                        "bonus": False,
                        "reaction": False,
                        "dodge": False,
                        "commanded": False,
                    },
                    "resources": [],
                    "death": None,
                    "mounted": False,
                    "story": False,
                }
            ],
        )
        upsert_char(
            db,
            user_id=user.id,
            char_id=FAM_WIZ_ID,
            name=fam["name"],
            sheet=fam,
            class_name="Волшебник",
            level=3,
        )

        druid = _base_sheet(
            name="COMP Друид спутник",
            classes=[{"id": "dr1", "name": "Друид", "level": 2, "subclass_name": None}],
            companions=[
                {
                    "id": "wild1",
                    "kind": "familiar",
                    "role": "ally",
                    "nature": "summoned",
                    "name": "Дикий спутник · Сова",
                    "active": True,
                    "stats": {
                        "hp": 1,
                        "hp_max": 1,
                        "ac": 11,
                        "speed": 5,
                        "speed_fly": 60,
                    },
                    "actions": "Не атакует; телепатия; передача касания.",
                    "notes": "Дикий спутник · 1 ч.",
                    "source": {
                        "kind": "class",
                        "labelRu": "Дикий спутник",
                        "feature": "wild_companion",
                    },
                    "initiativeMode": "own_initiative",
                    "commandCost": "none",
                    "control": "own_initiative",
                    "turnMarks": {
                        "action": False,
                        "bonus": False,
                        "reaction": False,
                        "dodge": False,
                        "commanded": False,
                    },
                    "resources": [],
                    "death": None,
                    "mounted": False,
                    "story": False,
                }
            ],
            play={
                "resources": [
                    {
                        "id": "wild_shape:dr1",
                        "name": "Дикий облик",
                        "max": 2,
                        "used": 0,
                        "reset": "short",
                    }
                ],
                "conditions": [],
                "concentration": None,
                "inspiration": False,
                "death_saves": {"successes": 0, "failures": 0},
                "turn_economy": _empty_te(),
            },
        )
        upsert_char(
            db,
            user_id=user.id,
            char_id=DRUID_ID,
            name=druid["name"],
            sheet=druid,
            class_name="Друид",
            level=2,
        )

        steed = _base_sheet(
            name="COMP Паладин скакун",
            classes=[{"id": "pal1", "name": "Паладин", "level": 5, "subclass_name": None}],
            spells={
                "casting_ability": "cha",
                "max_prepared": 4,
                "slots": {
                    "1": {"max": 4, "used": 0},
                    "2": {"max": 2, "used": 0},
                    **{str(i): {"max": 0, "used": 0} for i in range(3, 10)},
                },
                "pact_slots": None,
                "known": [
                    {
                        "id": "fs1",
                        "name": "Поиск скакуна",
                        "catalog_id": None,
                        "level": 2,
                        "prepared": True,
                        "notes": "",
                        "casting_time": "10 минут",
                        "range": "30 фт.",
                        "attack_or_save": "—",
                        "damage": "—",
                        "concentration": False,
                        "ritual": False,
                        "school": "conjuration",
                        "class_slug": "paladin",
                    }
                ],
                "has_spell_focus": True,
                "has_component_pouch": True,
            },
            companions=[
                {
                    "id": "steed1",
                    "kind": "other",
                    "role": "ally",
                    "nature": "summoned",
                    "name": "Боевой конь",
                    "active": True,
                    "steed_spirit_type": "celestial",
                    "stats": {
                        "hp": 19,
                        "hp_max": 19,
                        "ac": 11,
                        "speed": 60,
                        "str": 18,
                        "dex": 12,
                        "con": 13,
                        "int": 6,
                    },
                    "actions": "Копыта +6 2к6+4 дробящий",
                    "notes": "Заклинание: Поиск скакуна",
                    "source": {
                        "kind": "spell",
                        "labelRu": "Заклинание: Поиск скакуна",
                        "feature": "spell:find_steed",
                        "spellId": "fs1",
                    },
                    "initiativeMode": "with_master",
                    "commandCost": "bonus",
                    "control": "bonus_action_command",
                    "turnMarks": {
                        "action": False,
                        "bonus": False,
                        "reaction": False,
                        "dodge": False,
                        "commanded": False,
                    },
                    "resources": [],
                    "death": None,
                    "mounted": False,
                    "story": False,
                }
            ],
        )
        upsert_char(
            db,
            user_id=user.id,
            char_id=STEED_ID,
            name=steed["name"],
            sheet=steed,
            class_name="Паладин",
            level=5,
            hp_max=44,
        )

        db.commit()
        print(
            json.dumps(
                {
                    "email": EMAIL,
                    "password": PASSWORD,
                    "empty": str(EMPTY_WIZ_ID),
                    "ranger": str(RANGER_ID),
                    "familiar": str(FAM_WIZ_ID),
                    "druid": str(DRUID_ID),
                    "steed": str(STEED_ID),
                },
                ensure_ascii=False,
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
