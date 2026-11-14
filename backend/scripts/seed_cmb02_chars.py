#!/usr/bin/env python3
"""CMB-02 seed: paladin 5/11, rogue 5, monk 5, warrior 5 (GWM+Shield Master), warrior 1.

Sheet shape matches frontend draft (top-level weapons/spells/resources/featGrants).

Run from backend/ after DB is up:
  PYTHONPATH=. python scripts/seed_uikit03_hot_chars.py
  PYTHONPATH=. python scripts/seed_lp01_chars.py
  PYTHONPATH=. python scripts/seed_qi01_monk.py
  PYTHONPATH=. python scripts/seed_cmb02_chars.py
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

PAL5_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7")
PAL11_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8")
ROGUE5_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9")
WAR5_ID = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1")
WAR1_ID = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2")


def _skill(proficient: bool = False, expertise: bool = False) -> dict:
    return {"is_proficient": proficient or expertise, "is_expertise": expertise}


def _skills(*keys: str, expertise: tuple[str, ...] = ()) -> dict:
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
    return {k: _skill(k in keys, k in expertise) for k in all_keys}


def _empty_te() -> dict:
    return {
        "action": False,
        "bonus": False,
        "reaction": False,
        "object_interaction": False,
        "movement": False,
    }


def _empty_picks() -> dict:
    return {
        "abilityKeys": {},
        "enumIds": {},
        "enumLists": {},
        "expertiseSkills": [],
        "languages": [],
        "skills": [],
        "tools": [],
        "weapons": [],
    }


def _empty_applied(*, flags: list[str] | None = None) -> dict:
    return {
        "abilityBonuses": {},
        "armorProficiencies": [],
        "weaponNames": [],
        "skills": [],
        "tools": [],
        "languages": [],
        "savingThrows": [],
        "initiativeBonus": 0,
        "speedBonus": 0,
        "passiveBonus": 0,
        "hpPerLevel": 0,
        "acBonusDualWield": 0,
        "flags": flags or [],
        "resource": None,
        "unarmedDamage": None,
        "naturalArmor": None,
        "spells": [],
        "expertiseSkills": [],
        "benefitsRu": "",
        "summaryRu": "",
        "enumPicks": {},
        "enumMultiPicks": {},
    }


def _feat(slug: str, name_ru: str) -> dict:
    return {
        "id": f"feat:{slug}",
        "featCatalogId": slug,
        "slug": slug,
        "nameRu": name_ru,
        "source": {"kind": "manual"},
        "applied": _empty_applied(flags=[slug]),
        "picks": _empty_picks(),
    }


def _weapon(wid: str, name: str, *, ability: str, damage: str, dtype: str, held: bool = True) -> dict:
    return {
        "id": wid,
        "name": name,
        "ability": ability,
        "proficient": True,
        "damage": damage,
        "damage_type": dtype,
        "held": held,
        "qty": 1,
        "inventory_item_id": None,
    }


def paladin_sheet(*, level: int, name_ru: str) -> dict:
    if level >= 9:
        slots = {
            "1": {"max": 4, "used": 0},
            "2": {"max": 3, "used": 0},
            "3": {"max": 3, "used": 0},
        }
    else:
        slots = {
            "1": {"max": 4, "used": 0},
            "2": {"max": 2, "used": 0},
        }
    hp = 34 if level == 5 else 84
    return {
        "identity": {
            "alignment": "Законно-добрый",
            "experience": 6500 if level == 5 else 85000,
            "background": "Благородный",
        },
        "classes": [
            {
                "id": "paladin",
                "name": "Паладин",
                "catalog_id": "paladin",
                "level": level,
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
        "skills": _skills("athletics", "persuasion", "insight", "religion"),
        "combat": {
            "inspiration": False,
            "speed": 30,
            "darkvision": 0,
            "conditions": [],
            "exhaustion": 0,
            "hp_temp": 0,
            "concentration": None,
            "effects": [],
            "hit_die": "d10",
            "hp_dice_current": level,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "turn_economy": _empty_te(),
            "ac": 18,
            "hp_current": hp,
            "hp_max": hp,
        },
        "resources": [
            {
                "id": "feat:lay_on_hands",
                "name": "Возложение рук",
                "max": level * 5,
                "used": 0,
                "reset": "long",
                "onHot": True,
            },
            {
                "id": "feat:divine_sense",
                "name": "Божественное чувство",
                "max": 4,
                "used": 0,
                "reset": "long",
                "onHot": True,
            },
            {
                "id": "feat:channel_divinity:paladin",
                "name": "Божественный канал",
                "max": 1,
                "used": 0,
                "reset": "short",
                "onHot": True,
            },
        ],
        "play": {},
        "inventory": {
            "items": [
                {
                    "id": "i-longsword",
                    "name": "Длинный меч",
                    "qty": 1,
                    "notes": "",
                    "parent_id": None,
                    "equipped": True,
                    "held": True,
                },
                {
                    "id": "i-shield",
                    "name": "Щит",
                    "qty": 1,
                    "notes": "",
                    "parent_id": None,
                    "equipped": True,
                    "held": True,
                },
            ],
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 40, "pp": 0},
            "notes": "",
        },
        "companions": [],
        "spells": {
            "known": [],
            "prepared": [],
            "slots": slots,
            "casting_ability": "cha",
        },
        "weapons": [
            _weapon(
                "w-longsword",
                "Длинный меч",
                ability="str",
                damage="1к8",
                dtype="рубящий",
            ),
        ],
        "text_blocks": [],
        "ui": {},
        "feature_picks": {},
        "feat_grants": [],
        "fighting_style_ids": ["protection"],
        "notes": name_ru,
    }


def rogue5_sheet() -> dict:
    return {
        "identity": {
            "alignment": "Хаотично-нейтральный",
            "experience": 6500,
            "background": "Преступник",
        },
        "classes": [
            {
                "id": "rogue",
                "name": "Плут",
                "catalog_id": "rogue",
                "level": 5,
                "subclass_name": "Вор",
                "subclass_catalog_id": "thief",
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
        "skills": _skills(
            "acrobatics",
            "sleight_of_hand",
            expertise=("stealth", "perception"),
        ),
        "combat": {
            "inspiration": False,
            "speed": 30,
            "darkvision": 60,
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
            "turn_economy": _empty_te(),
            "ac": 14,
            "hp_current": 33,
            "hp_max": 33,
        },
        "resources": [],
        "play": {},
        "inventory": {
            "items": [],
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 25, "pp": 0},
            "notes": "",
        },
        "companions": [],
        "spells": {"known": [], "slots": {}, "casting_ability": None},
        "weapons": [
            _weapon("w-rapier", "Рапира", ability="dex", damage="1к8", dtype="колющий"),
            _weapon(
                "w-shortbow",
                "Короткий лук",
                ability="dex",
                damage="1к6",
                dtype="колющий",
                held=False,
            ),
        ],
        "text_blocks": [],
        "ui": {},
        "feature_picks": {},
        "feat_grants": [],
        "notes": "CMB-02 плут 5",
    }


def warrior_sheet(*, level: int, with_feats: bool, name_ru: str) -> dict:
    feats = (
        [
            _feat("great_weapon_master", "Мастер большого оружия"),
            _feat("shield_master", "Мастер щита"),
        ]
        if with_feats
        else []
    )
    hp = 44 if level >= 5 else 12
    return {
        "identity": {
            "alignment": "Законно-нейтральный",
            "experience": 6500 if level >= 5 else 0,
            "background": "Солдат",
        },
        "classes": [
            {
                "id": "fighter",
                "name": "Воин",
                "catalog_id": "fighter",
                "level": level,
                "subclass_name": "Мастер боевых искусств" if level >= 3 else None,
                "subclass_catalog_id": "battle_master" if level >= 3 else None,
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
        "skills": _skills("athletics", "intimidation", "perception", "survival"),
        "combat": {
            "inspiration": False,
            "speed": 30,
            "darkvision": 0,
            "conditions": [],
            "exhaustion": 0,
            "hp_temp": 0,
            "concentration": None,
            "effects": [],
            "hit_die": "d10",
            "hp_dice_current": level,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "turn_economy": _empty_te(),
            "ac": 16,
            "hp_current": hp,
            "hp_max": hp,
        },
        "resources": [
            {
                "id": "feat:second_wind",
                "name": "Второе дыхание",
                "max": 1,
                "used": 0,
                "reset": "short",
                "onHot": True,
            },
            *(
                [
                    {
                        "id": "feat:action_surge",
                        "name": "Всплеск действий",
                        "max": 1,
                        "used": 0,
                        "reset": "short",
                        "onHot": True,
                    },
                    {
                        "id": "feat:superiority_dice",
                        "name": "Кости превосходства",
                        "max": 4,
                        "used": 0,
                        "reset": "short",
                        "onHot": True,
                    },
                ]
                if level >= 3
                else []
            ),
        ],
        "play": {},
        "inventory": {
            "items": [
                {
                    "id": "i-shield",
                    "name": "Щит",
                    "qty": 1,
                    "notes": "",
                    "parent_id": None,
                    "equipped": True,
                    "held": True,
                }
            ],
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 15, "pp": 0},
            "notes": "",
        },
        "companions": [],
        "spells": {"known": [], "slots": {}, "casting_ability": None},
        "weapons": [
            _weapon(
                "w-greataxe",
                "Секира",
                ability="str",
                damage="1к12",
                dtype="рубящий",
            ),
        ],
        "text_blocks": [],
        "ui": {},
        "feature_picks": {},
        "feat_grants": feats,
        "fighting_style_ids": ["protection"] if with_feats else ["great_weapon_fighting"],
        "notes": name_ru,
    }


def upsert(db, user_id: uuid.UUID, char_id: uuid.UUID, name: str, sheet: dict) -> None:
    row = db.query(Character).filter(Character.id == char_id).one_or_none()
    now = datetime.now(timezone.utc)
    if row is None:
        db.add(
            Character(
                id=char_id,
                user_id=user_id,
                name=name,
                sheet=sheet,
                rules_edition=RulesEdition.edition_2014,
                created_at=now,
                updated_at=now,
            )
        )
        print("created", char_id, name)
    else:
        row.name = name
        row.sheet = sheet
        row.rules_edition = RulesEdition.edition_2014
        row.updated_at = now
        print("updated", char_id, name)


def main() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).one_or_none()
        if user is None:
            user = User(
                email=EMAIL,
                login="uikit03",
                password_hash=hash_password(PASSWORD),
            )
            db.add(user)
            db.flush()
            print("user created", user.id)
        upsert(
            db,
            user.id,
            PAL5_ID,
            "CMB-02 Паладин 5",
            paladin_sheet(level=5, name_ru="CMB-02 паладин 5"),
        )
        upsert(
            db,
            user.id,
            PAL11_ID,
            "CMB-02 Паладин 11",
            paladin_sheet(level=11, name_ru="CMB-02 паладин 11"),
        )
        upsert(db, user.id, ROGUE5_ID, "CMB-02 Плут 5", rogue5_sheet())
        upsert(
            db,
            user.id,
            WAR5_ID,
            "CMB-02 Воин 5 (GWM+щит)",
            warrior_sheet(
                level=5,
                with_feats=True,
                name_ru="CMB-02 воин 5 GWM+Shield Master",
            ),
        )
        upsert(
            db,
            user.id,
            WAR1_ID,
            "CMB-02 Воин 1",
            warrior_sheet(level=1, with_feats=False, name_ru="CMB-02 воин 1"),
        )
        db.commit()
        print(
            json.dumps(
                {
                    "email": EMAIL,
                    "password": PASSWORD,
                    "paladin5": str(PAL5_ID),
                    "paladin11": str(PAL11_ID),
                    "rogue5": str(ROGUE5_ID),
                    "warrior5": str(WAR5_ID),
                    "warrior1": str(WAR1_ID),
                    "monk5": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6",
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
