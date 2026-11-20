#!/usr/bin/env python3
"""P24-C14: fix C07 creatures_srd.json display (summary agreement + spell_refs).

Does not change stats or other fields. Idempotent.
- summary_ru: «большая аберрация» / «средний гуманоид» (type lowercased)
- spell_refs: keep only when a Spellcasting / Колдовство feature exists;
  drop incidental refs from traits/reactions/etc.
- punctuation: strip spaces before . , : ;
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
PATH = LIVE / "creatures_srd.json"

SIZE_LABEL = {
    "tiny": "крошечный",
    "small": "маленький",
    "medium": "средний",
    "large": "большой",
    "huge": "огромный",
    "gargantuan": "гигантский",
}
SIZE_LABEL_FEM = {
    "tiny": "крошечная",
    "small": "маленькая",
    "medium": "средняя",
    "large": "большая",
    "huge": "огромная",
    "gargantuan": "гигантская",
}
SIZE_LABEL_NEUT = {
    "tiny": "крошечное",
    "small": "маленькое",
    "medium": "среднее",
    "large": "большое",
    "huge": "огромное",
    "gargantuan": "гигантское",
}
TYPE_GENDER = {
    "aberration": "f",
    "beast": "m",
    "celestial": "m",
    "construct": "m",
    "dragon": "m",
    "elemental": "m",
    "fey": "f",
    "fiend": "n",
    "giant": "m",
    "humanoid": "m",
    "monstrosity": "n",
    "ooze": "f",
    "plant": "n",
    "undead": "f",
}

_SPELLCASTING_NAME = ("сотворение заклинаний", "колдовство", "spellcasting")
_BAD_PUNCT = re.compile(r"\s+([.,:;!?])")
_TYPO_MAP = (
    (re.compile(r"\bспабросок\b", re.I), "спасбросок"),
    (re.compile(r"\bспаброска\b", re.I), "спасброска"),
    (re.compile(r"\bспаброске\b", re.I), "спасброске"),
    (re.compile(r"\bспаброском\b", re.I), "спасброском"),
    (re.compile(r"\bспаброски\b", re.I), "спасброски"),
    (re.compile(r"\bспаброску\b", re.I), "спасброску"),
)
_DISPLAY_LEAVES = frozenset(
    {
        "text_ru",
        "summary_ru",
        "name_ru",
        "legendary_actions_note_ru",
        "alignment",
        "size_ru",
        "type_ru",
    }
)


def has_spellcasting(data: dict) -> bool:
    for bucket in ("traits", "actions", "bonus_actions", "reactions"):
        for feat in data.get(bucket) or []:
            name = str(feat.get("name_ru") or "").strip().lower()
            en = str(feat.get("name_en") or "").strip().lower()
            if name.startswith(_SPELLCASTING_NAME) or en.startswith("spellcasting"):
                return True
    return False


def summary_size_type(size: str, type_en: str, type_ru: str) -> str:
    type_word = (type_ru or type_en).strip()
    # «рой (…)» — masculine noun regardless of wrapped creature type.
    if type_word.lower().startswith("рой"):
        gender = "m"
    else:
        gender = TYPE_GENDER.get(type_en, "m")
    if gender == "f":
        size_word = SIZE_LABEL_FEM.get(size, "средняя")
    elif gender == "n":
        size_word = SIZE_LABEL_NEUT.get(size, "среднее")
    else:
        size_word = SIZE_LABEL.get(size, "средний")
    if type_word:
        type_word = type_word[:1].lower() + type_word[1:]
    return f"{size_word} {type_word}"


def fix_summary(data: dict, *, keep_spells: bool) -> str:
    summary = data.get("summary_ru") or ""
    size = data.get("size") or "medium"
    type_en = data.get("type") or "monstrosity"
    type_ru = data.get("type_ru") or type_en
    head = summary_size_type(size, type_en, type_ru)
    # Replace leading «size Type» chunk before first comma.
    rest = summary
    m = re.match(r"^[^,]+,\s*(.*)$", summary)
    if m:
        rest = m.group(1)
    # Ensure «есть заклинания» only when keeping spell_refs.
    rest = re.sub(r";?\s*есть заклинания\.?\s*$", "", rest, flags=re.I).rstrip(" .;")
    if keep_spells:
        if not rest.endswith("."):
            rest = rest + ";"
        else:
            rest = rest.rstrip(".") + ";"
        return f"{head}, {rest} есть заклинания."
    if not rest.endswith("."):
        rest = rest + "."
    return f"{head}, {rest}"


def clean_display_string(text: str) -> str:
    t = text or ""
    t = _BAD_PUNCT.sub(r"\1", t)
    for pat, repl in _TYPO_MAP:
        t = pat.sub(repl, t)
    return t


def walk_fix_punct(obj):
    if isinstance(obj, dict):
        for key, value in list(obj.items()):
            if isinstance(value, str) and key in _DISPLAY_LEAVES:
                obj[key] = clean_display_string(value)
            else:
                walk_fix_punct(value)
    elif isinstance(obj, list):
        for item in obj:
            walk_fix_punct(item)


def main() -> None:
    payload = json.loads(PATH.read_text(encoding="utf-8"))
    entries = payload["entries"]
    changed = 0
    stripped_refs: list[tuple[str, list[str]]] = []
    summary_fixed = 0
    for entry in entries:
        data = entry.get("data") or {}
        before = json.dumps(data, ensure_ascii=False, sort_keys=True)
        refs = list(data.get("spell_refs") or [])
        keep = bool(refs) and has_spellcasting(data)
        if refs and not keep:
            stripped_refs.append((entry["slug"], refs))
            data["spell_refs"] = []
        elif refs and keep:
            data["spell_refs"] = refs  # unchanged
        new_summary = fix_summary(data, keep_spells=keep)
        if new_summary != data.get("summary_ru"):
            summary_fixed += 1
            data["summary_ru"] = new_summary
        walk_fix_punct(data)
        after = json.dumps(data, ensure_ascii=False, sort_keys=True)
        if before != after:
            changed += 1
            entry["data"] = data

    # stamp meta note
    meta = payload.setdefault("meta", {})
    notes = meta.get("notes") or []
    if isinstance(notes, list):
        notes = [n for n in notes if "P24-C14 C07 fix" not in str(n)]
        notes.append(
            "P24-C14 C07 fix: summary size/type agreement; "
            f"spell_refs stripped from {len(stripped_refs)} non-Spellcasting cards."
        )
        meta["notes"] = notes

    PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"changed_cards={changed} summary_fixed={summary_fixed}")
    print(f"stripped_spell_refs={len(stripped_refs)}")
    for slug, refs in stripped_refs:
        print(f"  {slug}: {refs}")
    kept = sum(
        1
        for e in entries
        if (e.get("data") or {}).get("spell_refs")
    )
    print(f"remaining_with_spell_refs={kept}")


if __name__ == "__main__":
    main()
