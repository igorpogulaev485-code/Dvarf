"""Ability score ceilings (PHB 2014): base 20, raised by class/features/items."""

from __future__ import annotations

from typing import Any

ABILITY_KEYS = ("str", "dex", "con", "int", "wis", "cha")

# PHB default — permanent scores normally cannot exceed this.
DEFAULT_ABILITY_SCORE_MAX = 20
# Absolute system hard cap (Ioun/tome/epic homebrew).
HARD_ABILITY_SCORE_CEILING = 30


def clamp_ceiling(value: object, default: int = DEFAULT_ABILITY_SCORE_MAX) -> int:
    try:
        n = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        n = default
    return max(1, min(HARD_ABILITY_SCORE_CEILING, n))


def _looks_like(name: str, catalog_id: str | None, *needles: str) -> bool:
    hay = f"{name} {catalog_id or ''}".lower()
    return any(n.lower() in hay for n in needles)


def ability_max_from_classes(classes: list[dict[str, Any]] | None) -> dict[str, int]:
    """Structured class/archetype raises keyed by ability."""
    out: dict[str, int] = {}
    if not isinstance(classes, list):
        return out
    for cls in classes:
        if not isinstance(cls, dict):
            continue
        name = str(cls.get("name") or "")
        catalog_id = str(cls.get("catalog_id") or "") or None
        try:
            level = int(cls.get("level") or 0)
        except (TypeError, ValueError):
            level = 0
        # Barbarian 20 — Primal Champion: STR & CON max 24
        if level >= 20 and _looks_like(name, catalog_id, "варвар", "barbarian"):
            for key, ceiling in (("str", 24), ("con", 24)):
                out[key] = max(out.get(key, 0), ceiling)
    return out


def ability_max_from_inventory(
    inventory: dict[str, Any] | None,
    *,
    attuned_item_ids: set[str] | None = None,
) -> dict[str, int]:
    """max_score from active setting-artifact snapshots / magic_mods.ability_max."""
    out: dict[str, int] = {}
    attuned = attuned_item_ids or set()
    if not isinstance(inventory, dict):
        return out
    items = inventory.get("items") or []
    if not isinstance(items, list):
        return out
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            qty = int(item.get("qty") or 0)
        except (TypeError, ValueError):
            qty = 0
        if qty <= 0:
            continue
        requires = bool(item.get("requires_attunement"))
        item_id = str(item.get("id") or "")
        equipped = item.get("equipped")
        if requires:
            if item_id not in attuned:
                continue
        elif item.get("item_kind") == "magic" and equipped is False:
            continue
        elif equipped is False and item.get("item_kind") != "magic":
            continue

        snap = item.get("artifact_snapshot") or {}
        if isinstance(snap, dict):
            for ab in snap.get("abilities") or []:
                if not isinstance(ab, dict):
                    continue
                if ab.get("kind") != "passive" or ab.get("bonus_target") != "ability":
                    continue
                if ab.get("max_score") is None:
                    continue
                key = str(ab.get("ability_key") or "str").lower()
                if key not in ABILITY_KEYS:
                    continue
                ceiling = clamp_ceiling(ab.get("max_score"))
                out[key] = max(out.get(key, 0), ceiling)

        mods = item.get("magic_mods") or {}
        if isinstance(mods, dict):
            ability_max = mods.get("ability_max") or mods.get("abilityMax") or {}
            if isinstance(ability_max, dict):
                for key, raw in ability_max.items():
                    k = str(key).lower()
                    if k not in ABILITY_KEYS:
                        continue
                    ceiling = clamp_ceiling(raw)
                    out[k] = max(out.get(k, 0), ceiling)
    return out


def ability_max_from_sheet_stored(abilities: dict[str, Any] | None) -> dict[str, int]:
    out: dict[str, int] = {}
    if not isinstance(abilities, dict):
        return out
    for key in ABILITY_KEYS:
        row = abilities.get(key)
        if not isinstance(row, dict):
            continue
        if row.get("max_score") is None:
            continue
        out[key] = max(out.get(key, 0), clamp_ceiling(row.get("max_score")))
    return out


def resolve_ability_maxes(sheet: dict[str, Any] | None) -> dict[str, int]:
    """
    Effective permanent score ceiling per ability.
    Temporary combat.effects do NOT raise this.
    """
    sheet = sheet if isinstance(sheet, dict) else {}
    attuned: set[str] = set()
    for slot in sheet.get("attunements") or []:
        if isinstance(slot, dict) and slot.get("item_id"):
            attuned.add(str(slot["item_id"]))

    merged: dict[str, int] = {k: DEFAULT_ABILITY_SCORE_MAX for k in ABILITY_KEYS}
    for source in (
        ability_max_from_classes(sheet.get("classes") if isinstance(sheet.get("classes"), list) else None),
        ability_max_from_inventory(
            sheet.get("inventory") if isinstance(sheet.get("inventory"), dict) else None,
            attuned_item_ids=attuned,
        ),
        ability_max_from_sheet_stored(
            sheet.get("abilities") if isinstance(sheet.get("abilities"), dict) else None
        ),
    ):
        for key, ceiling in source.items():
            merged[key] = max(merged.get(key, DEFAULT_ABILITY_SCORE_MAX), ceiling)
    return merged


def clamp_ability_score(score: object, max_score: int = DEFAULT_ABILITY_SCORE_MAX) -> int:
    try:
        n = int(score)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        n = 10
    ceiling = clamp_ceiling(max_score)
    return max(1, min(ceiling, n))
