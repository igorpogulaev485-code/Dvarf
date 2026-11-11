"""Normalize ttg.club bestiary detail JSON → Dvarf schema v1.

Shared by fetch_bestiary_wave.py and smoke_bestiary_schema.py.
On dnd.su ↔ ttg conflicts, product keeps ttg values.
"""

from __future__ import annotations

import re
from html import unescape
from typing import Any

BESTIARY_DATA_SCHEMA_VERSION = 1

TYPE_RU_TO_EN: dict[str, str] = {
    "зверь": "beast",
    "стая крошечных зверей": "swarm_of_tiny_beasts",
    "рой": "swarm",
    "гуманоид": "humanoid",
    "монстр": "monstrosity",
    "нежить": "undead",
    "исчадие": "fiend",
    "конструкт": "construct",
    "аберрация": "aberration",
    "дракон": "dragon",
    "великан": "giant",
    "элементаль": "elemental",
    "фея": "fey",
    "растение": "plant",
    "небожитель": "celestial",
    "слизь": "ooze",
}

SPEED_NAME_TO_KEY: dict[str, str] = {
    "": "walk",
    "летая": "fly",
    "летая (парит)": "fly",
    "плавая": "swim",
    "лазая": "climb",
    "копая": "burrow",
    "роющая": "burrow",
}

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_DICE_RE = re.compile(
    r"<dice-roller[^>]*\bformula=\"([^\"]+)\"[^>]*(?:/>|>\s*</dice-roller>)",
    re.I,
)


def strip_html(value: str | None) -> str:
    if not value:
        return ""
    # Keep dice formulas from ttg custom elements before stripping tags.
    text = _DICE_RE.sub(r"\1", value)
    text = unescape(_TAG_RE.sub(" ", text))
    return _WS_RE.sub(" ", text).strip()


def type_to_en(type_ru: str) -> str:
    key = (type_ru or "").strip().lower()
    return TYPE_RU_TO_EN.get(key, re.sub(r"\s+", "_", key) or "unknown")


def slug_from_url(url: str, name_en: str) -> str:
    # "/bestiary/wolf" → wolf
    part = (url or "").rstrip("/").split("/")[-1]
    if part:
        return part.replace("-", "_")
    return re.sub(r"[^a-z0-9]+", "_", (name_en or "").lower()).strip("_")


def normalize_cr(raw: Any) -> str:
    if raw is None:
        return ""
    text = str(raw).strip()
    if text in {"", "—", "–", "-", "−", "n/a", "N/A"}:
        return ""
    return text


def _parse_ac(raw: Any) -> tuple[int, str | None]:
    if isinstance(raw, int):
        return raw, None
    if isinstance(raw, float):
        return int(raw), None
    if isinstance(raw, dict):
        value = raw.get("value", raw.get("armorClass"))
        notes = raw.get("text") or raw.get("name") or raw.get("type")
        try:
            return int(value), str(notes) if notes else None
        except (TypeError, ValueError):
            pass
    if isinstance(raw, str):
        m = re.search(r"(\d+)", raw)
        if m:
            return int(m.group(1)), raw
    return 10, None


def _parse_hits(hits: Any) -> tuple[int, str | None, str | None]:
    """Return hp_average, hp_formula, hp_scaling_text."""
    if not isinstance(hits, dict):
        try:
            return int(hits), None, None
        except (TypeError, ValueError):
            return 1, None, None
    average = hits.get("average")
    try:
        hp_average = int(average) if average is not None else 1
    except (TypeError, ValueError):
        hp_average = 1
    formula = hits.get("formula")
    sign = hits.get("sign")
    bonus = hits.get("bonus")
    hp_formula: str | None = None
    if formula:
        hp_formula = str(formula)
        if sign is not None and bonus is not None:
            hp_formula = f"{hp_formula}{sign}{bonus}".replace("  ", " ")
    scaling = hits.get("text")
    hp_scaling_text = str(scaling).strip() if scaling else None
    return hp_average, hp_formula, hp_scaling_text


def _parse_speed(raw: Any) -> dict[str, Any]:
    out: dict[str, Any] = {}
    notes: list[str] = []
    if not isinstance(raw, list):
        return out
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip().lower()
        additional = str(item.get("additional") or "").strip()
        key = SPEED_NAME_TO_KEY.get(name)
        if key is None:
            if not name:
                key = "walk"
            elif "лет" in name:
                key = "fly"
            elif "плав" in name:
                key = "swim"
            elif "лаз" in name:
                key = "climb"
            elif "коп" in name or "роя" in name:
                key = "burrow"
            else:
                key = "walk"
                notes.append(name)
        try:
            value = int(item.get("value"))
        except (TypeError, ValueError):
            continue
        out[key] = value
        if additional:
            notes.append(additional)
    if notes:
        out["notes"] = ", ".join(dict.fromkeys(notes))
    return out


def _parse_abilities(raw: Any) -> dict[str, int]:
    src = raw if isinstance(raw, dict) else {}
    def n(key_en: str, key_alt: str) -> int:
        try:
            return int(src.get(key_en, src.get(key_alt, 10)))
        except (TypeError, ValueError):
            return 10

    return {
        "str": n("str", "strength"),
        "dex": n("dex", "dexterity"),
        "con": n("con", "constitution"),
        "int": n("int", "intelligence"),
        "wis": n("wis", "wiz"),  # ttg uses wiz for wisdom
        "cha": n("cha", "charisma"),
    }


def _parse_skills(raw: Any) -> dict[str, int] | None:
    if not isinstance(raw, list) or not raw:
        return None
    out: dict[str, int] = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        try:
            out[name] = int(item.get("value"))
        except (TypeError, ValueError):
            continue
    return out or None


def _parse_senses(raw: Any) -> dict[str, int] | None:
    if not isinstance(raw, dict):
        return None
    out: dict[str, int] = {}
    pp = raw.get("passivePerception")
    if pp is not None:
        try:
            out["passive_perception"] = int(pp)
        except (TypeError, ValueError):
            m = re.search(r"(\d+)", str(pp))
            if m:
                out["passive_perception"] = int(m.group(1))
    sense_map = {
        "тёмное зрение": "darkvision",
        "темное зрение": "darkvision",
        "слепое зрение": "blindsight",
        "чувство вибрации": "tremorsense",
        "истинное зрение": "truesight",
    }
    for item in raw.get("senses") or []:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip().lower()
        key = sense_map.get(name)
        if not key:
            continue
        try:
            out[key] = int(item.get("value"))
        except (TypeError, ValueError):
            continue
    return out or None


def _parse_action_list(raw: Any) -> list[dict[str, str]] | None:
    if not isinstance(raw, list) or not raw:
        return None
    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name_ru = str(item.get("name") or "").strip()
        text_ru = strip_html(str(item.get("value") or item.get("text") or ""))
        if not name_ru and not text_ru:
            continue
        block: dict[str, str] = {"name_ru": name_ru or "—", "text_ru": text_ru}
        name_en = item.get("englishName") or item.get("name_en")
        if name_en:
            block["name_en"] = str(name_en)
        out.append(block)
    return out or None


def speed_tags(speed: dict[str, Any]) -> list[str]:
    tags: list[str] = []
    for key in ("swim", "fly", "climb", "burrow"):
        val = speed.get(key)
        if isinstance(val, int) and val > 0:
            tags.append(key)
    return tags


def ttg_detail_to_entry(detail: dict[str, Any]) -> dict[str, Any]:
    """Map one ttg detail payload → catalog entry row (slug, names, data)."""
    name = detail.get("name") or {}
    name_ru = str((name.get("rus") if isinstance(name, dict) else "") or "").strip()
    name_en = str((name.get("eng") if isinstance(name, dict) else "") or "").strip()
    url = str(detail.get("url") or "")
    slug = slug_from_url(url, name_en)

    type_raw = detail.get("type")
    if isinstance(type_raw, dict):
        type_ru = str(type_raw.get("name") or "").strip()
        subtype = type_raw.get("tags") or type_raw.get("subtype")
        if isinstance(subtype, list):
            subtype = ", ".join(str(x) for x in subtype) if subtype else None
        elif subtype is not None:
            subtype = str(subtype)
    else:
        type_ru = str(type_raw or "").strip()
        subtype = None

    size_raw = detail.get("size")
    if isinstance(size_raw, dict):
        size = str(size_raw.get("eng") or size_raw.get("rus") or "medium").lower()
    else:
        size = str(size_raw or "medium").lower()

    ac, ac_notes = _parse_ac(detail.get("armorClass"))
    hp_average, hp_formula, hp_scaling_text = _parse_hits(detail.get("hits"))
    speed = _parse_speed(detail.get("speed"))
    abilities = _parse_abilities(detail.get("ability"))
    source = detail.get("source") or {}
    source_book = str(source.get("shortName") or "UNK")

    data: dict[str, Any] = {
        "schema_version": BESTIARY_DATA_SCHEMA_VERSION,
        "size": size,
        "type": type_to_en(type_ru),
        "type_ru": type_ru or "unknown",
        "ac": ac,
        "hp_average": hp_average,
        "speed": speed,
        "cr": normalize_cr(detail.get("challengeRating")),
        "abilities": abilities,
        "source_book": source_book,
    }
    if subtype:
        data["subtype"] = subtype
    if detail.get("alignment"):
        data["alignment"] = str(detail["alignment"])
    if ac_notes:
        data["ac_notes"] = ac_notes
    if hp_formula:
        data["hp_formula"] = hp_formula
    if hp_scaling_text:
        data["hp_scaling_text"] = hp_scaling_text

    pb = detail.get("proficiencyBonus")
    if pb is not None:
        try:
            data["proficiency_bonus"] = int(pb)
        except (TypeError, ValueError):
            data["proficiency_bonus"] = str(pb)

    skills = _parse_skills(detail.get("skills"))
    if skills:
        data["skills"] = skills
    senses = _parse_senses(detail.get("senses"))
    if senses:
        data["senses"] = senses
    if detail.get("languages"):
        data["languages"] = [str(x) for x in detail["languages"]]
    for src_key, dst_key in (
        ("damageImmunities", "damage_immunities"),
        ("damageResistances", "damage_resistances"),
        ("damageVulnerabilities", "damage_vulnerabilities"),
        ("conditionImmunities", "condition_immunities"),
    ):
        if detail.get(src_key):
            data[dst_key] = [str(x) for x in detail[src_key]]

    traits = _parse_action_list(detail.get("feats"))
    if traits:
        data["traits"] = traits
    actions = _parse_action_list(detail.get("actions"))
    if actions:
        data["actions"] = actions
    for src_key, dst_key in (
        ("bonusActions", "bonus_actions"),
        ("reactions", "reactions"),
        ("legendaryActions", "legendary_actions"),
    ):
        blocks = _parse_action_list(detail.get(src_key))
        if blocks:
            data[dst_key] = blocks

    tags = speed_tags(speed)
    # keep type tag for filters
    if data["type"] and data["type"] not in tags:
        tags = [data["type"], *tags]
    if tags:
        data["tags"] = tags
    if detail.get("environment"):
        data["environment"] = [str(x) for x in detail["environment"]]

    external_ref = {
        "ttg_url": f"https://5e14.ttg.club{url}" if url.startswith("/") else url,
        "ttg_id": detail.get("id"),
        "source_group": (source.get("group") or {}).get("shortName"),
        "source_name": source.get("name"),
    }

    return {
        "slug": slug,
        "name_ru": name_ru or slug,
        "name_en": name_en or slug,
        "source": f"ttg:{source_book}",
        "external_ref": external_ref,
        "data": data,
    }


def validate_entry(entry: dict[str, Any]) -> list[str]:
    """Return list of validation errors (empty = ok)."""
    errors: list[str] = []
    if not entry.get("slug"):
        errors.append("missing slug")
    data = entry.get("data")
    if not isinstance(data, dict):
        errors.append("missing data")
        return errors
    for key in ("size", "type", "type_ru", "source_book"):
        if not isinstance(data.get(key), str) or not data.get(key):
            errors.append(f"data.{key} required string")
    if not isinstance(data.get("ac"), int):
        errors.append("data.ac must be int")
    if not isinstance(data.get("hp_average"), int):
        errors.append("data.hp_average must be int")
    if not isinstance(data.get("cr"), str):
        errors.append("data.cr must be str")
    if not isinstance(data.get("speed"), dict):
        errors.append("data.speed must be object")
    abilities = data.get("abilities")
    if not isinstance(abilities, dict):
        errors.append("data.abilities must be object")
    else:
        for abl in ("str", "dex", "con", "int", "wis", "cha"):
            if not isinstance(abilities.get(abl), int):
                errors.append(f"data.abilities.{abl} must be int")
    if data.get("schema_version") not in (None, BESTIARY_DATA_SCHEMA_VERSION, 1):
        errors.append("unexpected schema_version")
    return errors
