"""Display strings in 2024 live catalog waves must be Russian (no Latin prose).

Machine keys (name_en, id/slug, enums, spell_list ids, URLs) are out of scope.
Allowed Latin in display fields: dice tokens like 8d6 / 1d10.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

LIVE = Path(__file__).resolve().parents[1] / "data" / "srd" / "2024" / "live"

WAVE_FILES = (
    "species_srd.json",
    "backgrounds_srd.json",
    "feats_srd.json",
    "weapons_srd.json",
    "armor_srd.json",
    "equipment_srd.json",
    "weapon_mastery_srd.json",
    "classes_srd.json",
    "subclasses_srd.json",
    "spells_srd.json",
    "magic_items_srd.json",
    "creatures_srd.json",
    "animals_srd.json",
    "species_ph24.json",
    "backgrounds_ph24.json",
    "subclasses_ph24.json",
    "feats_ph24.json",
    "spells_ph24.json",
)

DISPLAY_LEAVES = frozenset(
    {
        "summary_ru",
        "description",
        "traits_text",
        "utilize_ru",
        "spell_list_note_ru",
        "repeatable_note_ru",
        "higher_levels",
        "duration",
        "range",
        "don_time",
        "doff_time",
        "m",
        "condition",
        "name_ru",
        "damage",
        "attack_or_save",
        "magic_item_type_ru",
        "rarity_ru",
        "attunement_restriction_ru",
        "recharge_ru",
        "text_ru",
        "alignment",
        "size_ru",
        "type_ru",
        "legendary_actions_note_ru",
        "ac_notes",
    }
)

DICE_RE = re.compile(r"(?:\d+)?d\d+", re.I)
LATIN_WORD_RE = re.compile(r"[A-Za-z][A-Za-z']+")


def _walk(obj, path: str = ""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from _walk(value, f"{path}.{key}" if path else key)
    elif isinstance(obj, list):
        for idx, value in enumerate(obj):
            yield from _walk(value, f"{path}[{idx}]")
    elif isinstance(obj, str):
        yield path, obj


def _entries(path: Path):
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        return payload.get("entries") or payload.get("properties") or []
    return []


def _latin_in_display(text: str) -> list[str]:
    stripped = DICE_RE.sub("", text)
    return LATIN_WORD_RE.findall(stripped)


def test_live_wave_display_fields_have_no_latin_prose():
    failures: list[str] = []
    for name in WAVE_FILES:
        path = LIVE / name
        assert path.is_file(), name
        for entry in _entries(path):
            slug = entry.get("slug") or entry.get("id") or "?"
            for field_path, value in _walk(entry):
                leaf = field_path.split(".")[-1].split("[")[0]
                if leaf == "name_en" or field_path.endswith("name_en"):
                    continue
                if leaf not in DISPLAY_LEAVES:
                    continue
                bad = _latin_in_display(value)
                if bad:
                    failures.append(
                        f"{name} {slug} {field_path}: {value!r} latin={bad}"
                    )
    assert not failures, "English left in display fields:\n" + "\n".join(failures[:40])


def test_spell_reaction_conditions_and_materials_are_russian():
    spells = _entries(LIVE / "spells_srd.json")
    assert len(spells) == 339
    ph24 = _entries(LIVE / "spells_ph24.json")
    assert len(ph24) == 69
    counterspell = next(s for s in spells if s["slug"] == "counterspell")
    cond = counterspell["data"]["casting_time"]["condition"]
    assert cond
    assert not _latin_in_display(cond)
    assert "60 фт" in cond

    fireball = next(s for s in spells if s["slug"] == "fireball")
    material = fireball["data"]["components"]["m"]
    assert "гуано" in material or "серы" in material
    assert not _latin_in_display(material)
