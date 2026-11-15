from __future__ import annotations

from typing import Any


def empty_character_sheet() -> dict[str, Any]:
    """Canonical empty sheet document for a new draft character."""
    ability_keys = ("str", "dex", "con", "int", "wis", "cha")
    skill_defs = {
        "acrobatics": "dex",
        "animal_handling": "wis",
        "arcana": "int",
        "athletics": "str",
        "deception": "cha",
        "history": "int",
        "insight": "wis",
        "intimidation": "cha",
        "investigation": "int",
        "medicine": "wis",
        "nature": "int",
        "perception": "wis",
        "performance": "cha",
        "persuasion": "cha",
        "religion": "int",
        "sleight_of_hand": "dex",
        "stealth": "dex",
        "survival": "wis",
    }

    return {
        "identity": {
            "subclass_name": None,
            "background": None,
            "player_name": None,
            "alignment": None,
            "experience": 0,
            "size": "medium",
        },
        "abilities": {key: {"score": 10} for key in ability_keys},
        "saves": {key: {"is_proficient": False} for key in ability_keys},
        "skills": {
            name: {
                "base_stat": base_stat,
                "is_proficient": False,
                "is_expertise": False,
            }
            for name, base_stat in skill_defs.items()
        },
        "combat": {
            "hp_current": None,
            "hp_max": None,
            "hp_temp": 0,
            "hit_die": None,
            "hp_dice_current": None,
            "ac": None,
            "speed": None,
            "initiative": None,
            "darkvision": 0,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "conditions": [],
            "exhaustion": 0,
            "inspiration": False,
        },
        "proficiency": {
            "bonus": 2,
            "armor": {
                "light": False,
                "medium": False,
                "heavy": False,
                "shields": False,
            },
            "weapons": {
                "simple": False,
                "martial": False,
            },
        },
        "bonuses": [],
        "weapons": [],
        "attunements": [],
        "inventory": {
            "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0},
            "items": [],
        },
        "resources": [],
        "spells": {
            "casting_ability": None,
            "slots": {},
            "pact_slots": {},
            "known": [],
            "prepared": [],
        },
        "features_text": {
            "traits": "",
            "features": "",
            "feats": "",
        },
        "personality": {
            "personality": "",
            "ideals": "",
            "bonds": "",
            "flaws": "",
        },
        "notes": {
            "appearance": "",
            "background": "",
            "quests": "",
            "free": "",
        },
        "meta": {
            "disabled_sections": [],
        },
    }


def extract_summary_from_sheet(sheet: dict[str, Any]) -> dict[str, Any]:
    combat = sheet.get("combat") if isinstance(sheet.get("combat"), dict) else {}
    identity = sheet.get("identity") if isinstance(sheet.get("identity"), dict) else {}
    classes = sheet.get("classes") if isinstance(sheet.get("classes"), list) else []
    class_parts: list[str] = []
    total_level = 0
    for row in classes:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        try:
            lvl = max(0, int(row.get("level") or 0))
        except (TypeError, ValueError):
            lvl = 0
        if name and lvl > 0:
            class_parts.append(f"{name} {lvl}")
            total_level += lvl
    race = identity.get("race_name") or identity.get("race") or sheet.get("race_name")
    return {
        "hp_current": combat.get("hp_current"),
        "hp_max": combat.get("hp_max"),
        "class_name": " / ".join(class_parts) if class_parts else None,
        "race_name": str(race).strip() if race else None,
        "level": min(20, max(1, total_level)) if total_level else None,
    }
