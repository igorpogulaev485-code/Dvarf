#!/usr/bin/env python3
"""Apply Igor names-decisions-17-11 to 2024 live JSON (+ FE mirrors).

Rules (from /cursor/stores/bot/dvarf_prompts/2024/names-decisions-17-11.md):
- every entry with data.name_ru_pending=true:
  - 2014 analogue (by name_en; SRD without eponym ↔ eponymous 2014) → name_ru from 2014
  - SRD EN without wizard eponym but 2014 has one → strip wizard name
  - PH24 with eponym in EN → keep 2014 eponymous name
  - new without analogue → keep agent proposal
  - then clear name_ru_pending
- explicit overrides (Revivify/Raise Dead, new spells, 9 items, War Room, Summon *,
  Chain Lightning in 2024 only — do NOT touch 2014).

Does not modify 2014 data.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.dnd.p24_n01_names import (  # noqa: E402
    find_2014_pair,
    iter_live_entries,
    load_2014_name_index,
    norm_en,
)

LIVE = ROOT / "backend" / "data" / "srd" / "2024" / "live"
FE_MIRROR = ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

# Explicit slug → name_ru (2024 only).
EXPLICIT: dict[str, str] = {
    "revivify": "Возрождение",
    "raise-dead": "Оживление",
    "sorcerous-burst": "Чародейский выброс",
    "starry-wisp": "Звёздный светлячок",
    "summon-dragon": "Призыв духа дракона",
    "apparatus-of-the-crab": "Аппарат Краба",
    "dragon-orb": "Сфера драконьего рода",
    "efficient-quiver": "Эффективный колчан",
    "feather-token": "Жетон с перышком",
    "handy-haversack": "Удобный рюкзак",
    "instant-fortress": "Мгновенная крепость",
    "iron-bands": "Железные ленты",
    "marvelous-pigments": "Чудесные краски",
    "mysterious-deck": "Колода многих вещей",
    "war-room": "Штаб",
    "chain-lightning": "Цепная молния",
    # Summon * (PH24 / SRD)
    "summon-beast": "Призыв духа зверя",
    "summon-fey": "Призыв духа феи",
    "summon-undead": "Призыв духа нежити",
    "summon-aberration": "Призыв духа аберрации",
    "summon-construct": "Призыв духа конструкта",
    "summon-elemental": "Призыв духа стихии",
    "summon-celestial": "Призыв духа небожителя",
    "summon-fiend": "Призыв духа исчадия",
}

# English eponym possessive prefixes that mark a wizard-named spell/item.
_EPONYM_EN = re.compile(
    r"^(?:"
    r"tasha|melf|nystul|leomund|evard|mordenkainen|otiluke|otto|rary|"
    r"drawmij|bigby|tensers?|arthur|yolande"
    r")(?:['’]s)?\s+",
    re.I,
)

# Russian eponym fragments to strip from 2014 names for SRD cards without EN eponym.
_EPONYM_RU_PATTERNS = [
    re.compile(r"^Мельфова\s+", re.I),
    re.compile(r"^Тензеров[аы]?\s+", re.I),
    re.compile(r"^Леомундов[аы]?\s+", re.I),
    re.compile(r"^Эвардовы\s+", re.I),
    re.compile(r"^Отилюков[аы]?\s+", re.I),
    re.compile(r"^Дромиджево\s+", re.I),
    re.compile(r"^Нистулова\s+", re.I),
    re.compile(r"^Морденкайнена\s+", re.I),
    re.compile(r"\s+Морденкайнена$", re.I),
    re.compile(r"^Длань\s+Бигби$", re.I),  # special: whole rewrite below
    re.compile(r"\s+Таши$", re.I),
    re.compile(r"\s+Отто$", re.I),
    re.compile(r"\s+Рэри$", re.I),
    re.compile(r"\s+Бигби$", re.I),
]

# Known full-name strip maps when regex is awkward.
# When strip would leave a too-generic noun, return None → keep agent proposal.
_STRIP_RU_MAP: dict[str, str | None] = {
    "Мельфова кислотная стрела": "Кислотная стрела",
    "Тензеров парящий диск": "Парящий диск",
    "Жуткий смех Таши": "Жуткий смех",
    "Нистулова ложная аура": "Ложная аура",
    "Леомундова хижина": None,  # keep agent «Крошечная хижина»
    "Эвардовы чёрные щупальца": "Чёрные щупальца",
    "Верный пёс Морденкайнена": "Верный пёс",
    "Кабинет Морденкайнена": None,  # keep agent «Личный кабинет»
    "Отилюков упругий шар": "Упругий шар",
    "Леомундов потайной сундук": "Потайной сундук",
    "Длань Бигби": None,  # keep agent «Чародейская длань»
    "Ментальная связь Рэри": "Ментальная связь",
    "Дромиджево появление": None,  # keep agent «Мгновенный вызов»
    "Отилюков ледяной шар": "Ледяной шар",
    "Неудержимая пляска Отто": "Неудержимая пляска",
    "Великолепный особняк Морденкайнена": "Великолепный особняк",
    "Меч Морденкайнена": None,  # keep agent «Чародейский меч»
}


def _en_has_eponym(name_en: str) -> bool:
    return bool(_EPONYM_EN.match(name_en or ""))


def _strip_eponym_ru(name_ru: str) -> str | None:
    """Return stripped RU, or None if strip is too aggressive (keep agent proposal)."""
    if name_ru in _STRIP_RU_MAP:
        return _STRIP_RU_MAP[name_ru]
    out = name_ru
    for pat in _EPONYM_RU_PATTERNS:
        out2 = pat.sub("", out).strip()
        if out2 and out2 != out:
            out = out2
    if out and out[0].islower():
        out = out[0].upper() + out[1:]
    if not out or out == name_ru:
        return name_ru
    # Single short generic noun after strip → prefer agent proposal.
    if " " not in out and len(out) <= 8:
        return None
    return out


def _pair_via_stripped_en(
    *,
    kind: str | None,
    name_en: str,
    by_slug,
    by_en_kind,
):
    """Match SRD EN without eponym to eponymous 2014 by stripped core, or PH24 with eponym to core."""
    en = name_en or ""
    stripped = _EPONYM_EN.sub("", en).strip()
    if not stripped or norm_en(stripped) == norm_en(en):
        # also try looking up core EN as-is against 2014 (already done by find_2014_pair)
        return None, None
    return find_2014_pair(
        kind=kind,
        slug=None,
        name_en=stripped,
        by_slug=by_slug,
        by_en_kind=by_en_kind,
    )


def decide_pending(
    entry: dict,
    *,
    by_slug,
    by_en_kind,
) -> tuple[str, str]:
    """Return (new_ru, basis)."""
    slug = str(entry.get("slug") or "")
    kind = str(entry.get("kind") or "")
    name_en = str(entry.get("name_en") or "")
    old_ru = str(entry.get("name_ru") or "")

    if slug in EXPLICIT:
        return EXPLICIT[slug], "explicit"

    pair, how = find_2014_pair(
        kind=kind,
        slug=slug,
        name_en=name_en,
        by_slug=by_slug,
        by_en_kind=by_en_kind,
    )
    eponym_pair, eponym_how = (None, None)
    if pair is None or _en_has_eponym(name_en):
        eponym_pair, eponym_how = _pair_via_stripped_en(
            kind=kind, name_en=name_en, by_slug=by_slug, by_en_kind=by_en_kind
        )

    # PH24 (or any) with eponym in English → keep agent proposal that already
    # carries the eponym (Igor example: «Хижина Леомунда»), not archaic 2014
    # possessive word order («Леомундова хижина»).
    if _en_has_eponym(name_en):
        return old_ru, "keep-proposed-ph-eponym"

    # Direct 2014 pair
    if pair is not None:
        ru = pair.name_ru
        # SRD without EN eponym: strip wizard name from 2014 if present
        if not _en_has_eponym(name_en):
            stripped = _strip_eponym_ru(ru)
            if stripped is None:
                return old_ru, "keep-proposed-strip"
            if stripped != ru:
                return stripped, "2014-strip-srd"
        return ru, "2014"

    # Matched only via stripped EN (SRD core → eponymous 2014)
    if eponym_pair is not None:
        ru = eponym_pair.name_ru
        if not _en_has_eponym(name_en):
            stripped = _strip_eponym_ru(ru)
            if stripped is None:
                return old_ru, "keep-proposed-strip"
            return stripped, "2014-strip-srd"
        return ru, "2014-eponym-ph"

    # New / keep agent proposal
    return old_ru, "keep-proposed"


def _dump(path: Path, payload: dict) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _clear_pending(entry: dict) -> None:
    data = entry.get("data")
    if isinstance(data, dict) and "name_ru_pending" in data:
        data["name_ru_pending"] = False
    if "name_ru_pending" in entry:
        entry["name_ru_pending"] = False


def apply_live() -> list[dict]:
    by_slug, by_en = load_2014_name_index()
    changes: list[dict] = []
    # Group payloads by path so we rewrite each file once.
    by_path: dict[Path, dict] = {}
    for path, payload, entry in iter_live_entries(LIVE):
        by_path[path] = payload
        data = entry.get("data") if isinstance(entry.get("data"), dict) else {}
        pending = bool(data.get("name_ru_pending")) or bool(entry.get("name_ru_pending"))
        slug = str(entry.get("slug") or "")
        # Always apply chain-lightning + other EXPLICIT even if not pending.
        if not pending and slug not in EXPLICIT:
            continue
        old_ru = str(entry.get("name_ru") or "")
        new_ru, basis = decide_pending(entry, by_slug=by_slug, by_en_kind=by_en)
        if slug in EXPLICIT:
            new_ru, basis = EXPLICIT[slug], "explicit"
        changed = new_ru != old_ru
        if changed:
            entry["name_ru"] = new_ru
        if pending:
            _clear_pending(entry)
        changes.append(
            {
                "file": path.name,
                "slug": slug,
                "kind": entry.get("kind"),
                "en": entry.get("name_en"),
                "old_ru": old_ru,
                "new_ru": new_ru,
                "basis": basis,
                "changed": changed,
                "cleared_pending": pending,
            }
        )
    for path, payload in by_path.items():
        # Only rewrite files we touched (any pending or explicit in this file).
        touched = [c for c in changes if c["file"] == path.name]
        if touched:
            _dump(path, payload)
    return changes


def sync_frontend_mirrors(changes: list[dict]) -> list[str]:
    """Copy name_ru (+ cleared pending) for mirrored FE JSON files."""
    synced: list[str] = []
    by_file_slug: dict[tuple[str, str], str] = {
        (c["file"], c["slug"]): c["new_ru"] for c in changes
    }
    pending_cleared = {(c["file"], c["slug"]) for c in changes if c["cleared_pending"]}
    for be_name in sorted({c["file"] for c in changes}):
        fe_path = FE_MIRROR / be_name
        if not fe_path.exists():
            continue
        payload = json.loads(fe_path.read_text(encoding="utf-8"))
        entries = payload.get("entries")
        if not isinstance(entries, list):
            continue
        dirty = False
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            slug = str(entry.get("slug") or "")
            key = (be_name, slug)
            if key in by_file_slug:
                if entry.get("name_ru") != by_file_slug[key]:
                    entry["name_ru"] = by_file_slug[key]
                    dirty = True
            if key in pending_cleared:
                data = entry.get("data")
                if isinstance(data, dict) and data.get("name_ru_pending"):
                    data["name_ru_pending"] = False
                    dirty = True
                if entry.get("name_ru_pending"):
                    entry["name_ru_pending"] = False
                    dirty = True
        if dirty:
            _dump(fe_path, payload)
            synced.append(be_name)
    return synced


def remaining_pending() -> int:
    n = 0
    for _path, _payload, entry in iter_live_entries(LIVE):
        data = entry.get("data") if isinstance(entry.get("data"), dict) else {}
        if data.get("name_ru_pending") or entry.get("name_ru_pending"):
            n += 1
    return n


def main() -> int:
    changes = apply_live()
    synced = sync_frontend_mirrors(changes)
    left = remaining_pending()
    changed = [c for c in changes if c["changed"]]
    print(f"Reviewed (pending+explicit): {len(changes)}")
    print(f"name_ru changed: {len(changed)}")
    print(f"Pending remaining: {left}")
    print(f"FE mirrors synced: {', '.join(synced) or '(none)'}")
    print("\nBasis counts:")
    from collections import Counter

    print(Counter(c["basis"] for c in changes))
    print("\nChanged samples:")
    for c in changed[:40]:
        print(f"  {c['file']} {c['slug']}: «{c['old_ru']}» → «{c['new_ru']}» [{c['basis']}]")
    if len(changed) > 40:
        print(f"  … +{len(changed) - 40} more")
    if left:
        print("ERROR: pending flags remain", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
