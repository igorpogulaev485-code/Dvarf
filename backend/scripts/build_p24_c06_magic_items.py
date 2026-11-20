#!/usr/bin/env python3
"""P24-C06: build magic_items_srd.json + reconcile magic_items.csv srd flags.

Mechanics: SRD 5.2.1 Magic Items A–Z (PDF) + Open5e document srd-2024 for
structured rarity/attunement/charges where available.
RU names: docs/edition-2024/sources/magic_items.csv (next.dnd.su); SRD-renamed
items use stripped RU without author eponym; name_ru_pending when proposed.

Does NOT copy long SRD prose — only short Russian summaries from structured fields.
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
OPEN5E = Path("/tmp/p24-c06/open5e_pages.jsonl")
MI_LINES = Path("/tmp/p24-c06/mi_lines.json")
CSV_PATH = SOURCES / "magic_items.csv"
OUT_JSON = LIVE / "magic_items_srd.json"
GAPS = SOURCES / "gaps.md"
COUNTS = SOURCES / "counts.json"

RARITY_RE = re.compile(
    r"(Common|Uncommon|Rare|Very Rare|Legendary|Artifact|Rarity Varies)"
)
TYPE_LINE = re.compile(
    r"^(Armor|Weapon|Wondrous Item|Potion|Ring|Rod|Staff|Wand|Scroll)"
    r"(\s*[\(,]|,\s)"
)

CAT_EN_TO_KEY = {
    "Armor": "armor",
    "Weapon": "weapon",
    "Wondrous Item": "wondrous",
    "Potion": "potion",
    "Ring": "ring",
    "Rod": "rod",
    "Staff": "staff",
    "Wand": "wand",
    "Scroll": "scroll",
}
CAT_RU = {
    "armor": "доспех",
    "weapon": "оружие",
    "wondrous": "чудесный предмет",
    "potion": "зелье",
    "ring": "кольцо",
    "rod": "жезл",
    "staff": "посох",
    "wand": "палочка",
    "scroll": "свиток",
}
RARITY_KEY = {
    "Common": "common",
    "Uncommon": "uncommon",
    "Rare": "rare",
    "Very Rare": "very_rare",
    "Legendary": "legendary",
    "Artifact": "artifact",
    "Rarity Varies": "varies",
}
RARITY_RU = {
    "common": "обычный",
    "uncommon": "необычный",
    "rare": "редкий",
    "very_rare": "очень редкий",
    "legendary": "легендарный",
    "artifact": "артефакт",
    "varies": "редкость различается",
}

# SRD 5.2.1 heading (EN) → CSV id, optional proposed RU for new/renamed rows
SRD_RENAMES: dict[str, tuple[str, str, str]] = {
    # en_lower: (new_id, name_en, name_ru_proposed)
    "apparatus of the crab": (
        "apparatus-of-the-crab",
        "Apparatus of the Crab",
        "Аппарат краба",
    ),
    "dragon orb": ("dragon-orb", "Dragon Orb", "Драконий шар"),
    "efficient quiver": (
        "efficient-quiver",
        "Efficient Quiver",
        "Вместительный колчан",
    ),
    "feather token": ("feather-token", "Feather Token", "Перо-токен"),
    "handy haversack": (
        "handy-haversack",
        "Handy Haversack",
        "Удобный рюкзак",
    ),
    "instant fortress": (
        "instant-fortress",
        "Instant Fortress",
        "Мгновенная крепость",
    ),
    "iron bands": ("iron-bands", "Iron Bands", "Железные оковы"),
    "marvelous pigments": (
        "marvelous-pigments",
        "Marvelous Pigments",
        "Чудесные краски",
    ),
    "mysterious deck": (
        "mysterious-deck",
        "Mysterious Deck",
        "Таинственная колода",
    ),
}

# Eponym / alternate CSV ids that stay srd=false when SRD uses stripped name
EPONYM_KEEP_FALSE = {
    "apparatus-of-kwalish",
    "orb-of-dragonkind",
    "quaals-feather-token",
    "hewards-handy-haversack",
    "daerns-instant-fortress",
    "iron-bands-of-bilarro",
    "nolzurs-marvelous-pigments",
    "deck-of-many-things",
}

# Family expansions: SRD heading → list of (csv_id, name_en, rarity_key, extra)
FAMILY_EXPAND: dict[str, list[tuple[str, str, str, dict[str, Any]]]] = {
    "Potions of Healing": [
        ("potion-of-healing", "Potion of Healing", "common", {"heal": "2d4+2"}),
        (
            "potion-of-greater-healing",
            "Potion of Greater Healing",
            "uncommon",
            {"heal": "4d4+4"},
        ),
        (
            "potion-of-superior-healing",
            "Potion of Superior Healing",
            "rare",
            {"heal": "8d4+8"},
        ),
        (
            "potion-of-supreme-healing",
            "Potion of Supreme Healing",
            "very_rare",
            {"heal": "10d4+20"},
        ),
    ],
    "Spell Scroll": [
        ("spell-scroll-cantrip", "Spell Scroll (Cantrip)", "common", {"spell_level": 0}),
        ("spell-scroll-level-1", "Spell Scroll (Level 1)", "common", {"spell_level": 1}),
        ("spell-scroll-level-2", "Spell Scroll (Level 2)", "uncommon", {"spell_level": 2}),
        ("spell-scroll-level-3", "Spell Scroll (Level 3)", "uncommon", {"spell_level": 3}),
        ("spell-scroll-level-4", "Spell Scroll (Level 4)", "rare", {"spell_level": 4}),
        ("spell-scroll-level-5", "Spell Scroll (Level 5)", "rare", {"spell_level": 5}),
        ("spell-scroll-level-6", "Spell Scroll (Level 6)", "very_rare", {"spell_level": 6}),
        ("spell-scroll-level-7", "Spell Scroll (Level 7)", "very_rare", {"spell_level": 7}),
        ("spell-scroll-level-8", "Spell Scroll (Level 8)", "very_rare", {"spell_level": 8}),
        ("spell-scroll-level-9", "Spell Scroll (Level 9)", "legendary", {"spell_level": 9}),
    ],
    "Ammunition, +1, +2, or +3": [
        ("ammunition-1", "Ammunition, +1", "uncommon", {"bonus_attack": 1, "bonus_damage": 1}),
        ("ammunition-2", "Ammunition, +2", "rare", {"bonus_attack": 2, "bonus_damage": 2}),
        ("ammunition-3", "Ammunition, +3", "very_rare", {"bonus_attack": 3, "bonus_damage": 3}),
    ],
    "Armor, +1, +2, or +3": [
        ("armor-1", "Armor, +1", "rare", {"bonus_ac": 1}),
        ("armor-2", "Armor, +2", "very_rare", {"bonus_ac": 2}),
        ("armor-3", "Armor, +3", "legendary", {"bonus_ac": 3}),
    ],
    "Weapon, +1, +2, or +3": [
        ("weapon-1", "Weapon, +1", "uncommon", {"bonus_attack": 1, "bonus_damage": 1}),
        ("weapon-2", "Weapon, +2", "rare", {"bonus_attack": 2, "bonus_damage": 2}),
        ("weapon-3", "Weapon, +3", "very_rare", {"bonus_attack": 3, "bonus_damage": 3}),
    ],
    "Shield, +1, +2, or +3": [
        ("shield-1", "Shield, +1", "uncommon", {"bonus_ac": 1}),
        ("shield-2", "Shield, +2", "rare", {"bonus_ac": 2}),
        ("shield-3", "Shield, +3", "very_rare", {"bonus_ac": 3}),
    ],
    "Wand of the War Mage, +1, +2, or +3": [
        (
            "wand-of-the-war-mage-1",
            "Wand of the War Mage, +1",
            "uncommon",
            {"bonus_spell_attack": 1},
        ),
        (
            "wand-of-the-war-mage-2",
            "Wand of the War Mage, +2",
            "rare",
            {"bonus_spell_attack": 2},
        ),
        (
            "wand-of-the-war-mage-3",
            "Wand of the War Mage, +3",
            "very_rare",
            {"bonus_spell_attack": 3},
        ),
    ],
    "Potion of Giant Strength": [
        (
            "potion-of-giant-strength-hill",
            "Potion of Giant Strength (hill)",
            "uncommon",
            {"strength_score": 21},
        ),
        (
            "potion-of-giant-strength-frost",
            "Potion of Giant Strength (frost)",
            "rare",
            {"strength_score": 23},
        ),
        (
            "potion-of-giant-strength-stone",
            "Potion of Giant Strength (stone)",
            "rare",
            {"strength_score": 23},
        ),
        (
            "potion-of-giant-strength-fire",
            "Potion of Giant Strength (fire)",
            "rare",
            {"strength_score": 25},
        ),
        (
            "potion-of-giant-strength-cloud",
            "Potion of Giant Strength (cloud)",
            "very_rare",
            {"strength_score": 27},
        ),
        (
            "potion-of-giant-strength-storm",
            "Potion of Giant Strength (storm)",
            "legendary",
            {"strength_score": 29},
        ),
    ],
}

# Meta family headers in CSV that should stay srd=false
META_FALSE = {
    "ammunition-1-2-or-3",
    "armor-1-2-or-3",
    "weapon-1-2-or-3",
    "shield-1-2-or-3",
    "wand-of-the-war-mage-1-2-or-3",
    "spell-scroll",
    "potion-of-healing__dmg24",
    "potion-of-giant-strength",  # parent; variants are seeded
    "quaals-feather-token",  # eponym parent; SRD uses feather-token
}

ATTUNE_BY_RU = {
    "a spellcaster": "заклинатель",
    "spellcaster": "заклинатель",
    "a cleric or paladin": "жрец или паладин",
    "a cleric, druid, or paladin": "жрец, друид или паладин",
    "a creature with the spellcasting or pact magic feature": (
        "существо с умением «Использование заклинаний» или «Магия договора»"
    ),
    "a bard": "бард",
    "a druid or warlock": "друид или колдун",
    "a druid": "друид",
    "a sorcerer, warlock, or wizard": "чародей, колдун или волшебник",
    "a druid, sorcerer, warlock, or wizard": "друид, чародей, колдун или волшебник",
    "a cleric, druid, or wizard": "жрец, друид или волшебник",
    "a wizard": "волшебник",
    "a barbarian": "варвар",
    "a paladin": "паладин",
    "a dwarf or a creature attuned to a belt of dwarvenkind": (
        "дварф или существо, настроившееся на Пояс дварфов"
    ),
    "a fighter or rogue": "боец или плут",
}

SPELL_NAME_TO_SLUG_FIX = {
    "animal friendship": "animal-friendship",
    "detect thoughts": "detect-thoughts",
    "enlarge/reduce": "enlarge-reduce",
    "gaseous form": "gaseous-form",
    "magic missile": "magic-missile",
    "scorching ray": "scorching-ray",
    "burning hands": "burning-hands",
    "wall of fire": "wall-of-fire",
    "fire shield": "fire-shield",
    "ice storm": "ice-storm",
    "wall of ice": "wall-of-ice",
    "cone of cold": "cone-of-cold",
    "cure wounds": "cure-wounds",
    "lesser restoration": "lesser-restoration",
    "mass cure wounds": "mass-cure-wounds",
    "fly": "fly",
    "levitate": "levitate",
    "invisibility": "invisibility",
    "pass without trace": "pass-without-trace",
    "protection from evil and good": "protection-from-evil-and-good",
    "dispel magic": "dispel-magic",
    "remove curse": "remove-curse",
    "identify": "identify",
    "detect magic": "detect-magic",
    "see invisibility": "see-invisibility",
    "tongues": "tongues",
    "teleport": "teleport",
    "dimension door": "dimension-door",
    "fireball": "fireball",
    "lightning bolt": "lightning-bolt",
    "hold person": "hold-person",
    "hold monster": "hold-monster",
    "polymorph": "polymorph",
    "web": "web",
    "fear": "fear",
    "speak with animals": "speak-with-animals",
    "water walk": "water-walk",
    "water breathing": "water-breathing",
    "bless": "bless",
    "clairvoyance": "clairvoyance",
    "locate object": "locate-object",
    "locate creature": "locate-creature",
    "plane shift": "plane-shift",
    "gate": "gate",
    "wish": "wish",
    "commune": "commune",
    "raise dead": "raise-dead",
    "resurrection": "resurrection",
    "true resurrection": "true-resurrection",
    "revivify": "revivify",
    "heal": "heal",
    "heroism": "heroism",
    "jump": "jump",
    "misty step": "misty-step",
    "passwall": "passwall",
    "sending": "sending",
    "shield": "shield",
    "silence": "silence",
    "sleep": "sleep",
    "slow": "slow",
    "suggestion": "suggestion",
    "telekinesis": "telekinesis",
    "true seeing": "true-seeing",
    "wind walk": "wind-walk",
    "insect plague": "insect-plague",
    "giant insect": "giant-insect",
    "awaken": "awaken",
    "barkskin": "barkskin",
    "call lightning": "call-lightning",
    "wall of thorns": "wall-of-thorns",
    "speak with plants": "speak-with-plants",
    "animal friendship": "animal-friendship",
}


def norm(s: str) -> str:
    return (
        (s or "")
        .lower()
        .replace("’", "'")
        .replace("‘", "'")
        .replace("–", "-")
        .strip()
    )


def slugify(name: str) -> str:
    s = norm(name)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def load_spell_slugs() -> set[str]:
    path = LIVE / "spells_srd.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries") if isinstance(payload, dict) else payload
    return {e["slug"] for e in entries}


def load_c03_refs() -> dict[str, set[str]]:
    """Category tokens → concrete C03 slugs for resolution tests."""
    weapons = json.loads((LIVE / "weapons_srd.json").read_text(encoding="utf-8"))["entries"]
    armor = json.loads((LIVE / "armor_srd.json").read_text(encoding="utf-8"))["entries"]
    equipment = json.loads((LIVE / "equipment_srd.json").read_text(encoding="utf-8"))["entries"]
    out: dict[str, set[str]] = defaultdict(set)
    for w in weapons:
        cat = w["data"].get("category")
        rk = w["data"].get("range_kind")
        out[f"weapon:{cat}"].add(w["slug"])
        out[f"weapon:{rk}"].add(w["slug"])
        out["weapon:any"].add(w["slug"])
        out[f"weapon:{cat}:{rk}"].add(w["slug"])
    for a in armor:
        kind = a["data"].get("armor_kind")
        out[f"armor:{kind}"].add(a["slug"])
        if kind != "shield":
            out["armor:any"].add(a["slug"])
        out[a["slug"]].add(a["slug"])
    for e in equipment:
        if e["data"].get("equipment_group") == "ammunition" or e["slug"] in {
            "arrows",
            "crossbow-bolts",
            "sling-bullets",
            "needles",
            "firearm-bullets",
            "ammunition",
        }:
            out["ammunition"].add(e["slug"])
    return out


def parse_pdf_headings(lines: list[str]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        if not ln:
            i += 1
            continue
        # Join split title: "Amulet of Proof against Detection" + "and Location"
        title = ln
        type_idx = i + 1
        if (
            i + 1 < len(lines)
            and lines[i + 1]
            and lines[i + 1][0].islower()
            and not TYPE_LINE.match(lines[i + 1])
            and i + 2 < len(lines)
            and TYPE_LINE.match(lines[i + 2] or "")
        ):
            title = f"{ln} {lines[i + 1]}"
            type_idx = i + 2

        if type_idx >= len(lines) or not lines[type_idx]:
            i += 1
            continue
        type_ln = lines[type_idx]
        # Allow Armor/Weapon/Shield/Ammunition family titles that look like type lines
        if not TYPE_LINE.match(type_ln):
            i += 1
            continue
        # Skip if title itself is a type line (unless +1 family)
        if TYPE_LINE.match(title) and "+1" not in title and "+2" not in title:
            i += 1
            continue
        if title.endswith(".") or (title and title[0].islower()):
            i += 1
            continue
        if len(title) > 80:
            i += 1
            continue
        if re.match(r"^[\d•(]", title) or re.search(r"\d+d\d+|HP Regained", title):
            i += 1
            continue

        window = [type_ln]
        j = type_idx + 1
        while j < len(lines) and len(window) < 3:
            if lines[j]:
                window.append(lines[j])
            j += 1
        joined = " ".join(window)
        if not RARITY_RE.search(joined):
            i += 1
            continue

        cat_m = TYPE_LINE.match(type_ln)
        assert cat_m
        cat = CAT_EN_TO_KEY[cat_m.group(1)]
        rarities = []
        for r in RARITY_RE.findall(joined):
            if r not in rarities:
                rarities.append(r)
        attune = "Requires Attunement" in joined
        attune_by = None
        am = re.search(r"Requires Attunement by ([^)]+)\)", joined)
        if am:
            attune_by = am.group(1).strip()

        # base item categories from type paren
        base_cats: list[str] = []
        paren = re.search(r"\(([^)]+)\)", type_ln)
        if paren:
            base_cats = parse_base_categories(cat, paren.group(1))

        # bonus +1/+2/+3 from family titles
        bonus_attack = None
        bonus_ac = None
        if re.search(r"\+1.+\+2.+\+3", title) or title.endswith("+3"):
            pass  # expanded later

        items.append(
            {
                "name_en": title,
                "category": cat,
                "rarities": rarities,
                "requires_attunement": attune,
                "attunement_restriction_en": attune_by,
                "base_item_categories": base_cats,
                "type_joined": joined[:240],
                "line_idx": type_idx,
            }
        )
        i = type_idx + 1

    # Dedup by name keeping first
    seen: set[str] = set()
    uniq: list[dict[str, Any]] = []
    for it in items:
        if it["name_en"] in seen:
            continue
        seen.add(it["name_en"])
        uniq.append(it)
    return uniq


def parse_base_categories(cat: str, paren: str) -> list[str]:
    p = paren.lower()
    out: list[str] = []
    if cat == "armor":
        if "shield" in p and "any" not in p:
            out.append("armor:shield")
        if "any light, medium, or heavy" in p or "any light medium or heavy" in p:
            out.extend(["armor:light", "armor:medium", "armor:heavy"])
        elif "any medium or heavy" in p:
            out.extend(["armor:medium", "armor:heavy"])
            if "except hide" in p:
                out.append("armor:exclude:hide-armor")
        elif "any light" in p:
            out.append("armor:light")
        elif "plate" in p:
            out.append("plate-armor")
        elif "shield" in p:
            out.append("armor:shield")
    elif cat == "weapon":
        if "any ammunition" in p:
            out.append("ammunition")
        elif "any simple or martial" in p:
            out.extend(["weapon:simple", "weapon:martial"])
        elif "any" in p:
            out.append("weapon:any")
        # specific named weapons left empty — card is that weapon type conceptually
    return out


def load_open5e() -> dict[str, dict[str, Any]]:
    """Map normalized EN name → best Open5e row."""
    if not OPEN5E.is_file():
        return {}
    by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for line in OPEN5E.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        by_name[norm(row["name"])].append(row)

    def score(r: dict[str, Any]) -> tuple[int, int]:
        key = r.get("key") or ""
        # Prefer srd-2024_ over srd_, prefer no paren expansions already filtered
        pref = 2 if key.startswith("srd-2024_") else 1 if key.startswith("srd_") else 0
        return (pref, -len(key))

    out: dict[str, dict[str, Any]] = {}
    for name, rows in by_name.items():
        rows_sorted = sorted(rows, key=score, reverse=True)
        out[name] = rows_sorted[0]
    return out


def extract_charges(desc: str) -> dict[str, Any] | None:
    if not desc:
        return None
    m = re.search(
        r"(?:has|have)\s+(\d+)\s+charges?.*?regains?\s+([^.]+?)(?:\.|$)",
        desc,
        re.I | re.S,
    )
    if not m:
        m2 = re.search(r"(\d+)\s+charges?", desc, re.I)
        if not m2:
            return None
        return {"max": int(m2.group(1)), "recharge_ru": None}
    max_c = int(m.group(1))
    regain = m.group(2).strip()
    # Short RU for dawn recharge patterns
    recharge_ru = None
    dm = re.search(r"(1d\d+\s*\+\s*\d+|\d+d\d+(?:\s*\+\s*\d+)?|\d+)\s+expended charges", regain, re.I)
    if "dawn" in regain.lower():
        if dm:
            recharge_ru = f"на рассвете восстанавливает {dm.group(1).replace(' ', '')} зарядов"
        else:
            recharge_ru = "заряды восстанавливаются на рассвете"
    elif "dusk" in regain.lower():
        recharge_ru = "заряды восстанавливаются в сумерках"
    return {"max": max_c, "recharge_ru": recharge_ru}


def extract_spell_refs(desc: str, spell_slugs: set[str]) -> list[str]:
    """Only names that appear as cast targets (avoid 'Shield' armor false hits)."""
    if not desc:
        return []
    found: list[str] = []
    lower = desc.lower()
    candidates = sorted(SPELL_NAME_TO_SLUG_FIX.items(), key=lambda x: -len(x[0]))
    for name, slug in candidates:
        if slug not in spell_slugs:
            continue
        # "cast Fireball" / "cast the … Fireball" / "cast one of the spells … Fireball"
        if re.search(
            rf"(?:cast|casting|casts)\b[^\n.]{{0,80}}\b{re.escape(name)}\b",
            lower,
        ) or re.search(
            rf"\b{re.escape(name)}\b[^\n.]{{0,40}}(?:spell|from it)",
            lower,
        ):
            if slug not in found:
                found.append(slug)
    return found[:12]


def extract_bonus(desc: str, title: str) -> tuple[int | None, int | None, int | None]:
    """Return bonus_attack, bonus_damage, bonus_ac."""
    bonus_attack = bonus_damage = bonus_ac = None
    blob = f"{title} {desc or ''}"
    m = re.search(r"\+(\d)\s+bonus to (?:attack rolls and damage rolls|attack and damage)", blob, re.I)
    if m:
        v = int(m.group(1))
        bonus_attack = bonus_damage = v
    m = re.search(r"\+(\d)\s+bonus to Armor Class", blob, re.I)
    if m:
        bonus_ac = int(m.group(1))
    m = re.search(r"\+(\d)\s+bonus to attack rolls.*?spell", blob, re.I)
    # war mage handled via family
    if re.search(r"bonus to Armor Class while wearing", blob, re.I):
        m2 = re.search(r"\+(\d)", title)
        if m2 and bonus_ac is None:
            bonus_ac = int(m2.group(1))
    return bonus_attack, bonus_damage, bonus_ac


def attune_ru(en: str | None) -> tuple[str | None, bool]:
    """Return (ru, pending). pending=True only when we invented a label."""
    if not en:
        return None, False
    key = norm(en)
    # Strip Open5e prefix
    key = re.sub(r"^requires attunement by\s+", "", key).strip()
    if key in ATTUNE_BY_RU:
        return ATTUNE_BY_RU[key], False
    for k, v in sorted(ATTUNE_BY_RU.items(), key=lambda x: -len(x[0])):
        if k in key:
            return v, False
    cleaned = re.sub(r"^(a|an)\s+", "", en, flags=re.I).strip()
    cleaned = re.sub(r"^requires attunement by\s+", "", cleaned, flags=re.I).strip()
    return f"Предложено: ограничение настройки", True


def is_cursed(desc: str, type_joined: str) -> bool:
    blob = f"{desc} {type_joined}"
    return bool(re.search(r"\bCurse\b|\bcursed\b", blob))


_BASE_CAT_RU = {
    "armor:light": "лёгкий доспех",
    "armor:medium": "средний доспех",
    "armor:heavy": "тяжёлый доспех",
    "armor:shield": "щит",
    "armor:any": "любой доспех",
    "armor:exclude:hide-armor": "кроме доспеха из шкур",
    "weapon:simple": "простое оружие",
    "weapon:martial": "воинское оружие",
    "weapon:melee": "рукопашное оружие",
    "weapon:ranged": "дальнобойное оружие",
    "weapon:any": "любое оружие",
    "ammunition": "боеприпасы",
    "plate-armor": "латы",
}


def short_summary_ru(card: dict[str, Any]) -> str:
    parts: list[str] = []
    typ = CAT_RU.get(card["magic_item_type"], "предмет")
    rar = RARITY_RU.get(card["rarity"], card["rarity"])
    parts.append(f"{typ.capitalize()}, {rar}.")
    if card.get("requires_attunement"):
        rest = card.get("attunement_restriction_ru")
        if rest:
            parts.append(f"Настройка ({rest}).")
        else:
            parts.append("Требует настройки.")
    if card.get("bonus_ac"):
        parts.append(f"Бонус +{card['bonus_ac']} к КД.")
    if card.get("bonus_attack"):
        dmg = card.get("bonus_damage")
        if dmg:
            parts.append(f"Бонус +{card['bonus_attack']} к атаке и урону.")
        else:
            parts.append(f"Бонус +{card['bonus_attack']} к атаке.")
    if card.get("bonus_spell_attack"):
        parts.append(
            f"Бонус +{card['bonus_spell_attack']} к броскам атаки заклинаниями."
        )
    if card.get("charges"):
        ch = card["charges"]
        bit = f"Заряды: {ch['max']}."
        if ch.get("recharge_ru"):
            bit += f" {ch['recharge_ru']}."
        parts.append(bit)
    if card.get("spell_refs"):
        n = len(card["spell_refs"])
        parts.append(
            f"Позволяет накладывать {n} связанн{'ое' if n == 1 else 'ых'} заклинани{'е' if n == 1 else 'й'}."
        )
    if card.get("heal"):
        parts.append(f"Восстанавливает {card['heal']} хитов.")
    if card.get("strength_score"):
        parts.append(f"Сила становится {card['strength_score']} на 1 час.")
    if card.get("spell_level") is not None:
        lvl = card["spell_level"]
        if lvl == 0:
            parts.append("Содержит один заговор.")
        else:
            parts.append(f"Содержит одно заклинание {lvl}-го круга.")
    cats = card.get("base_item_categories") or []
    if cats:
        # Dedup preserving order
        seen: list[str] = []
        for c in cats:
            if c not in seen:
                seen.append(c)
        labels = [_BASE_CAT_RU.get(c, "допустимая база C03") for c in seen]
        parts.append("База: " + ", ".join(labels) + ".")
    if card.get("cursed"):
        parts.append("Проклят.")
    if len(parts) == 1:
        parts.append("Кратко: магический предмет редакции 2024 из открытого справочника.")
    return " ".join(parts)


def map_heading_to_seed_rows(
    heading: dict[str, Any],
    csv_by_en: dict[str, dict[str, str]],
    csv_by_id: dict[str, dict[str, str]],
) -> list[dict[str, Any]]:
    """Expand one SRD heading into one or more seed card specs."""
    name = heading["name_en"]
    if name in FAMILY_EXPAND:
        rows = []
        for cid, en, rar, extra in FAMILY_EXPAND[name]:
            rows.append(
                {
                    "id": cid,
                    "name_en": en,
                    "category": heading["category"],
                    "rarity": rar,
                    "requires_attunement": heading["requires_attunement"],
                    "attunement_restriction_en": heading["attunement_restriction_en"],
                    "base_item_categories": heading["base_item_categories"],
                    "type_joined": heading["type_joined"],
                    "extra": extra,
                    "name_ru_pending": False,
                    "from_family": name,
                }
            )
        return rows

    key = norm(name)
    # SRD renames
    if key in SRD_RENAMES:
        nid, nen, nru = SRD_RENAMES[key]
        return [
            {
                "id": nid,
                "name_en": nen,
                "name_ru": nru,
                "name_ru_pending": True,
                "category": heading["category"],
                "rarity": RARITY_KEY.get(heading["rarities"][0], "uncommon")
                if heading["rarities"]
                else "uncommon",
                "requires_attunement": heading["requires_attunement"],
                "attunement_restriction_en": heading["attunement_restriction_en"],
                "base_item_categories": heading["base_item_categories"],
                "type_joined": heading["type_joined"],
                "extra": {},
                "from_family": None,
            }
        ]

    # Stone of Good Luck (Luckstone)
    if name.startswith("Stone of Good Luck"):
        hit = (
            csv_by_id.get("stone-of-good-luck-luckstone")
            or csv_by_en.get(norm("Stone of Good Luck (Luckstone)"))
            or csv_by_id.get("stone-of-good-luck")
        )
        cid = hit["id"] if hit else "stone-of-good-luck-luckstone"
        return [
            {
                "id": cid,
                "name_en": hit["name_en"] if hit else "Stone of Good Luck (Luckstone)",
                "category": heading["category"],
                "rarity": RARITY_KEY.get(heading["rarities"][0], "uncommon"),
                "requires_attunement": heading["requires_attunement"],
                "attunement_restriction_en": heading["attunement_restriction_en"],
                "base_item_categories": heading["base_item_categories"],
                "type_joined": heading["type_joined"],
                "extra": {},
                "name_ru_pending": False,
                "from_family": None,
            }
        ]

    hit = csv_by_en.get(key) or csv_by_id.get(slugify(name))
    if not hit:
        # try without parenthetical
        base = re.sub(r"\s*\([^)]+\)\s*$", "", name).strip()
        hit = csv_by_en.get(norm(base)) or csv_by_id.get(slugify(base))
    if not hit:
        raise KeyError(f"No CSV row for SRD item: {name}")

    rarity = RARITY_KEY.get(heading["rarities"][0], "uncommon") if heading["rarities"] else "uncommon"
    return [
        {
            "id": hit["id"],
            "name_en": hit["name_en"],
            "category": heading["category"],
            "rarity": rarity,
            "requires_attunement": heading["requires_attunement"],
            "attunement_restriction_en": heading["attunement_restriction_en"],
            "base_item_categories": heading["base_item_categories"],
            "type_joined": heading["type_joined"],
            "extra": {},
            "name_ru_pending": False,
            "from_family": None,
        }
    ]


def build_card(
    spec: dict[str, Any],
    csv_by_id: dict[str, dict[str, str]],
    open5e: dict[str, dict[str, Any]],
    spell_slugs: set[str],
    sort_order: int,
) -> dict[str, Any]:
    cid = spec["id"]
    csv_row = csv_by_id.get(cid)
    name_en = spec["name_en"]
    if csv_row:
        name_ru = csv_row["name_ru"]
        external_ref = {
            "url_dndsu": csv_row.get("url_dndsu") or None,
            "url_ttg": csv_row.get("url_ttg") or None,
            "book": csv_row.get("book") or "DMG24",
        }
        pending = False
    else:
        name_ru = spec.get("name_ru") or name_en
        external_ref = {"url_dndsu": None, "url_ttg": None, "book": "SRD5.2.1"}
        pending = True
    if spec.get("name_ru_pending"):
        pending = True
        if spec.get("name_ru"):
            name_ru = spec["name_ru"]

    o5 = open5e.get(norm(name_en))
    if not o5:
        # try without +N / parenthetical
        o5 = open5e.get(norm(re.sub(r",\s*\+\d.*$", "", name_en)))
    desc = (o5 or {}).get("desc") or ""
    if o5 and o5.get("requires_attunement") is not None:
        requires_attunement = bool(o5["requires_attunement"])
    else:
        requires_attunement = bool(spec["requires_attunement"])
    attune_detail = None
    if o5 and o5.get("attunement_detail"):
        attune_detail = o5["attunement_detail"]
    elif spec.get("attunement_restriction_en"):
        attune_detail = spec["attunement_restriction_en"]

    rarity = spec["rarity"]
    if o5 and o5.get("rarity") and rarity == "varies":
        rk = (o5["rarity"].get("key") if isinstance(o5["rarity"], dict) else None) or rarity
        rarity = rk if rk != "varies" else rarity

    magic_type = spec["category"]
    # Shield subtype stays armor
    if "shield" in norm(name_en) and magic_type == "armor":
        pass

    charges = extract_charges(desc)
    spell_refs = extract_spell_refs(desc, spell_slugs)
    bonus_attack, bonus_damage, bonus_ac = extract_bonus(desc, name_en)
    extra = spec.get("extra") or {}
    if "bonus_attack" in extra:
        bonus_attack = extra["bonus_attack"]
    if "bonus_damage" in extra:
        bonus_damage = extra["bonus_damage"]
    if "bonus_ac" in extra:
        bonus_ac = extra["bonus_ac"]
    bonus_spell_attack = extra.get("bonus_spell_attack")

    attune_restriction_ru = None
    if requires_attunement and attune_detail:
        attune_restriction_ru, attune_pending = attune_ru(str(attune_detail))
        if attune_pending:
            pending = True

    cursed = is_cursed(desc, spec.get("type_joined") or "")
    base_cats = list(dict.fromkeys(spec.get("base_item_categories") or []))

    data: dict[str, Any] = {
        "schema_version": 1,
        "equipment_group": "magic_item",
        "magic_item_type": magic_type,
        "magic_item_type_ru": CAT_RU[magic_type],
        "rarity": rarity,
        "rarity_ru": RARITY_RU.get(rarity, rarity),
        "requires_attunement": requires_attunement,
        "attunement_restriction_ru": attune_restriction_ru,
        "charges": charges,
        "bonus_attack": bonus_attack,
        "bonus_damage": bonus_damage,
        "bonus_ac": bonus_ac,
        "bonus_spell_attack": bonus_spell_attack,
        "cursed": cursed,
        "spell_refs": spell_refs,
        "base_item_categories": base_cats,
        "name_ru_pending": pending,
        "summary_ru": "",
    }
    if "heal" in extra:
        data["heal"] = extra["heal"]
    if "strength_score" in extra:
        data["strength_score"] = extra["strength_score"]
    if "spell_level" in extra:
        data["spell_level"] = extra["spell_level"]

    data["summary_ru"] = short_summary_ru(data)

    return {
        "kind": "item",
        "slug": cid,
        "name_ru": name_ru,
        "name_en": name_en,
        "source": "srd-5.2",
        "sort_order": sort_order,
        "external_ref": external_ref,
        "data": data,
    }


def update_csv(
    seed_ids: set[str],
    new_rows: list[dict[str, str]],
) -> tuple[int, int]:
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    fieldnames = list(rows[0].keys())
    existing_ids = {r["id"] for r in rows}
    true_before = sum(1 for r in rows if r["srd"].lower() == "true")

    for r in rows:
        if r["id"] in META_FALSE or r["id"] in EPONYM_KEEP_FALSE:
            r["srd"] = "false"
        elif r["id"] in seed_ids:
            r["srd"] = "true"
        else:
            r["srd"] = "false"

    for nr in new_rows:
        if nr["id"] in existing_ids:
            # update existing
            for r in rows:
                if r["id"] == nr["id"]:
                    r.update(nr)
                    break
        else:
            rows.append(nr)
            existing_ids.add(nr["id"])

    # stable-ish sort: by book then id
    rows.sort(key=lambda r: (r.get("book") or "", r["id"]))
    with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    true_after = sum(1 for r in rows if r["srd"].lower() == "true")
    return true_before, true_after


def patch_gaps(seed_count: int, notes: list[str]) -> None:
    text = GAPS.read_text(encoding="utf-8")
    block = (
        f"- **P24-C06 (2026-11-15):** эвристика `srd` для **магических предметов** "
        f"в `magic_items.csv` была полностью `false` (0). По разделу Magic Items A–Z "
        f"SRD 5.2.1 засеяно **{seed_count}** карточек (`srd=true`):\n"
    )
    for n in notes:
        block += f"  - {n}\n"
    block += (
        "  - Зелья лечения (4) и свитки заклинаний (cantrip–9) сидятся здесь "
        "(C03 их отдал). Книжные предметы сверх SRD — C11+.\n"
    )
    if "**P24-C06" in text:
        # replace existing C06 block if re-run
        text = re.sub(
            r"- \*\*P24-C06.*?(?=\n- \*\*P24-|\n## |\Z)",
            block,
            text,
            flags=re.S,
        )
    else:
        # append after C05 block
        if "**P24-C05" in text:
            # find end of C05 bullet cluster
            idx = text.find("**P24-C05")
            # insert after C05 section's last line before next ## or EOF
            rest = text[idx:]
            m = re.search(r"\n## ", rest)
            if m:
                insert_at = idx + m.start()
                text = text[:insert_at] + block + text[insert_at:]
            else:
                text = text.rstrip() + "\n" + block
        else:
            text = text.rstrip() + "\n" + block
    GAPS.write_text(text, encoding="utf-8")


def patch_counts(seed_count: int) -> None:
    data = json.loads(COUNTS.read_text(encoding="utf-8"))
    # recount magic_items after CSV rewrite
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    data["by_category"]["magic_items"] = len(rows)
    books: Counter[str] = Counter(r["book"] for r in rows)
    data["by_category_book"]["magic_items"] = dict(sorted(books.items()))
    notes = data.setdefault("notes", [])
    note = (
        f"P24-C06: srd-флаги magic_items сверстаны с SRD 5.2.1 ({seed_count}); "
        "добавлены строки с именами SRD без эпонима (Apparatus of the Crab и т.п.)."
    )
    notes[:] = [n for n in notes if not n.startswith("P24-C06:")]
    notes.append(note)
    COUNTS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    lines = json.loads(MI_LINES.read_text(encoding="utf-8"))
    headings = parse_pdf_headings(lines)
    # Ensure Armor+/Weapon+ present
    names = {h["name_en"] for h in headings}
    assert "Armor, +1, +2, or +3" in names, names
    assert "Weapon, +1, +2, or +3" in names
    assert "Amulet of Proof against Detection and Location" in names

    csv_rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    csv_by_en = {norm(r["name_en"]): r for r in csv_rows}
    csv_by_id = {r["id"]: r for r in csv_rows}

    spell_slugs = load_spell_slugs()
    open5e = load_open5e()

    seed_specs: list[dict[str, Any]] = []
    for h in headings:
        seed_specs.extend(map_heading_to_seed_rows(h, csv_by_en, csv_by_id))

    # Dedup by id (families / overlaps)
    seen_ids: set[str] = set()
    uniq_specs: list[dict[str, Any]] = []
    for s in seed_specs:
        if s["id"] in seen_ids:
            continue
        seen_ids.add(s["id"])
        uniq_specs.append(s)

    # New CSV rows for renames / missing
    new_csv_rows: list[dict[str, str]] = []
    for s in uniq_specs:
        if s["id"] in csv_by_id:
            continue
        new_csv_rows.append(
            {
                "id": s["id"],
                "name_en": s["name_en"],
                "name_ru": s.get("name_ru") or s["name_en"],
                "book": "SRD5.2.1",
                "category": "magic_items",
                "url_dndsu": "",
                "url_ttg": "",
                "srd": "true",
            }
        )

    cards = [
        build_card(s, csv_by_id, open5e, spell_slugs, 10 + i * 10)
        for i, s in enumerate(uniq_specs)
    ]

    # Refresh csv_by_id after we know new rows
    seed_ids = {c["slug"] for c in cards}
    true_before, true_after = update_csv(seed_ids, new_csv_rows)
    assert true_after == len(cards), (true_after, len(cards))

    payload = {
        "meta": {
            "pack": "P24-C06",
            "source": "SRD 5.2.1 Magic Items A–Z",
            "count": len(cards),
            "notes": [
                "Short RU summaries only; no long SRD prose.",
                "Healing potions + spell scrolls included (from C03 handoff).",
                "Eponym PHB/DMG names stay srd=false; SRD-stripped ids added.",
            ],
        },
        "entries": cards,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    notes = [
        f"**Были `false` → `true`:** {true_after} строк после сверки с PDF (было {true_before}).",
        "**Имена SRD без эпонима (добавлены):** Apparatus of the Crab, Dragon Orb, "
        "Efficient Quiver, Feather Token, Handy Haversack, Instant Fortress, "
        "Iron Bands, Marvelous Pigments, Mysterious Deck.",
        "**Семейства развернуты:** Potions of Healing×4, Spell Scroll×10, "
        "Ammunition/Armor/Weapon/Shield +1..+3, Wand of the War Mage +1..+3, "
        "Potion of Giant Strength×6.",
        "**Эпонимы остаются `false`:** Apparatus of Kwalish, Orb of Dragonkind, "
        "Quaal’s Feather Token, Heward’s Handy Haversack, Daern’s Instant Fortress, "
        "Iron Bands of Bilarro, Nolzur’s Marvelous Pigments, Deck of Many Things.",
    ]
    patch_gaps(len(cards), notes)
    patch_counts(len(cards))

    by_type = Counter(c["data"]["magic_item_type"] for c in cards)
    by_rar = Counter(c["data"]["rarity"] for c in cards)
    print(
        json.dumps(
            {
                "seed_count": len(cards),
                "csv_srd_true": true_after,
                "by_type": dict(by_type),
                "by_rarity": dict(by_rar),
                "new_csv_rows": [r["id"] for r in new_csv_rows],
                "pending_ru": sum(1 for c in cards if c["data"]["name_ru_pending"]),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
