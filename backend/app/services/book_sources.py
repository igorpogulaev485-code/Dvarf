"""L-16: canonical book ids ↔ aliases from real catalog `source` strings."""

from __future__ import annotations

from typing import Iterable

# Канон для UI «разрешённые книги» (2014). Алиасы собраны из backend/data и сидов.
BOOK_SOURCE_CATALOG: list[dict[str, object]] = [
    {
        "id": "phb",
        "label": "Player's Handbook",
        "aliases": [
            "phb",
            "PHB",
            "PHB 2014",
            "phb-2014",
            "srd-5.1",
            "srd",
            "SRD 5.1 (sample)",
        ],
    },
    {
        "id": "tce",
        "label": "Tasha's Cauldron of Everything",
        "aliases": ["tce", "TCE", "TCE 2014", "tce-2014", "tasha", "tcoe", "TCoE"],
    },
    {
        "id": "xge",
        "label": "Xanathar's Guide to Everything",
        "aliases": ["xge", "XGE", "XGE 2014", "xge-2014", "xgte", "XGtE"],
    },
    {
        "id": "mpmm",
        "label": "Mordenkainen Presents: Monsters of the Multiverse",
        "aliases": ["mpmm", "MPMM", "ttg:MPMM"],
    },
    {
        "id": "scag",
        "label": "Sword Coast Adventurer's Guide",
        "aliases": ["scag", "SCAG", "SCAG 2014"],
    },
    {
        "id": "egw",
        "label": "Explorer's Guide to Wildemount",
        "aliases": ["egw", "EGW", "EGW 2014", "egw-2014", "egtw", "EGtW"],
    },
    {
        "id": "mot",
        "label": "Mythic Odysseys of Theros",
        "aliases": ["mot", "MOT", "MOT 2014"],
    },
    {
        "id": "vgm",
        "label": "Volo's Guide to Monsters",
        "aliases": ["vgm", "VGM", "vgtm", "ttg:VGM"],
    },
    {
        "id": "mtf",
        "label": "Mordenkainen's Tome of Foes",
        "aliases": ["mtf", "MTF", "ttg:MTF"],
    },
    {
        "id": "erlw",
        "label": "Eberron: Rising from the Last War",
        "aliases": ["erlw", "ERLW", "RLW 2014", "ttg:ERLW", "erftlw"],
    },
    {
        "id": "ggr",
        "label": "Guildmasters' Guide to Ravnica",
        "aliases": ["ggr", "GGR", "GGR 2014", "ttg:GGR", "ggtr", "ggtr-2014"],
    },
    {
        "id": "ftd",
        "label": "Fizban's Treasury of Dragons",
        "aliases": ["ftd", "FTD", "FTD 2014", "ftd-2014", "ttg:FTD"],
    },
    {
        "id": "ai",
        "label": "Acquisitions Incorporated",
        "aliases": ["ai", "AI", "AI 2014", "ai-2014"],
    },
    {
        "id": "dmg",
        "label": "Dungeon Master's Guide",
        "aliases": ["dmg", "DMG", "DMG 2014"],
    },
    {
        "id": "eepc",
        "label": "Elemental Evil Player's Companion",
        "aliases": ["eepc", "EEPC"],
    },
]

# kinds that must pass allowed_sources filter (skills/conditions/inventory — нет)
FILTERED_CATALOG_KINDS: frozenset[str] = frozenset(
    {"race", "class", "subclass", "feat", "spell", "background"}
)

_ALIAS_TO_CANON: dict[str, str] = {}
for _entry in BOOK_SOURCE_CATALOG:
    canon = str(_entry["id"])
    _ALIAS_TO_CANON[canon.lower()] = canon
    for alias in _entry["aliases"]:  # type: ignore[union-attr]
        _ALIAS_TO_CANON[str(alias).strip().lower()] = canon


def canonicalize_source(raw: object | None) -> str | None:
    """Map a catalog source string to a canonical book id, or None if unknown."""
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    # Composite sources like "phb+xgte+tcoe" — all parts must map; return first
    # for display, but membership checks use source_matches_allowed.
    direct = _ALIAS_TO_CANON.get(text.lower())
    if direct:
        return direct
    if "+" in text or "|" in text:
        parts = [p.strip() for p in text.replace("|", "+").split("+") if p.strip()]
        mapped = [_ALIAS_TO_CANON.get(p.lower()) for p in parts]
        known = [m for m in mapped if m]
        return known[0] if known else None
    return None


def expand_allowed_sources(allowed: Iterable[str]) -> set[str]:
    """Canonical ids + all aliases for membership tests against raw catalog.source."""
    out: set[str] = set()
    for item in allowed:
        canon = canonicalize_source(item) or str(item).strip().lower()
        out.add(canon)
        for entry in BOOK_SOURCE_CATALOG:
            if str(entry["id"]) == canon:
                for alias in entry["aliases"]:  # type: ignore[union-attr]
                    out.add(str(alias).strip().lower())
                out.add(canon.lower())
                break
        else:
            out.add(str(item).strip().lower())
    return out


def source_matches_allowed(raw_source: object | None, allowed_canon: Iterable[str]) -> bool:
    """True if raw source is covered by allowed canonical books (incl. composites)."""
    if raw_source is None:
        return True  # нет source — не режем
    text = str(raw_source).strip()
    if not text:
        return True
    allowed = expand_allowed_sources(allowed_canon)
    parts = [p.strip() for p in text.replace("|", "+").split("+") if p.strip()]
    if len(parts) > 1:
        # Композит: достаточно, чтобы каждая известная часть была разрешена.
        known_ok = False
        for part in parts:
            canon = canonicalize_source(part)
            key = (canon or part).lower()
            if key in allowed or part.lower() in allowed:
                known_ok = True
                continue
            if canon is None and part.lower() not in _ALIAS_TO_CANON:
                # неизвестный кусок — не валим весь композит
                continue
            return False
        return known_ok
    canon = canonicalize_source(text)
    if canon and canon.lower() in allowed:
        return True
    return text.lower() in allowed


def book_catalog_public() -> list[dict[str, object]]:
    return [
        {
            "id": e["id"],
            "label": e["label"],
            "aliases": list(e["aliases"]),  # type: ignore[arg-type]
        }
        for e in BOOK_SOURCE_CATALOG
    ]
