"""P24-M02b: subclass feature/resource/always-prepared automation for rules_edition=2024.

Loads all accepted subclass packs (SRD, PH24, EFA, FRHoF, RTW, AU).
Spendable pools get sheet buttons; everything else stays as feature text.
Never mutates 2014 tables.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping, Sequence

SUBCLASS_CATALOG_FILES: tuple[str, ...] = (
    "subclasses_srd.json",
    "subclasses_efa.json",
    "subclasses_ph24.json",
    "subclasses_frhof.json",
    "subclasses_rtw.json",
    "subclasses_au.json",
)

# Subclasses that grant ⅓ wizard-style spellcasting (slots via third caster table).
THIRD_CASTER_SUBCLASSES: dict[str, dict[str, Any]] = {
    "fighter__eldritch-knight": {
        "ability": "int",
        "name_ru": "Заклинания мистического рыцаря",
    },
    "rogue__arcane-trickster": {
        "ability": "int",
        "name_ru": "Заклинания мистического ловкача",
    },
    "monk__warrior-of-the-mystic-arts": {
        "ability": "wis",
        "name_ru": "Заклинания мистического воина",
    },
}

# PHB / EFA 2024 third-caster slot row (index 0 = level 1). Same as casterProgression.ts.
THIRD_CASTER_SLOTS: list[list[int]] = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 0, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 1, 0, 0, 0, 0, 0],
    [4, 3, 3, 1, 0, 0, 0, 0, 0],
]

THIRD_CASTER_CANTRIPS: list[int] = [
    0,
    0,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
]

THIRD_CASTER_SPELLS_KNOWN: list[int] = [
    0,
    0,
    3,
    4,
    4,
    4,
    5,
    6,
    6,
    7,
    8,
    8,
    9,
    10,
    10,
    11,
    11,
    11,
    12,
    13,
]

# Feature ids that are covered by always-prepared spell lists (not a spend button).
ALWAYS_PREPARED_FEATURE_IDS: frozenset[str] = frozenset(
    {
        "life-domain-spells",
        "light-domain-spells",
        "trickery-domain-spells",
        "war-domain-spells",
        "arcana-domain-spells",
        "knowledge-domain-spells",
        "grave-domain-spells",
        "alchemist-spells",
        "armorer-spells",
        "artillerist-spells",
        "battle-smith-spells",
        "cartographer-spells",
        "reanimator-spells",
        "genie-spells",
        "winter-walker-spells",
        "spellfire-spells",
        "hollow-warden-spells",
        "shadow-spells",
        "undead-patron-spells",
        "draconic-spells",
        "psionic-spells",
        "clockwork-spells",
        "aberrant-spells",
        "oath-spells",
        "devotion-spells",
        "circle-spells",
        "land-spells",
        "moon-spells",
        "sea-spells",
        "fey-wanderer-spells",
        "gloom-stalker-spells",
        "archfey-spells",
        "celestial-spells",
        "fiend-spells",
        "great-old-one-spells",
        "vestige-spells",
    }
)


def _live_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "srd" / "2024" / "live"


def ability_mod(score: int) -> int:
    return (max(1, int(score)) - 10) // 2


def proficiency_bonus_for_level(total_level: int) -> int:
    lv = max(1, min(20, int(total_level or 1)))
    return ((lv - 1) // 4) + 2


@lru_cache(maxsize=1)
def load_subclass_catalog() -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for filename in SUBCLASS_CATALOG_FILES:
        path = _live_dir() / filename
        if not path.is_file():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        source = str((payload.get("meta") or {}).get("source") or filename)
        for entry in payload.get("entries") or []:
            slug = str(entry.get("slug") or "").strip()
            if not slug:
                continue
            out[slug] = {
                "slug": slug,
                "name_ru": entry.get("name_ru") or slug,
                "name_en": entry.get("name_en") or slug,
                "source": entry.get("source") or source,
                "data": entry.get("data") or {},
            }
    return out


def list_all_subclass_slugs() -> list[str]:
    return sorted(load_subclass_catalog())


def subclass_parent(slug: str) -> str | None:
    row = load_subclass_catalog().get(slug)
    if not row:
        return None
    parent = str((row["data"] or {}).get("parent_class") or "").strip()
    return parent or None


@dataclass(frozen=True)
class SubclassResourcePool:
    id: str
    pool_id: str
    class_slug: str
    subclass_slug: str
    name_ru: str
    max: int
    reset: str
    track: str = "spend"
    on_hot: bool = True
    short_rest_regain: int | None = None
    meta: dict[str, Any] = field(default_factory=dict)


def _pool_id(class_slug: str, pool_key: str, entry_id: str) -> str:
    return f"feat:{class_slug}:{pool_key}:{entry_id}"


def _scale_uses(level: int, table: Mapping[int, int]) -> int:
    best = 0
    for lv, val in sorted(table.items()):
        if level >= lv:
            best = val
    return best


def _psi_energy_table(level: int) -> tuple[int, str]:
    """Psi Warrior / Soulknife 2024 energy dice: (count, die)."""
    rows = (
        (3, 4, "d6"),
        (5, 6, "d8"),
        (9, 8, "d8"),
        (11, 8, "d10"),
        (13, 10, "d10"),
        (17, 12, "d12"),
    )
    count, die = 0, "d6"
    for lv, c, d in rows:
        if level >= lv:
            count, die = c, d
    return count, die


def _superiority_die(level: int) -> str:
    if level >= 18:
        return "d12"
    if level >= 10:
        return "d10"
    return "d8"


def build_subclass_resources(
    subclass_slug: str,
    class_level: int,
    *,
    total_level: int,
    abilities: Mapping[str, int],
) -> list[SubclassResourcePool]:
    """Spendable subclass pools unlocked at class_level."""
    if class_level < 3:
        return []
    sub = load_subclass_catalog().get(subclass_slug)
    if not sub:
        return []
    parent = subclass_parent(subclass_slug) or "class"
    pb = proficiency_bonus_for_level(total_level)
    int_mod = ability_mod(int(abilities.get("int") or 10))
    out: list[SubclassResourcePool] = []

    def add(
        pool_key: str,
        *,
        name_ru: str,
        max_uses: int,
        reset: str,
        feature_id: str,
        short_rest_regain: int | None = None,
        on_hot: bool = True,
        extra_meta: dict[str, Any] | None = None,
    ) -> None:
        if max_uses <= 0:
            return
        meta = {"feature_id": feature_id, "subclass_slug": subclass_slug}
        if extra_meta:
            meta.update(extra_meta)
        out.append(
            SubclassResourcePool(
                id=_pool_id(parent, pool_key, feature_id.replace("-", "_")),
                pool_id=pool_key,
                class_slug=parent,
                subclass_slug=subclass_slug,
                name_ru=name_ru,
                max=max_uses,
                reset=reset,
                short_rest_regain=short_rest_regain,
                on_hot=on_hot,
                meta=meta,
            )
        )

    if subclass_slug == "fighter__battlemaster":
        add(
            "superiority_dice",
            name_ru="Кости превосходства",
            max_uses=_scale_uses(class_level, {3: 4, 7: 5, 15: 6}),
            reset="short",
            feature_id="combat-superiority",
            extra_meta={"die": _superiority_die(class_level)},
        )
    elif subclass_slug in {"fighter__psi-warrior", "rogue__soulknife"}:
        count, die = _psi_energy_table(class_level)
        add(
            "psionic_energy_dice",
            name_ru="Кости пси-энергии",
            max_uses=count,
            reset="long",
            short_rest_regain=1,
            feature_id="psionic-power",
            extra_meta={"die": die},
        )
        if subclass_slug == "rogue__soulknife" and class_level >= 13:
            add(
                "psychic_veil",
                name_ru="Психическая завеса",
                max_uses=1,
                reset="long",
                feature_id="psychic-veil",
            )
    elif subclass_slug == "fighter__arcane-archer":
        add(
            "arcane_shot",
            name_ru="Чародейный выстрел",
            max_uses=max(1, int_mod),
            reset="long",
            feature_id="arcane-shot",
        )
    elif subclass_slug == "artificer__alchemist":
        add(
            "experimental_elixir",
            name_ru="Экспериментальный эликсир",
            max_uses=_scale_uses(class_level, {3: 2, 5: 3, 9: 4, 15: 5}),
            reset="long",
            feature_id="experimental-elixir",
        )
        if class_level >= 9:
            add(
                "restorative_reagents",
                name_ru="Малое восстановление (реагенты)",
                max_uses=max(1, int_mod),
                reset="long",
                feature_id="restorative-reagents",
            )
    elif subclass_slug == "sorcerer__wild-magic-sorcery" and class_level >= 18:
        add(
            "tamed_wild_surge",
            name_ru="Укрощённый всплеск",
            max_uses=1,
            reset="long",
            feature_id="tamed-wild-magic-surge",
            on_hot=False,
        )

    # Generic: feature id hints that often mean a 1/long button when summary says so.
    # Kept narrow — prefer explicit tables above.
    _ = pb  # reserved for future PB-scaled specialty pools
    return out


def always_prepared_for_subclass(
    subclass_slug: str | None,
    class_level: int,
    *,
    land_choice: str | None = None,
) -> list[str]:
    """Always-prepared spell slugs from subclass spell_list.

    Circle of the Land rows carry a ``land`` key — only the chosen land is used.
    Without a land pick, land-tagged rows are skipped (shown as text until chosen).
    """
    if not subclass_slug:
        return []
    sub = load_subclass_catalog().get(subclass_slug)
    if not sub:
        return []
    out: list[str] = []
    for block in sub["data"].get("spell_list") or []:
        blv = int(block.get("level") or 0)
        if blv > class_level:
            continue
        land = block.get("land")
        if land:
            if not land_choice or str(land).lower() != str(land_choice).lower():
                continue
        for spell in block.get("spells") or []:
            s = str(spell).strip()
            if s and s not in out:
                out.append(s)
    return out


def third_caster_block(
    subclass_slug: str,
    class_level: int,
) -> dict[str, Any] | None:
    meta = THIRD_CASTER_SUBCLASSES.get(subclass_slug)
    if not meta or class_level < 3:
        return None
    lv = max(1, min(20, class_level))
    row = THIRD_CASTER_SLOTS[lv - 1]
    slots = {str(i + 1): int(row[i]) for i in range(9)}
    return {
        "class_slug": subclass_parent(subclass_slug) or "class",
        "subclass_slug": subclass_slug,
        "progression": "third",
        "ability": meta["ability"],
        "name_ru": meta["name_ru"],
        "cantrips": THIRD_CASTER_CANTRIPS[lv - 1],
        "prepared_spells": 0,
        "spells_known": THIRD_CASTER_SPELLS_KNOWN[lv - 1],
        "slots": slots,
        "pact_slots": None,
        "always_prepared": [],
    }


def feature_automation_mode(
    *,
    feature_id: str,
    subclass_slug: str | None,
    has_resource: bool,
) -> str:
    """resource | always_prepared | third_caster | text"""
    fid = feature_id.replace("_", "-")
    if has_resource:
        return "resource"
    if fid in ALWAYS_PREPARED_FEATURE_IDS or fid.endswith("-spells") or fid.endswith("-domain-spells"):
        return "always_prepared"
    if subclass_slug in THIRD_CASTER_SUBCLASSES and fid in {
        "spellcasting",
        "spellcasting-ek",
        "spellcasting_ek",
    }:
        return "third_caster"
    return "text"


def classify_subclass(
    subclass_slug: str,
    *,
    level: int = 11,
    land_choice: str | None = None,
) -> dict[str, Any]:
    """Report helper: what is automated vs text for one subclass."""
    sub = load_subclass_catalog().get(subclass_slug)
    if not sub:
        return {"slug": subclass_slug, "error": "missing"}
    if subclass_slug == "druid__land" and not land_choice:
        land_choice = "arid"
    resources = build_subclass_resources(
        subclass_slug,
        level,
        total_level=level,
        abilities={"str": 16, "dex": 14, "con": 14, "int": 14, "wis": 12, "cha": 14},
    )
    always = always_prepared_for_subclass(
        subclass_slug,
        level,
        land_choice=land_choice,
    )
    third = third_caster_block(subclass_slug, level)
    resource_fids = {
        str(r.meta.get("feature_id") or "").replace("_", "-") for r in resources
    }
    features_auto: list[str] = []
    features_text: list[str] = []
    for block in sub["data"].get("features") or []:
        blv = int(block.get("level") or 0)
        if blv > level:
            continue
        for feat in block.get("features") or []:
            fid = str(feat.get("id") or "")
            mode = feature_automation_mode(
                feature_id=fid,
                subclass_slug=subclass_slug,
                has_resource=fid.replace("_", "-") in resource_fids,
            )
            name = str(feat.get("name_ru") or fid)
            if mode == "text":
                features_text.append(f"L{blv} {name}")
            else:
                features_auto.append(f"L{blv} {name} [{mode}]")
    return {
        "slug": subclass_slug,
        "name_ru": sub.get("name_ru"),
        "parent": subclass_parent(subclass_slug),
        "source": sub.get("source"),
        "resources": [r.pool_id for r in resources],
        "always_prepared_count": len(always),
        "third_caster": bool(third),
        "automated": features_auto,
        "text": features_text,
        "mode": (
            "resource"
            if resources
            else "always_prepared"
            if always or third
            else "mixed"
            if features_auto
            else "text"
        ),
    }


def automation_report(level: int = 11) -> list[dict[str, Any]]:
    return [classify_subclass(slug, level=level) for slug in list_all_subclass_slugs()]


def subclass_resource_pools_to_sheet(
    resources: Sequence[SubclassResourcePool],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for pool in resources:
        rows.append(
            {
                "id": pool.id,
                "pool_id": pool.pool_id,
                "class_slug": pool.class_slug,
                "subclass_slug": pool.subclass_slug,
                "name": pool.name_ru,
                "max": pool.max,
                "used": 0,
                "reset": pool.reset,
                "track": pool.track,
                "onHot": pool.on_hot,
                "short_rest_regain": pool.short_rest_regain,
                "meta": pool.meta,
            }
        )
    return rows
