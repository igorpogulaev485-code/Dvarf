"""B0: map catalog `source` / slug → content_layer (legal shield tagging).

Players never see these labels in the UI. Values:
  srd | community_ref | user_import | homebrew
"""

from __future__ import annotations

from typing import Any, Literal

ContentLayer = Literal["srd", "community_ref", "user_import", "homebrew"]

# SRD 5.1 playable races (base lineages). Subraces / book races → community_ref
# unless their catalog `source` already starts with srd-.
SRD_RACE_SLUGS: frozenset[str] = frozenset(
    {
        "dragonborn",
        "dwarf",
        "elf",
        "gnome",
        "half_elf",
        "half_orc",
        "halfling",
        "human",
        "tiefling",
    }
)


def normalize_source(source: str | None) -> str:
    return (source or "").strip().lower()


def layer_for_source(
    source: str | None,
    *,
    kind: str | None = None,
    slug: str | None = None,
    data: dict[str, Any] | None = None,
) -> ContentLayer:
    """Resolve content_layer. Explicit data.content_layer wins if valid."""
    if isinstance(data, dict):
        raw = data.get("content_layer")
        if raw in ("srd", "community_ref", "user_import", "homebrew"):
            return raw  # type: ignore[return-value]

    src = normalize_source(source)

    if src in {"user", "user_import", "import", "byo"} or src.startswith("user"):
        return "user_import"
    if src in {"homebrew", "hombrew", "custom", "хомбрю"} or "homebrew" in src or "хомбр" in src:
        return "homebrew"
    if src.startswith("srd"):
        return "srd"

    if kind == "race" and slug and slug in SRD_RACE_SLUGS and not src:
        return "srd"
    # Spec files often say source=phb for SRD lineages — still SRD for base nine.
    if kind == "race" and slug and slug in SRD_RACE_SLUGS:
        return "srd"

    return "community_ref"


def stamp_data_layer(
    data: dict[str, Any] | None,
    *,
    source: str | None,
    kind: str | None = None,
    slug: str | None = None,
) -> dict[str, Any]:
    """Return a copy of data with content_layer set."""
    out = dict(data) if isinstance(data, dict) else {}
    out["content_layer"] = layer_for_source(source, kind=kind, slug=slug, data=out)
    return out
