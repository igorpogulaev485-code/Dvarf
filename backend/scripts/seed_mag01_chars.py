#!/usr/bin/env python3
"""MAG-01 seed: wizard 20, sorcerer 20, bard/cleric/wizard 2, paladin2/warlock3, cleric 5, rogue 5.

Run from backend/ after DB is up:
  PYTHONPATH=. python scripts/seed_mag01_chars.py
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

WIZ20_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc01")
SORC20_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc02")
MULTI3_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc03")
PAL_WL_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc04")
CLERIC5_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc05")
ROGUE5_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc06")
DRUID5_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc07")
WARLOCK1_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc08")


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


def _spell(
    sid: str,
    name: str,
    level: int,
    *,
    prepared: bool = True,
    class_slug: str | None = None,
    ritual: bool = False,
    concentration: bool = False,
    casting_time: str = "1 действие",
    range_: str = "60 фт.",
    attack_or_save: str = "—",
    damage: str = "—",
    components: dict | None = None,
    source_kind: str | None = None,
    prepare_source_label: str | None = None,
    spellbook_acquisition: str | None = None,
    in_spellbook: bool | None = None,
    school: str | None = None,
) -> dict:
    row = {
        "id": sid,
        "name": name,
        "catalog_id": sid.replace(":", "-"),
        "level": level,
        "prepared": prepared if level > 0 else True,
        "notes": "",
        "casting_time": casting_time,
        "range": range_,
        "attack_or_save": attack_or_save,
        "damage": damage,
        "concentration": concentration,
        "ritual": ritual,
        "school": school or "воплощение",
        "components": components or {"v": True, "s": True, "m": None},
    }
    if class_slug:
        row["class_slug"] = class_slug
    if source_kind:
        row["source_kind"] = source_kind
    if prepare_source_label:
        row["prepare_source_label"] = prepare_source_label
    if spellbook_acquisition:
        row["spellbook_acquisition"] = spellbook_acquisition
    if in_spellbook is not None:
        row["in_spellbook"] = in_spellbook
    return row


def _full_slots() -> dict:
    return {
        "1": {"max": 4, "used": 0},
        "2": {"max": 3, "used": 0},
        "3": {"max": 3, "used": 0},
        "4": {"max": 3, "used": 0},
        "5": {"max": 3, "used": 0},
        "6": {"max": 2, "used": 0},
        "7": {"max": 2, "used": 0},
        "8": {"max": 1, "used": 0},
        "9": {"max": 1, "used": 0},
    }


def wizard20_sheet() -> dict:
    book = []
    # 5 cantrips incl. racial Mage Hand
    book.append(
        _spell(
            "wiz:mage-hand-race",
            "Волшебная рука",
            0,
            class_slug="wizard",
            source_kind="race",
            prepare_source_label="Высший эльф",
            casting_time="1 действие",
            range_="30 фт.",
        )
    )
    for i, name in enumerate(
        ["Огненный снаряд", "Свет", "Фокусы", "Леденящее прикосновение"],
        start=1,
    ):
        book.append(_spell(f"wiz:cantrip-{i}", name, 0, class_slug="wizard"))
    # Book spells (tagged) — some prepared, some ritual unprepared
    leveled = [
        ("Волшебная стрела", 1, True, False),
        ("Щит", 1, True, False),
        ("Обнаружение магии", 1, False, True),
        ("Понимание языков", 1, False, True),
        ("Туманное облако", 1, True, False),
        ("Невидимость", 2, True, False),
        ("Паутина", 2, True, False),
        ("Огненный шар", 3, True, False),
        ("Контрзаклинание", 3, True, False),
        ("Превращение", 4, True, True),
        ("Стена огня", 4, True, False),
        ("Конус холода", 5, True, False),
        ("Телекинез", 5, True, False),
        ("Цепь молний", 6, True, False),
        ("Рассеивание магии высшего круга", 6, False, False),
        ("Перст смерти", 7, True, False),
        ("Лабиринт", 8, True, False),
        ("Желание", 9, True, False),
        ("Связь с иным миром", 5, False, True),
        ("Опознание", 1, False, True),
    ]
    for i, (name, lv, prep, ritual) in enumerate(leveled, start=1):
        book.append(
            _spell(
                f"wiz:book-{i}",
                name,
                lv,
                prepared=prep,
                class_slug="wizard",
                ritual=ritual,
                concentration=name in {"Невидимость", "Паутина", "Превращение", "Телекинез"},
                spellbook_acquisition="starting" if i <= 6 else "level_up",
                in_spellbook=True,
                damage="8к6 огонь" if name == "Огненный шар" else "—",
                attack_or_save="спас Ловкости" if name == "Огненный шар" else "—",
            )
        )
    # pad book toward ~44
    for i in range(21, 45):
        book.append(
            _spell(
                f"wiz:pad-{i}",
                f"Заклинание книги {i}",
                1 + (i % 5),
                prepared=False,
                class_slug="wizard",
                spellbook_acquisition="level_up",
                in_spellbook=True,
            )
        )
    return {
        "identity": {"alignment": "Нейтральный", "experience": 355000, "background": "Мудрец"},
        "race": {"name": "Высший эльф", "slug": "high_elf"},
        "classes": [
            {
                "id": "wizard",
                "name": "Волшебник",
                "catalog_id": "wizard",
                "level": 20,
                "subclass_name": "Школа воплощения",
                "subclass_catalog_id": "evocation",
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
        "saves": {"int": {"is_proficient": True}, "wis": {"is_proficient": True}},
        "skills": _skills("arcana", "history", "investigation", "perception"),
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
            "turn_economy": _empty_te(),
            "ac": 12,
            "hp_current": 122,
            "hp_max": 122,
        },
        "resources": [],
        "weapons": [],
        "spells": {
            "casting_ability": "int",
            "max_prepared": 25,
            "slots": _full_slots(),
            "pact_slots": None,
            "known": book,
            "has_spell_focus": True,
            "has_component_pouch": True,
            "wizard_spellbook": {
                "bookLost": False,
                "primaryBookItemId": "inv-spellbook",
            },
        },
        "inventory": {
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 50, "pp": 0},
            "items": [
                {
                    "id": "inv-spellbook",
                    "name": "Книга заклинаний",
                    "qty": 1,
                    "equipped": False,
                    "catalog_slug": "spellbook",
                }
            ],
        },
        "feature_picks": {"values": {}},
        "notes": "MAG-01 волшебник 20",
    }


def sorcerer20_sheet() -> dict:
    known = [
        _spell("sorc:fire-bolt", "Огненный снаряд", 0, class_slug="sorcerer", damage="3к10 огонь", attack_or_save="атака"),
        _spell("sorc:mage-hand", "Волшебная рука", 0, class_slug="sorcerer"),
        _spell("sorc:presti", "Фокусы", 0, class_slug="sorcerer"),
        _spell("sorc:ray", "Луч холода", 0, class_slug="sorcerer", damage="3к8 холод", attack_or_save="атака"),
        _spell("sorc:mm", "Волшебная стрела", 1, class_slug="sorcerer", damage="3к4+3 силовое"),
        _spell("sorc:shield", "Щит", 1, class_slug="sorcerer", casting_time="1 реакция"),
        _spell("sorc:scorch", "Палящий луч", 2, class_slug="sorcerer", damage="2к6 огонь", attack_or_save="атака"),
        _spell("sorc:fb", "Огненный шар", 3, class_slug="sorcerer", damage="8к6 огонь", attack_or_save="спас Ловкости", range_="150 футов"),
        _spell("sorc:haste", "Ускорение", 3, class_slug="sorcerer", concentration=True),
        _spell("sorc:poly", "Превращение", 4, class_slug="sorcerer", concentration=True, ritual=False),
        _spell("sorc:cone", "Конус холода", 5, class_slug="sorcerer", damage="8к8 холод", attack_or_save="спас Телосложения"),
        _spell("sorc:chain", "Цепь молний", 6, class_slug="sorcerer", damage="10к8 электричество"),
        _spell("sorc:finger", "Перст смерти", 7, class_slug="sorcerer"),
        _spell("sorc:sunburst", "Солнечный взрыв", 8, class_slug="sorcerer"),
        _spell("sorc:wish", "Желание", 9, class_slug="sorcerer"),
    ]
    return {
        "identity": {"alignment": "Хаотично-добрый", "experience": 355000, "background": "Артист"},
        "race": {"name": "Человек", "slug": "human"},
        "classes": [
            {
                "id": "sorcerer",
                "name": "Чародей",
                "catalog_id": "sorcerer",
                "level": 20,
                "subclass_name": "Наследие драконьей крови",
                "subclass_catalog_id": "draconic_bloodline",
            }
        ],
        "abilities": {
            "str": {"score": 10},
            "dex": {"score": 14},
            "con": {"score": 16},
            "int": {"score": 10},
            "wis": {"score": 10},
            "cha": {"score": 20},
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
            "hp_dice_current": 20,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "turn_economy": _empty_te(),
            "ac": 16,
            "hp_current": 162,
            "hp_max": 162,
        },
        "resources": [
            {
                "id": "feat:sorcery_points:sorcerer",
                "name": "Очки чародейства",
                "max": 20,
                "used": 0,
                "reset": "long",
                "track": "pool",
            }
        ],
        "weapons": [],
        "spells": {
            "casting_ability": "cha",
            "max_prepared": None,
            "slots": _full_slots(),
            "pact_slots": None,
            "known": known,
            "has_spell_focus": True,
            "has_component_pouch": True,
        },
        "inventory": {
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 40, "pp": 0},
            "items": [
                {
                    "id": "mag01-sorc-pouch",
                    "name": "Мешочек с компонентами",
                    "qty": 1,
                    "spell_tooling": "component_pouch",
                }
            ],
        },
        "feature_picks": {
            "values": {
                "sorcerer:dragon_ancestor": "red",
                "sorcerer:metamagic": "careful,distant,empowered,extended,heightened,quickened,subtle,twinned,seeking,transmuted",
            }
        },
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
        "notes": "MAG-01 чародей 20",
    }


def multi3_sheet() -> dict:
    known = [
        _spell("b:mage-hand", "Волшебная рука", 0, class_slug="bard"),
        _spell("b:vicious", "Злая насмешка", 0, class_slug="bard"),
        _spell("b:healing", "Лечение ран", 1, class_slug="bard"),
        _spell("b:faerie", "Огонь фей", 1, class_slug="bard", concentration=True),
        _spell("c:sacred", "Священное пламя", 0, class_slug="cleric"),
        _spell("c:guidance", "Указание", 0, class_slug="cleric", concentration=True),
        _spell("c:bless", "Благословение", 1, class_slug="cleric", concentration=True),
        _spell("c:cure", "Лечение ран", 1, class_slug="cleric"),
        _spell("c:shield-faith", "Щит веры", 1, class_slug="cleric", concentration=True),
        _spell("w:mage-hand", "Волшебная рука", 0, class_slug="wizard"),
        _spell("w:fire-bolt", "Огненный снаряд", 0, class_slug="wizard", damage="1к10 огонь", attack_or_save="атака"),
        _spell(
            "w:mm",
            "Волшебная стрела",
            1,
            prepared=True,
            class_slug="wizard",
            spellbook_acquisition="starting",
            in_spellbook=True,
        ),
        _spell(
            "w:shield",
            "Щит",
            1,
            prepared=True,
            class_slug="wizard",
            spellbook_acquisition="starting",
            in_spellbook=True,
            casting_time="1 реакция",
        ),
        _spell(
            "w:detect",
            "Обнаружение магии",
            1,
            prepared=False,
            class_slug="wizard",
            ritual=True,
            spellbook_acquisition="starting",
            in_spellbook=True,
        ),
    ]
    return {
        "identity": {"alignment": "Нейтральный", "experience": 2700, "background": "Артист"},
        "race": {"name": "Полуэльф", "slug": "half_elf"},
        "classes": [
            {"id": "bard", "name": "Бард", "catalog_id": "bard", "level": 2, "subclass_name": None},
            {
                "id": "cleric",
                "name": "Жрец",
                "catalog_id": "cleric",
                "level": 2,
                "subclass_name": "Домен жизни",
            },
            {
                "id": "wizard",
                "name": "Волшебник",
                "catalog_id": "wizard",
                "level": 2,
                "subclass_name": None,
            },
        ],
        "abilities": {
            "str": {"score": 8},
            "dex": {"score": 14},
            "con": {"score": 12},
            "int": {"score": 14},
            "wis": {"score": 14},
            "cha": {"score": 16},
        },
        "saves": {"dex": {"is_proficient": True}, "cha": {"is_proficient": True}},
        "skills": _skills("performance", "persuasion", "insight", "arcana"),
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
            "hp_dice_current": 6,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "turn_economy": _empty_te(),
            "ac": 13,
            "hp_current": 36,
            "hp_max": 36,
        },
        "resources": [],
        "weapons": [],
        "spells": {
            "casting_ability": "cha",
            "max_prepared": None,
            "slots": {
                "1": {"max": 4, "used": 0},
                "2": {"max": 3, "used": 0},
                "3": {"max": 3, "used": 0},
            },
            "pact_slots": None,
            "known": known,
            "has_spell_focus": True,
            "has_component_pouch": True,
            "wizard_spellbook": {
                "bookLost": False,
                "primaryBookItemId": "inv-book",
            },
        },
        "inventory": {
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 20, "pp": 0},
            "items": [
                {
                    "id": "inv-book",
                    "name": "Книга заклинаний",
                    "qty": 1,
                    "equipped": False,
                    "catalog_slug": "spellbook",
                }
            ],
        },
        "feature_picks": {"values": {}},
        "notes": "MAG-01 бард 2 / жрец 2 / волшебник 2",
    }


def paladin_warlock_sheet() -> dict:
    known = [
        _spell("wl:eldritch", "Мистический заряд", 0, class_slug="warlock", damage="1к10 силовое", attack_or_save="атака"),
        _spell("wl:hex", "Проклятие", 1, class_slug="warlock", concentration=True, prepared=True),
        _spell("wl:armor", "Доспех Агатиса", 1, class_slug="warlock", prepared=True),
        _spell("pal:bless", "Благословение", 1, class_slug="paladin", prepared=False, concentration=True),
        _spell("pal:cure", "Лечение ран", 1, class_slug="paladin", prepared=False),
        _spell("pal:shield", "Щит веры", 1, class_slug="paladin", prepared=False, concentration=True),
        _spell("pal:smite", "Божественная кара", 1, class_slug="paladin", prepared=False),
        _spell(
            "pal:steed",
            "Поиск скакуна",
            2,
            class_slug="paladin",
            prepared=True,
            casting_time="10 минут",
            range_="30 фт.",
        ),
    ]
    return {
        "identity": {"alignment": "Законно-добрый", "experience": 6500, "background": "Благородный"},
        "race": {"name": "Человек", "slug": "human"},
        "classes": [
            {
                "id": "paladin",
                "name": "Паладин",
                "catalog_id": "paladin",
                "level": 5,
                "subclass_name": "Клятва преданности",
                "subclass_catalog_id": "oath_of_devotion",
            },
            {
                "id": "warlock",
                "name": "Колдун",
                "catalog_id": "warlock",
                "level": 3,
                "subclass_name": "Архифея",
                "subclass_catalog_id": "the_archfey",
            },
        ],
        "abilities": {
            "str": {"score": 16},
            "dex": {"score": 10},
            "con": {"score": 14},
            "int": {"score": 8},
            "wis": {"score": 10},
            "cha": {"score": 16},
        },
        "saves": {"wis": {"is_proficient": True}, "cha": {"is_proficient": True}},
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
            "hp_dice_current": 5,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "turn_economy": _empty_te(),
            "ac": 18,
            "hp_current": 40,
            "hp_max": 40,
        },
        "resources": [],
        "weapons": [
            {
                "id": "w-longsword",
                "name": "Длинный меч",
                "ability": "str",
                "proficient": True,
                "damage": "1к8",
                "damage_type": "рубящий",
                "held": True,
                "qty": 1,
            }
        ],
        "spells": {
            "casting_ability": "cha",
            "max_prepared": 4,
            "slots": {"1": {"max": 3, "used": 0}, "2": {"max": 1, "used": 0}},
            "pact_slots": {"max": 2, "used": 0, "level": 2},
            "known": known,
            "has_spell_focus": True,
            "has_component_pouch": True,
        },
        "inventory": {"coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 25, "pp": 0}, "items": []},
        "feature_picks": {"values": {}},
        "notes": "MAG-01 паладин 2 / колдун 3",
    }


def cleric5_sheet() -> dict:
    known = [
        _spell("cl:sacred", "Священное пламя", 0, class_slug="cleric"),
        _spell("cl:guidance", "Указание", 0, class_slug="cleric", concentration=True),
        _spell("cl:thaum", "Чудотворство", 0, class_slug="cleric"),
        _spell("cl:bless", "Благословение", 1, class_slug="cleric", concentration=True),
        _spell("cl:cure", "Лечение ран", 1, class_slug="cleric"),
        _spell("cl:shield", "Щит веры", 1, class_slug="cleric", concentration=True),
        _spell("cl:aid", "Помощь", 2, class_slug="cleric"),
        _spell("cl:hold", "Удержание личности", 2, class_slug="cleric", concentration=True),
        _spell("cl:spirit", "Духовные стражи", 3, class_slug="cleric", concentration=True),
    ]
    return {
        "identity": {"alignment": "Законно-добрый", "experience": 6500, "background": "Аколит"},
        "race": {"name": "Человек", "slug": "human"},
        "classes": [
            {
                "id": "cleric",
                "name": "Жрец",
                "catalog_id": "cleric",
                "level": 5,
                "subclass_name": "Домен жизни",
            }
        ],
        "abilities": {
            "str": {"score": 14},
            "dex": {"score": 10},
            "con": {"score": 14},
            "int": {"score": 10},
            "wis": {"score": 16},
            "cha": {"score": 12},
        },
        "saves": {"wis": {"is_proficient": True}, "cha": {"is_proficient": True}},
        "skills": _skills("medicine", "insight", "religion", "persuasion"),
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
            "turn_economy": _empty_te(),
            "ac": 18,
            "hp_current": 38,
            "hp_max": 38,
        },
        "resources": [],
        "weapons": [],
        "spells": {
            "casting_ability": "wis",
            "max_prepared": 8,
            "slots": {
                "1": {"max": 4, "used": 0},
                "2": {"max": 3, "used": 0},
                "3": {"max": 2, "used": 0},
            },
            "pact_slots": None,
            "known": known,
            "has_spell_focus": True,
            "has_component_pouch": True,
        },
        "inventory": {"coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 15, "pp": 0}, "items": []},
        "feature_picks": {"values": {}},
        "notes": "MAG-01 жрец 5",
    }


def rogue5_sheet() -> dict:
    return {
        "identity": {"alignment": "Хаотично-нейтральный", "experience": 6500, "background": "Преступник"},
        "race": {"name": "Халфлинг", "slug": "halfling"},
        "classes": [
            {
                "id": "rogue",
                "name": "Плут",
                "catalog_id": "rogue",
                "level": 5,
                "subclass_name": "Вор",
            }
        ],
        "abilities": {
            "str": {"score": 10},
            "dex": {"score": 16},
            "con": {"score": 12},
            "int": {"score": 12},
            "wis": {"score": 12},
            "cha": {"score": 14},
        },
        "saves": {"dex": {"is_proficient": True}, "int": {"is_proficient": True}},
        "skills": _skills("stealth", "sleight_of_hand", "perception", "deception", expertise=("stealth",)),
        "combat": {
            "inspiration": False,
            "speed": 25,
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
            "turn_economy": _empty_te(),
            "ac": 15,
            "hp_current": 33,
            "hp_max": 33,
        },
        "resources": [],
        "weapons": [
            {
                "id": "w-shortsword",
                "name": "Короткий меч",
                "ability": "dex",
                "proficient": True,
                "damage": "1к6",
                "damage_type": "колющий",
                "held": True,
                "qty": 1,
            }
        ],
        "spells": {
            "casting_ability": None,
            "max_prepared": None,
            "slots": {},
            "pact_slots": None,
            "known": [],
            "has_spell_focus": False,
            "has_component_pouch": False,
        },
        "inventory": {"coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 30, "pp": 0}, "items": []},
        "feature_picks": {"values": {}},
        "notes": "MAG-01 плут 5 без магии",
    }


def druid5_moon_sheet() -> dict:
    """Друид 5 · Круг луны — карточка «Круг друидов» должна показывать выбранный круг."""
    known = [
        _spell("dr:produce", "Друдкрафт", 0, class_slug="druid"),
        _spell("dr:guidance", "Указание", 0, class_slug="druid", concentration=True),
        _spell("dr:shillelagh", "Дубинка", 0, class_slug="druid"),
        _spell("dr:entangle", "Опутывание", 1, class_slug="druid", concentration=True),
        _spell("dr:cure", "Лечение ран", 1, class_slug="druid"),
        _spell("dr:moonbeam", "Лунный луч", 2, class_slug="druid", concentration=True),
        _spell("dr:spike", "Шипы", 2, class_slug="druid", concentration=True),
        _spell("dr:conjure", "Призыв животных", 3, class_slug="druid", concentration=True),
    ]
    return {
        "identity": {"alignment": "Нейтральный", "experience": 6500, "background": "Отшельник"},
        "race": {"name": "Лесной эльф", "slug": "wood-elf"},
        "classes": [
            {
                "id": "druid",
                "name": "Друид",
                "catalog_id": "druid",
                "level": 5,
                "subclass_name": "Круг луны",
                "subclass_catalog_id": "circle_of_the_moon",
            }
        ],
        "abilities": {
            "str": {"score": 10},
            "dex": {"score": 14},
            "con": {"score": 14},
            "int": {"score": 10},
            "wis": {"score": 16},
            "cha": {"score": 10},
        },
        "saves": {"int": {"is_proficient": True}, "wis": {"is_proficient": True}},
        "skills": _skills("nature", "perception", "survival", "animal_handling"),
        "combat": {
            "inspiration": False,
            "speed": 35,
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
            "hp_current": 38,
            "hp_max": 38,
        },
        "resources": [
            {
                "id": "wild_shape",
                "name": "Дикий облик",
                "max": 2,
                "used": 0,
                "recharge": "short_rest",
            }
        ],
        "weapons": [],
        "spells": {
            "casting_ability": "wis",
            "max_prepared": 8,
            "slots": {
                "1": {"max": 4, "used": 0},
                "2": {"max": 3, "used": 0},
                "3": {"max": 2, "used": 0},
            },
            "pact_slots": None,
            "known": known,
            "has_spell_focus": True,
            "has_component_pouch": True,
        },
        "inventory": {"coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 20, "pp": 0}, "items": []},
        "feature_picks": {"values": {}},
        "subclass_setups": {
            "druid": {
                "entry": {
                    "id": "circle_of_the_moon",
                    "slug": "circle_of_the_moon",
                    "name_ru": "Круг луны",
                },
                "picks": {"values": {}},
            }
        },
        "notes": "MAG-01 друид 5 круг луны",
    }


def warlock1_no_patron_sheet() -> dict:
    """Колдун 1 без покровителя — первый выбор архетипа в мастере/на листе."""
    known = [
        _spell("wl:eldritch", "Мистический заряд", 0, class_slug="warlock", damage="1к10 силовое", attack_or_save="атака"),
        _spell("wl:mage-hand", "Волшебная рука", 0, class_slug="warlock"),
        _spell("wl:hex", "Проклятие", 1, class_slug="warlock", concentration=True, prepared=True),
        _spell("wl:armor", "Доспех Агатиса", 1, class_slug="warlock", prepared=True),
    ]
    return {
        "identity": {"alignment": "Хаотично-нейтральный", "experience": 0, "background": "Шарлатан"},
        "race": {"name": "Человек", "slug": "human"},
        "classes": [
            {
                "id": "warlock",
                "name": "Колдун",
                "catalog_id": "warlock",
                "level": 1,
                "subclass_name": None,
            }
        ],
        "abilities": {
            "str": {"score": 8},
            "dex": {"score": 14},
            "con": {"score": 14},
            "int": {"score": 10},
            "wis": {"score": 10},
            "cha": {"score": 16},
        },
        "saves": {"wis": {"is_proficient": True}, "cha": {"is_proficient": True}},
        "skills": _skills("deception", "intimidation", "arcana", "investigation"),
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
            "turn_economy": _empty_te(),
            "ac": 13,
            "hp_current": 10,
            "hp_max": 10,
        },
        "resources": [],
        "weapons": [],
        "spells": {
            "casting_ability": "cha",
            "max_prepared": None,
            "slots": {},
            "pact_slots": {"max": 1, "used": 0, "level": 1},
            "known": known,
            "has_spell_focus": True,
            "has_component_pouch": True,
        },
        "inventory": {"coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 15, "pp": 0}, "items": []},
        "feature_picks": {"values": {}},
        "notes": "MAG-01 колдун 1 без покровителя",
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
        upsert(db, user.id, WIZ20_ID, "MAG-01 Волшебник 20", wizard20_sheet())
        upsert(db, user.id, SORC20_ID, "MAG-01 Чародей 20", sorcerer20_sheet())
        upsert(db, user.id, MULTI3_ID, "MAG-01 Бард/Жрец/Волшебник 2", multi3_sheet())
        upsert(db, user.id, PAL_WL_ID, "MAG-01 Паладин 5 / Колдун 3", paladin_warlock_sheet())
        upsert(db, user.id, CLERIC5_ID, "MAG-01 Жрец 5", cleric5_sheet())
        upsert(db, user.id, ROGUE5_ID, "MAG-01 Плут 5", rogue5_sheet())
        upsert(db, user.id, DRUID5_ID, "MAG-01 Друид 5 Луна", druid5_moon_sheet())
        upsert(db, user.id, WARLOCK1_ID, "MAG-01 Колдун 1 без покровителя", warlock1_no_patron_sheet())
        db.commit()
        print(
            json.dumps(
                {
                    "email": EMAIL,
                    "password": PASSWORD,
                    "wizard20": str(WIZ20_ID),
                    "sorcerer20": str(SORC20_ID),
                    "multi3": str(MULTI3_ID),
                    "paladinWarlock": str(PAL_WL_ID),
                    "cleric5": str(CLERIC5_ID),
                    "rogue5": str(ROGUE5_ID),
                    "druid5": str(DRUID5_ID),
                    "warlock1": str(WARLOCK1_ID),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
