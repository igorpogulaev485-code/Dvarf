#!/usr/bin/env python3
"""P24-C05: build spells_srd.json + patch class/subclass spell_list from Open5e SRD-2024.

Sources (mechanics): Open5e document key srd-2024 (= SRD 5.2 / 5.2.1 spell chapter).
RU names: docs/edition-2024/sources/spells.csv (next.dnd.su); SRD-renamed spells
use stripped RU without author eponym; name_ru_pending when proposed.

Does NOT copy long SRD prose — only short Russian summaries from structured fields.
"""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
OPEN5E = Path("/tmp/p24-c05/open5e_pages.jsonl")

SRD_CLASSES = {
    "bard",
    "cleric",
    "druid",
    "paladin",
    "ranger",
    "sorcerer",
    "warlock",
    "wizard",
}
NON_CASTERS = {"barbarian", "fighter", "monk", "rogue"}

# CSV PHB eponym → SRD 5.2.1 unprefixed id / EN / proposed RU (without author)
SRD_RENAMES = {
    "melfs-acid-arrow": ("acid-arrow", "Acid Arrow", "Кислотная стрела"),
    "bigbys-hand": ("arcane-hand", "Arcane Hand", "Чародейская длань"),
    "mordenkainens-sword": ("arcane-sword", "Arcane Sword", "Чародейский меч"),
    "nystuls-magic-aura": ("arcanists-magic-aura", "Arcanist's Magic Aura", "Аура чародея"),
    "evards-black-tentacles": ("black-tentacles", "Black Tentacles", "Чёрные щупальца"),
    "mordenkainens-faithful-hound": ("faithful-hound", "Faithful Hound", "Верный пёс"),
    "tensers-floating-disk": ("floating-disk", "Floating Disk", "Парящий диск"),
    "otilukes-freezing-sphere": ("freezing-sphere", "Freezing Sphere", "Ледяной шар"),
    "tashas-hideous-laughter": ("hideous-laughter", "Hideous Laughter", "Жуткий смех"),
    "drawmijs-instant-summons": ("instant-summons", "Instant Summons", "Мгновенный вызов"),
    "ottos-irresistible-dance": ("irresistible-dance", "Irresistible Dance", "Неудержимая пляска"),
    "mordenkainens-magnificent-mansion": (
        "magnificent-mansion",
        "Magnificent Mansion",
        "Великолепный особняк",
    ),
    "mordenkainens-private-sanctum": ("private-sanctum", "Private Sanctum", "Личный кабинет"),
    "otilukes-resilient-sphere": ("resilient-sphere", "Resilient Sphere", "Упругий шар"),
    "leomunds-secret-chest": ("secret-chest", "Secret Chest", "Потайной сундук"),
    "rarys-telepathic-bond": ("telepathic-bond", "Telepathic Bond", "Ментальная связь"),
    "leomunds-tiny-hut": ("tiny-hut", "Tiny Hut", "Крошечная хижина"),
}

FALSE_NEGATIVES = {
    "commune",
    "conjure-celestial",
    "contingency",
    "counterspell",
    "delayed-blast-fireball",
    "divine-word",
    "gaseous-form",
    "guards-and-wards",
    "hallow",
    "harm",
    "haste",
    "lightning-bolt",
    "magic-jar",
    "phantasmal-force",
    "phantom-steed",
    "planar-ally",
    "prismatic-spray",
    "resurrection",
    "sequester",
    "storm-of-vengeance",
    "transport-via-plants",
    "wind-wall",
}

SCHOOL_RU = {
    "abjuration": "ограждение",
    "conjuration": "вызов",
    "divination": "прорицание",
    "enchantment": "очарование",
    "evocation": "воплощение",
    "illusion": "иллюзия",
    "necromancy": "некромантия",
    "transmutation": "преобразование",
}
DAMAGE_RU = {
    "acid": "кислота",
    "bludgeoning": "дробящий",
    "cold": "холод",
    "fire": "огонь",
    "force": "силовой",
    "lightning": "электричество",
    "necrotic": "некротический",
    "piercing": "колющий",
    "poison": "яд",
    "psychic": "психический",
    "radiant": "излучение",
    "slashing": "рубящий",
    "thunder": "звук",
}
SAVE_RU = {
    "strength": "СИЛ",
    "dexterity": "ЛОВ",
    "constitution": "ТЕЛ",
    "intelligence": "ИНТ",
    "wisdom": "МДР",
    "charisma": "ХАР",
}
ABILITY_EN = {
    "strength": "Strength",
    "dexterity": "Dexterity",
    "constitution": "Constitution",
    "intelligence": "Intelligence",
    "wisdom": "Wisdom",
    "charisma": "Charisma",
}


def slugify(name: str) -> str:
    s = name.lower().strip().replace("'", "").replace("'", "").replace("/", " ")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def load_csv_rows() -> list[dict[str, str]]:
    with (SOURCES / "spells.csv").open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def patch_spells_csv(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    by_id = {r["id"]: r for r in rows}
    # Fix false negatives
    for sid in FALSE_NEGATIVES:
        by_id[sid]["srd"] = "true"
    # Add SRD-renamed rows if missing
    for old_id, (new_id, name_en, name_ru) in SRD_RENAMES.items():
        if new_id in by_id:
            by_id[new_id]["srd"] = "true"
            continue
        src = by_id[old_id]
        classes = "|".join(
            c for c in src["classes"].split("|") if c and c != "artificer"
        )
        by_id[new_id] = {
            "id": new_id,
            "name_en": name_en,
            "name_ru": name_ru,
            "book": "PH24",
            "category": "spells",
            "url_dndsu": src.get("url_dndsu") or "",
            "url_ttg": src.get("url_ttg") or "",
            "srd": "true",
            "level": src["level"],
            "school": src["school"],
            "classes": classes,
        }
    # Stable order: existing order, then new ids alphabetically at end of PH24 block
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for r in rows:
        out.append(by_id[r["id"]])
        seen.add(r["id"])
    for sid in sorted(by_id):
        if sid not in seen:
            out.append(by_id[sid])
    return out


def write_csv(rows: list[dict[str, str]]) -> None:
    fields = [
        "id",
        "name_en",
        "name_ru",
        "book",
        "category",
        "url_dndsu",
        "url_ttg",
        "srd",
        "level",
        "school",
        "classes",
    ]
    path = SOURCES / "spells.csv"
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fields})


def parse_material(mat: str | None, consumed_flag: bool) -> dict:
    mat = (mat or "").strip()
    if not mat:
        return {}
    consumed = bool(re.search(r"which the spell consumes|spell consumes", mat, re.I))
    # open5e consumed flag is noisy; prefer text. Keep True only when text says so.
    if not consumed:
        consumed = False
    cost = None
    m = re.search(r"([\d,]+)\+?\s*GP", mat, re.I)
    if m:
        cost = int(m.group(1).replace(",", ""))
    return {
        "m": mat,
        "m_cost_gp": cost,
        "m_consumed": consumed,
    }


def parse_casting_time(raw: str, ritual: bool, reaction_condition: str | None) -> dict:
    raw = (raw or "action").lower().replace("_", "-")
    if raw in {"action"}:
        out = {"unit": "action", "amount": 1}
    elif raw in {"bonus-action", "bonus", "bonusaction"}:
        out = {"unit": "bonus", "amount": 1}
    elif raw in {"reaction"}:
        out = {"unit": "reaction", "amount": 1}
        if reaction_condition:
            out["condition"] = reaction_condition.strip()
    elif raw in {"1minute", "1-minute", "minute"}:
        out = {"unit": "minute", "amount": 1}
    elif raw in {"10minutes", "10-minutes"}:
        out = {"unit": "minute", "amount": 10}
    elif raw in {"1hour", "1-hour", "hour"}:
        out = {"unit": "hour", "amount": 1}
    else:
        out = {"unit": "special", "amount": 1, "raw": raw}
    if ritual and out["unit"] != "action":
        # SRD often "1 minute or Ritual"
        out["or_ritual"] = True
    return out


def format_duration(duration: str | None, concentration: bool) -> str:
    d = (duration or "мгновенно").strip()
    if d.lower() in {"instantaneous", "мгновенно", ""}:
        base = "мгновенно"
    else:
        base = d
        # light EN→RU for common patterns
        base = (
            base.replace("hours", "ч")
            .replace("hour", "ч")
            .replace("minutes", "мин")
            .replace("minute", "мин")
            .replace("rounds", "раунд.")
            .replace("round", "раунд")
            .replace("days", "дн.")
            .replace("day", "день")
            .replace("Until dispelled", "пока не развеяно")
            .replace("until dispelled", "пока не развеяно")
            .replace("Special", "особо")
        )
    if concentration:
        if base == "мгновенно":
            return "концентрация"
        if base.lower().startswith("up to "):
            return f"концентрация, до {base[6:]}"
        if "концентрац" in base.lower():
            return base
        return f"концентрация, до {base}"
    return base


def infer_damage_type(spell: dict) -> str | None:
    dt = spell.get("damage_type")
    if isinstance(dt, dict):
        dt = dt.get("key") or dt.get("name")
    if dt:
        return str(dt).lower()
    blob = " ".join(
        [
            spell.get("desc") or "",
            spell.get("higher_level") or "",
            spell.get("damage_roll") or "",
        ]
    )
    for key in DAMAGE_RU:
        if re.search(rf"\b{key}\b", blob, re.I):
            return key
    return None


def build_damage_at_character_level(spell: dict) -> dict[str, str] | None:
    if spell.get("level") != 0:
        return None
    base = spell.get("damage_roll")
    table: dict[str, str] = {}
    beam_counts: dict[str, int] = {}
    if base:
        table["1"] = base
    for opt in spell.get("casting_options") or []:
        t = str(opt.get("type") or "")
        m = re.match(r"player_level_(\d+)", t)
        if not m:
            continue
        lvl = m.group(1)
        if opt.get("damage_roll"):
            table[lvl] = opt["damage_roll"]
        if opt.get("target_count"):
            beam_counts[lvl] = int(opt["target_count"])
    # Eldritch Blast-style: same die, more beams at 5/11/17.
    if base and beam_counts and set(beam_counts) >= {"5", "11", "17"}:
        table = {
            "1": f"{base}×1",
            "5": f"{base}×{beam_counts['5']}",
            "11": f"{base}×{beam_counts['11']}",
            "17": f"{base}×{beam_counts['17']}",
        }
        return table
    if table and {"5", "11", "17"} <= set(table.keys()) and "1" in table:
        return table
    if table and base and {"5", "11", "17"} <= set(table.keys()):
        table.setdefault("1", base)
        return table
    return table or None


def build_damage_at_slot_level(spell: dict) -> dict[str, str] | None:
    if spell.get("level") == 0:
        return None
    table: dict[str, str] = {}
    base = spell.get("damage_roll")
    lvl = spell.get("level")
    if base and lvl:
        table[str(lvl)] = base
    for opt in spell.get("casting_options") or []:
        t = str(opt.get("type") or "")
        m = re.match(r"slot_level_(\d+)", t)
        if m and opt.get("damage_roll"):
            table[m.group(1)] = opt["damage_roll"]
    return table or None


def short_summary_ru(spell: dict, school: str, classes: list[str]) -> str:
    """One-line mechanical blurb — not a translation of SRD prose."""
    level = spell["level"]
    school_ru = SCHOOL_RU.get(school, school)
    if level == 0:
        head = f"Заговор ({school_ru})"
    else:
        head = f"{level} круг, {school_ru}"
    bits = [head]
    ct = spell.get("casting_time") or "action"
    if ct == "action":
        bits.append("действие «Магия»")
    elif ct in {"bonus-action", "bonus"}:
        bits.append("бонусное")
    elif ct == "reaction":
        bits.append("реакция")
    elif "minute" in str(ct):
        bits.append("минуты")
    elif "hour" in str(ct):
        bits.append("часы")
    if spell.get("ritual"):
        bits.append("ритуал")
    if spell.get("concentration"):
        bits.append("конц.")
    dmg = spell.get("damage_roll")
    dtype = infer_damage_type(spell)
    if dmg:
        bits.append(f"{dmg}" + (f" {DAMAGE_RU.get(dtype, dtype)}" if dtype else ""))
    save = (spell.get("saving_throw_ability") or "").lower()
    if save:
        bits.append(f"спас {SAVE_RU.get(save, save)}")
    elif spell.get("attack_roll"):
        bits.append("атака заклинанием")
    if classes:
        bits.append("/".join(classes))
    return "; ".join(bits) + "."


def higher_levels_ru(spell: dict) -> str | None:
    if spell.get("level") == 0:
        table = build_damage_at_character_level(spell)
        if table and len(table) > 1:
            parts = [f"{k} ур.: {v}" for k, v in sorted(table.items(), key=lambda x: int(x[0]))]
            return "Рост заговора: " + ", ".join(parts) + "."
        return None
    hl = spell.get("higher_level") or ""
    table = build_damage_at_slot_level(spell)
    if table and len(table) > 1:
        # Data-driven upcast without copying English prose
        base_lvl = spell["level"]
        base = table.get(str(base_lvl))
        # detect +NdX pattern from adjacent slot
        nxt = table.get(str(base_lvl + 1))
        if base and nxt:
            return (
                f"Усиление ячейкой: на {base} на круге {base_lvl}; "
                f"выше — по таблице слотов (данные карточки)."
            )
    if hl:
        # Paraphrase marker only — do not store English paragraph
        return "Усиление при ячейке выше базового круга (см. кубы/цели в данных)."
    return None


def range_ru(text: str | None, feet: int | None) -> str:
    t = (text or "").strip()
    if not t and feet is not None:
        t = f"{feet} feet"
    low = t.lower()
    if low in {"self", "на себя"}:
        return "На себя"
    if low in {"touch", "касание"}:
        return "Касание"
    if low in {"special", "особо"}:
        return "Особо"
    m = re.search(r"(\d+)\s*feet", t, re.I)
    if m:
        return f"{m.group(1)} фт"
    if re.search(r"\d+\s*фт", t, re.I):
        return t
    return t or "—"


def build_spell_entry(spell: dict, csv_row: dict | None, pending: bool) -> dict:
    sid = slugify(spell["name"])
    school = (spell.get("school") or {}).get("key") or "evocation"
    classes = []
    for c in spell.get("classes") or []:
        key = c.get("key", "") if isinstance(c, dict) else str(c)
        name = (c.get("name") if isinstance(c, dict) else str(c)).lower()
        slug = key.split("_")[-1] if "_" in key else name
        slug = slugify(slug)
        if slug in SRD_CLASSES:
            classes.append(slug)
    classes = sorted(set(classes))

    name_ru = (csv_row or {}).get("name_ru") or spell["name"]
    name_en = spell["name"]
    casting = parse_casting_time(
        spell.get("casting_time"),
        bool(spell.get("ritual")),
        spell.get("reaction_condition"),
    )
    comps: dict = {
        "v": bool(spell.get("verbal")),
        "s": bool(spell.get("somatic")),
    }
    mat_info = parse_material(spell.get("material_specified"), bool(spell.get("material_consumed")))
    if spell.get("material") or mat_info.get("m"):
        comps["m"] = mat_info.get("m") or True
        if mat_info.get("m_cost_gp") is not None:
            comps["m_cost_gp"] = mat_info["m_cost_gp"]
        if mat_info.get("m_consumed"):
            comps["m_consumed"] = True

    dtype = infer_damage_type(spell)
    attack_or_save = None
    save = (spell.get("saving_throw_ability") or "").strip().lower()
    if save:
        attack_or_save = SAVE_RU.get(save, save.upper()[:3])
    elif spell.get("attack_roll"):
        attack_or_save = "атака"

    # Open5e sometimes puts utility dice (Guidance/Resistance) into damage_roll.
    non_damage_cantrips = {
        "dancing-lights",
        "druidcraft",
        "elementalism",
        "guidance",
        "light",
        "mage-hand",
        "mending",
        "message",
        "minor-illusion",
        "prestidigitation",
        "resistance",
        "spare-the-dying",
        "thaumaturgy",
        "shillelagh",
        "true-strike",
    }
    sid_early = slugify(spell["name"])
    damage = None
    if spell.get("damage_roll") and sid_early not in non_damage_cantrips:
        damage = spell["damage_roll"]
        if dtype:
            damage = f"{damage} {DAMAGE_RU.get(dtype, dtype)}"

    data = {
        "schema_version": 1,
        "level": int(spell["level"]),
        "school": school,
        "school_ru": SCHOOL_RU.get(school, school),
        "casting_time": casting,
        "magic_action": casting.get("unit") == "action",
        "range": range_ru(spell.get("range_text"), spell.get("range")),
        "components": comps,
        "duration": format_duration(spell.get("duration"), bool(spell.get("concentration"))),
        "concentration": bool(spell.get("concentration")),
        "ritual": bool(spell.get("ritual")),
        "classes": classes,
        "attack_or_save": attack_or_save,
        "damage": damage,
        "summary_ru": short_summary_ru(spell, school, classes),
        "source_book": "SRD 5.2.1",
    }
    if pending:
        data["name_ru_pending"] = True
    dmg_char = build_damage_at_character_level(spell)
    if dmg_char and sid_early not in non_damage_cantrips:
        data["damage_at_character_level"] = dmg_char
    elif (
        spell.get("level") == 0
        and damage
        and sid_early not in non_damage_cantrips
        and dmg_char is None
    ):
        # Ensure damaging cantrips always carry 1/5/11/17 table when dice known.
        base = spell.get("damage_roll")
        if base and re.match(r"(\d+)d(\d+)", base):
            n, die = re.match(r"(\d+)d(\d+)", base).groups()
            n = int(n)
            data["damage_at_character_level"] = {
                "1": f"{n}d{die}",
                "5": f"{n+1}d{die}",
                "11": f"{n+2}d{die}",
                "17": f"{n+3}d{die}",
            }
    dmg_slot = build_damage_at_slot_level(spell)
    if dmg_slot:
        data["damage_at_slot_level"] = dmg_slot
    hl = higher_levels_ru(spell)
    if hl and sid_early not in non_damage_cantrips:
        data["higher_levels"] = hl
    # Short description: mechanical pointer, not SRD prose copy
    data["description"] = data["summary_ru"]

    ext = {}
    if csv_row:
        if csv_row.get("url_dndsu"):
            ext["url_dndsu"] = csv_row["url_dndsu"]
        if csv_row.get("url_ttg"):
            ext["url_ttg"] = csv_row["url_ttg"]
        ext["book"] = csv_row.get("book") or "PH24"
    else:
        ext["book"] = "PH24"

    return {
        "kind": "spell",
        "slug": sid,
        "name_ru": name_ru,
        "name_en": name_en,
        "source": "srd-5.2",
        "sort_order": int(spell["level"]) * 1000 + (ord(sid[0]) if sid else 0),
        "external_ref": ext,
        "data": data,
    }


def load_discrepancy_pending() -> set[str]:
    path = SOURCES / "discrepancies.md"
    pending: set[str] = set()
    if not path.is_file():
        return pending
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| spells |"):
            continue
        parts = [p.strip() for p in line.split("|")]
        # | spells | `id` | ...
        if len(parts) >= 3:
            m = re.search(r"`([^`]+)`", parts[2])
            if m:
                pending.add(m.group(1))
    return pending


def subclass_spell_tables() -> dict[str, list[dict]]:
    """Always-prepared / circle lists from SRD 5.2.1 (verified in PDF)."""
    return {
        "cleric__life-domain": [
            {
                "level": 3,
                "spells": ["aid", "bless", "cure-wounds", "lesser-restoration"],
            },
            {"level": 5, "spells": ["mass-healing-word", "revivify"]},
            {"level": 7, "spells": ["aura-of-life", "death-ward"]},
            {"level": 9, "spells": ["greater-restoration", "mass-cure-wounds"]},
        ],
        "paladin__oath-of-devotion": [
            {
                "level": 3,
                "spells": ["protection-from-evil-and-good", "shield-of-faith"],
            },
            {"level": 5, "spells": ["aid", "zone-of-truth"]},
            {"level": 9, "spells": ["beacon-of-hope", "dispel-magic"]},
            {"level": 13, "spells": ["freedom-of-movement", "guardian-of-faith"]},
            {"level": 17, "spells": ["commune", "flame-strike"]},
        ],
        "warlock__fiend-patron": [
            {
                "level": 3,
                "spells": ["burning-hands", "command", "scorching-ray", "suggestion"],
            },
            {"level": 5, "spells": ["fireball", "stinking-cloud"]},
            {"level": 7, "spells": ["fire-shield", "wall-of-fire"]},
            {"level": 9, "spells": ["geas", "insect-plague"]},
        ],
        "druid__land": [
            {
                "level": 3,
                "land": "arid",
                "spells": ["blur", "burning-hands", "fire-bolt"],
            },
            {"level": 5, "land": "arid", "spells": ["fireball"]},
            {"level": 7, "land": "arid", "spells": ["blight"]},
            {"level": 9, "land": "arid", "spells": ["wall-of-stone"]},
            {
                "level": 3,
                "land": "polar",
                "spells": ["fog-cloud", "hold-person", "ray-of-frost"],
            },
            {"level": 5, "land": "polar", "spells": ["sleet-storm"]},
            {"level": 7, "land": "polar", "spells": ["ice-storm"]},
            {"level": 9, "land": "polar", "spells": ["cone-of-cold"]},
            {
                "level": 3,
                "land": "temperate",
                "spells": ["misty-step", "shocking-grasp", "sleep"],
            },
            {"level": 5, "land": "temperate", "spells": ["lightning-bolt"]},
            {"level": 7, "land": "temperate", "spells": ["freedom-of-movement"]},
            {"level": 9, "land": "temperate", "spells": ["tree-stride"]},
            {
                "level": 3,
                "land": "tropical",
                "spells": ["acid-splash", "ray-of-sickness", "web"],
            },
            {"level": 5, "land": "tropical", "spells": ["stinking-cloud"]},
            {"level": 7, "land": "tropical", "spells": ["polymorph"]},
            {"level": 9, "land": "tropical", "spells": ["insect-plague"]},
        ],
    }


def patch_class_spell_lists(class_to_spells: dict[str, list[str]]) -> None:
    path = LIVE / "classes_srd.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    for entry in payload["entries"]:
        slug = entry["slug"]
        data = entry["data"]
        if slug in NON_CASTERS:
            data["spell_list"] = []
            data["spell_list_note_ru"] = "Класс без списка заклинаний в SRD 5.2.1."
        else:
            spells = sorted(
                class_to_spells.get(slug, []),
                key=lambda s: s,
            )
            # Prefer level order via separate index if present in spells file — keep alpha by slug ok;
            # re-sort using level from spells map below in caller.
            data["spell_list"] = spells
            data["spell_list_note_ru"] = (
                "Список заклинаний SRD 5.2.1; элементы — slug карточек kind=spell, edition=2024."
            )
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def patch_subclass_spell_lists(valid_slugs: set[str]) -> None:
    path = LIVE / "subclasses_srd.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    tables = subclass_spell_tables()
    for entry in payload["entries"]:
        slug = entry["slug"]
        data = entry["data"]
        if slug in tables:
            blocks = tables[slug]
            for block in blocks:
                for s in block["spells"]:
                    assert s in valid_slugs, f"{slug} missing spell {s}"
            data["spell_list"] = blocks
            data["spell_list_note_ru"] = (
                "Всегда подготовленные / круговые заклинания подкласса по SRD 5.2.1."
            )
        else:
            data["spell_list"] = []
            data["spell_list_note_ru"] = "У подкласса нет отдельного списка заклинаний в SRD 5.2.1."
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_counts(rows: list[dict[str, str]]) -> None:
    path = SOURCES / "counts.json"
    counts = json.loads(path.read_text(encoding="utf-8"))
    counts["by_category"]["spells"] = len(rows)
    by_book: dict[str, int] = defaultdict(int)
    for r in rows:
        by_book[r["book"]] += 1
    counts["by_category_book"]["spells"] = dict(sorted(by_book.items()))
    notes = counts.setdefault("notes", [])
    note = (
        "P24-C05: srd-флаги spells сверстаны с SRD 5.2.1 (339); "
        "добавлены 17 строк с именами SRD без эпонима (Acid Arrow и т.п.); "
        "22 ложных negative → true."
    )
    if note not in notes:
        notes.append(note)
    path.write_text(json.dumps(counts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    rows = load_csv_rows()
    rows = patch_spells_csv(rows)
    write_csv(rows)
    update_counts(rows)
    by_id = {r["id"]: r for r in rows}
    pending_ids = load_discrepancy_pending()
    # SRD renames always pending (proposed stripped RU)
    for _old, (new_id, _en, _ru) in SRD_RENAMES.items():
        pending_ids.add(new_id)

    o5 = [json.loads(line) for line in OPEN5E.read_text(encoding="utf-8").splitlines()]
    assert len(o5) == 339, len(o5)

    entries = []
    class_to_spells: dict[str, list[str]] = defaultdict(list)
    level_index: dict[str, int] = {}
    for spell in o5:
        sid = slugify(spell["name"])
        csv_row = by_id.get(sid)
        pending = sid in pending_ids or (
            csv_row is not None and csv_row.get("name_ru") in (None, "", spell["name"])
        )
        # If RU equals EN ascii-ish, mark pending
        if csv_row and csv_row["name_ru"] == csv_row["name_en"]:
            pending = True
        entry = build_spell_entry(spell, csv_row, pending)
        # Fix sort_order: level * 1000 + alphabetical index later
        entries.append(entry)
        level_index[sid] = int(spell["level"])
        for c in entry["data"]["classes"]:
            class_to_spells[c].append(sid)

    entries.sort(key=lambda e: (e["data"]["level"], e["slug"]))
    for i, e in enumerate(entries):
        e["sort_order"] = e["data"]["level"] * 1000 + i

    # Sort class lists by level then slug
    for c, slugs in class_to_spells.items():
        class_to_spells[c] = sorted(slugs, key=lambda s: (level_index[s], s))

    payload = {
        "meta": {
            "pack": "P24-C05",
            "rules_edition": "2024",
            "source": "srd-5.2",
            "notes_ru": (
                "339 заклинаний SRD 5.2.1. Короткие карточки своими словами (не копия SRD). "
                "RU из spells.csv (next.dnd.su); для 17 имён SRD без эпонима — предложено "
                "name_ru_pending. Имена 2014 не подставлять."
            ),
            "srd_spell_count": 339,
        },
        "entries": entries,
    }
    out = LIVE / "spells_srd.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    patch_class_spell_lists(class_to_spells)
    patch_subclass_spell_lists({e["slug"] for e in entries})

    srd_true = sum(1 for r in rows if r["srd"].lower() == "true")
    print(f"wrote {out} entries={len(entries)}")
    print(f"csv srd=true now {srd_true} (expect 339)")
    assert srd_true == 339, srd_true
    assert len(entries) == 339
    # cantrips with scaling
    cans = [e for e in entries if e["data"]["level"] == 0]
    assert len(cans) == 27
    scaled = [e for e in cans if e["data"].get("damage_at_character_level")]
    print(f"cantrips={len(cans)} with char-level table={len(scaled)}")
    for c, slugs in sorted(class_to_spells.items()):
        print(f"  class {c}: {len(slugs)}")


if __name__ == "__main__":
    main()
