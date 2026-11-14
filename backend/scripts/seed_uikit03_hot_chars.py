#!/usr/bin/env python3
"""Seed HOT-01 / UIKIT-03 real-sheet characters (no migrations).

Creates user uikit03@example.com / uikit03-dev and two fixed-id sheets:
  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1 — Даррак Железный Кулак (Жрец 3 / Буря)
  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2 — Торбин Громовержец… (мультикласс)

HOT-01: do NOT pre-seed class pools with ad-hoc ids (wrath/channel/sd).
Those collided with feat:* rows from syncFeatureResources and doubled the hot bar.
Leave play.resources empty — the sheet sync fills feat: pools from unlocked features.
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
DARRACK_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1")
TORBIN_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2")


def effect(**kw):
    return kw


CLERIC_EFFECTS = [
    effect(
        id="fx-mage-armor",
        name="Усиленная защита",
        slug="mage_armor",
        ac_bonus=1,
        source_name="Доспех мага",
    ),
    effect(
        id="fx-bless",
        name="Благословение",
        slug="bless",
        source_name="Союзник",
        linked_concentration=True,
        duration={"unit": "rounds", "value": 10, "remaining_rounds": 9},
    ),
    effect(
        id="fx-fire-res",
        name="Сопротивление огню",
        slug="fire_resistance",
        source_name="Кольцо",
    ),
    effect(
        id="fx-haste",
        name="Ускорение",
        slug="haste",
        ac_bonus=2,
        source_name="Союзник",
        linked_concentration=True,
        duration={"unit": "rounds", "value": 10, "remaining_rounds": 8},
    ),
    effect(
        id="fx-heroism",
        name="Героизм",
        slug="heroism",
        source_name="Союзник",
        linked_concentration=True,
        mods=[{"target": "temp_hp", "op": "set", "value": 4}],
        duration={"unit": "rounds", "value": 10, "remaining_rounds": 7},
    ),
    effect(
        id="fx-sof",
        name="Щит веры",
        slug="shield_of_faith",
        ac_bonus=2,
        source_name="Даррак",
        linked_concentration=True,
        duration={"unit": "rounds", "value": 10, "remaining_rounds": 9},
    ),
]

MAX_EFFECTS = CLERIC_EFFECTS + [
    effect(
        id="fx-barkskin",
        name="Дубовая кожа",
        slug="barkskin",
        source_name="Друид",
        linked_concentration=True,
        duration={"unit": "rounds", "value": 60, "remaining_rounds": 40},
    ),
    effect(
        id="fx-longstrider",
        name="Скороход +10 фт",
        slug="longstrider",
        source_name="Свиток",
        duration={"unit": "hours", "value": 1, "remaining_rounds": 600},
    ),
    effect(
        id="fx-aid",
        name="Подмога +5 хитов",
        slug="aid",
        source_name="Жрец",
    ),
    effect(
        id="fx-prot-energy",
        name="Защита от энергии",
        slug="protection_from_energy",
        source_name="Союзник",
        linked_concentration=True,
        duration={"unit": "rounds", "value": 10, "remaining_rounds": 6},
    ),
]


def sheet_common(
    *,
    classes,
    identity,
    combat,
    companions,
    inventory_coins,
    conditions,
    concentration,
    effects,
    exhaustion=0,
    hp_temp=0,
):
    """Sheet shape matches frontend readPlay: combat.* + top-level resources."""
    combat_full = {
        **combat,
        "conditions": conditions,
        "exhaustion": exhaustion,
        "hp_temp": hp_temp,
        "concentration": concentration,
        "effects": effects,
        "hit_die": "d8",
        "hp_dice_current": max(1, sum(c.get("level", 0) for c in classes) or 1),
        "is_dying": False,
        "death_successes": 0,
        "death_fails": 0,
        "turn_economy": {
            "action": False,
            "bonus": False,
            "reaction": False,
            "movement": False,
        },
    }
    return {
        "identity": identity,
        "classes": classes,
        "abilities": {
            "str": {"score": 16},
            "dex": {"score": 14},
            "con": {"score": 14},
            "int": {"score": 10},
            "wis": {"score": 16},
            "cha": {"score": 12},
        },
        "combat": combat_full,
        # HOT-01: leave empty — syncFeatureResources fills feat: pools (no manual wrath/channel)
        "resources": [],
        "play": {},
        "inventory": {
            "items": [
                {
                    "id": "shield-1",
                    "name": "Щит",
                    "equipped": True,
                    "qty": 1,
                    "kind": "armor",
                    "armor_category": "shield",
                },
                {
                    "id": "mail-1",
                    "name": "Кольчуга",
                    "equipped": True,
                    "qty": 1,
                    "kind": "armor",
                    "armor_category": "heavy",
                },
            ],
            "coins": inventory_coins,
            "notes": "",
        },
        "companions": companions,
        "spells": {"known": [], "slots": {}, "casting_ability": None},
        "weapons": [],
        "text_blocks": [],
        "ui": {},
        "subclassGrants": [],
        "subclassTransitions": [],
        "featurePicks": {},
    }


def main() -> None:
    db = SessionLocal()
    user = db.query(User).filter(User.email == EMAIL).one_or_none()
    if user is None:
        old = db.query(User).filter(User.login == "uikit03").one_or_none()
        if old:
            old.email = EMAIL
            old.password_hash = hash_password(PASSWORD)
            old.email_verified_at = datetime.now(timezone.utc)
            db.commit()
            user = old
        else:
            user = User(
                id=uuid.uuid4(),
                email=EMAIL,
                password_hash=hash_password(PASSWORD),
                login="uikit03",
                display_name="UIKIT03",
                email_verified_at=datetime.now(timezone.utc),
                theme_id="wis",
                ability_colors="identity",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        user.password_hash = hash_password(PASSWORD)
        user.email_verified_at = datetime.now(timezone.utc)
        db.commit()
    print("user", user.id, EMAIL)

    for cid in (DARRACK_ID, TORBIN_ID):
        row = db.get(Character, cid)
        if row:
            db.delete(row)
    db.commit()

    darrack_sheet = sheet_common(
        classes=[
            {
                "id": "cleric",
                "name": "Жрец",
                "catalog_id": "cleric",
                "level": 3,
                "subclass_name": "Домен бури",
                "subclass_catalog_id": "tempest_domain",
            }
        ],
        identity={
            "alignment": "Хаотично-нейтральный",
            "experience": 900,
            "background": "Солдат",
        },
        combat={
            "inspiration": False,
            "speed": 25,
            "climb_speed": 10,
            "swim_speed": 10,
            "fly_speed": 10,
            "initiative": 0,
            "ac": None,
            "ac_formula_key": None,
        },
        conditions=[{"slug": "deafened", "name": "Оглохший", "catalog_id": None}],
        concentration={"name": "Щит веры", "spell_id": "shield_of_faith"},
        effects=CLERIC_EFFECTS,
        exhaustion=0,
        hp_temp=0,
        companions=[
            {
                "id": "c1",
                "name": "Волк",
                "kind": "beast",
                "hp_current": 11,
                "hp_max": 11,
            },
            {
                "id": "c2",
                "name": "Ястреб",
                "kind": "beast",
                "hp_current": 1,
                "hp_max": 1,
            },
        ],
        inventory_coins={"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0},
    )

    torbin_sheet = sheet_common(
        classes=[
            {
                "id": "fighter",
                "name": "Воин",
                "catalog_id": "fighter",
                "level": 3,
                "subclass_name": "Мастер боевых искусств",
                "subclass_catalog_id": "battle_master",
            },
            {
                "id": "rogue",
                "name": "Плут",
                "catalog_id": "rogue",
                "level": 2,
                "subclass_name": "Вор",
                "subclass_catalog_id": "thief",
            },
            {
                "id": "wizard",
                "name": "Волшебник",
                "catalog_id": "wizard",
                "level": 2,
                "subclass_name": "Школа воплощения",
                "subclass_catalog_id": "evocation",
            },
            {
                "id": "bard",
                "name": "Бард",
                "catalog_id": "bard",
                "level": 1,
                "subclass_name": "Коллегия доблести",
                "subclass_catalog_id": "valor",
            },
        ],
        identity={
            "alignment": "Законно-добрый",
            "experience": 34000,
            "background": "Народный герой",
        },
        combat={
            "inspiration": True,
            "speed": 35,
            "climb_speed": 20,
            "swim_speed": 20,
            "fly_speed": 30,
            "initiative": 4,
            "ac": None,
        },
        # HOT-01: 5 states → fixed-width card shows chips + «+N»
        conditions=[
            {"slug": "blinded", "name": "Ослеплённый", "catalog_id": None},
            {"slug": "poisoned", "name": "Отравленный", "catalog_id": None},
            {"slug": "frightened", "name": "Испуганный", "catalog_id": None},
            {"slug": "grappled", "name": "Схваченный", "catalog_id": None},
            {"slug": "prone", "name": "Сбит с ног", "catalog_id": None},
        ],
        concentration={"name": "Щит веры", "spell_id": "shield_of_faith"},
        effects=MAX_EFFECTS,
        exhaustion=2,
        hp_temp=12,
        companions=[
            {
                "id": "t1",
                "name": "Медведь",
                "kind": "beast",
                "hp_current": 34,
                "hp_max": 34,
            },
            {
                "id": "t2",
                "name": "Скакун",
                "kind": "mount",
                "hp_current": 22,
                "hp_max": 22,
            },
            {
                "id": "t3",
                "name": "Фамильяр",
                "kind": "familiar",
                "hp_current": 2,
                "hp_max": 2,
            },
        ],
        inventory_coins={"cp": 0, "sp": 0, "ep": 0, "gp": 1234567, "pp": 0},
    )

    db.add(
        Character(
            id=DARRACK_ID,
            user_id=user.id,
            name="Даррак Железный Кулак",
            race_name="Дварф (горный)",
            class_name="Жрец 3",
            level=3,
            hp_current=13,
            hp_max=27,
            rules_edition=RulesEdition.edition_2014,
            sheet=darrack_sheet,
            sheet_version=1,
            is_draft=False,
        )
    )
    db.add(
        Character(
            id=TORBIN_ID,
            user_id=user.id,
            name="Торбин Громовержец Железной Горы",
            race_name="Дварф холмов (щитовой, клан Громовой Кузни)",
            class_name="Мультикласс 8",
            level=8,
            hp_current=48,
            hp_max=62,
            rules_edition=RulesEdition.edition_2014,
            sheet=torbin_sheet,
            sheet_version=1,
            is_draft=False,
        )
    )
    db.commit()
    print("seeded", DARRACK_ID, TORBIN_ID)
    print(json.dumps({"email": EMAIL, "password": PASSWORD}, ensure_ascii=False))


if __name__ == "__main__":
    main()
