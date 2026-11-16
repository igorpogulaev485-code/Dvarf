"""P24-M02a: class tables, resources, spell prep, multiclass for rules_edition=2024.

Catalog groundwork: classes_srd.json / classes_efa.json / subclasses_srd.json (C04/C15).
Runtime engine — parallel to 2014 feature packs; never mutates 2014 tables.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from app.dnd import edition_2024_subclasses as e24sub

CLASS_SLUG_ALIASES: dict[str, str] = {
    "варвар": "barbarian",
    "бард": "bard",
    "жрец": "cleric",
    "друид": "druid",
    "боец": "fighter",
    "воин": "fighter",
    "монах": "monk",
    "паладин": "paladin",
    "следопыт": "ranger",
    "плут": "rogue",
    "разбойник": "rogue",
    "чародей": "sorcerer",
    "колдун": "warlock",
    "варлок": "warlock",
    "волшебник": "wizard",
    "маг": "wizard",
    "изобретатель": "artificer",
    "артефактор": "artificer",
    "артифицер": "artificer",
}

# Primary ability → multiclass prerequisite (SRD 5.2.1: all primaries ≥ 13).
# Fighter primary is Str OR Dex (any); others are all-of.
MULTICLASS_MODE: dict[str, str] = {
    "fighter": "any",
    "barbarian": "all",
    "bard": "all",
    "cleric": "all",
    "druid": "all",
    "monk": "all",
    "paladin": "all",
    "ranger": "all",
    "rogue": "all",
    "sorcerer": "all",
    "warlock": "all",
    "wizard": "all",
    "artificer": "all",
}

# Multiclass proficiency grants (SRD 5.2.1 class «As a Multiclass Character»).
MULTICLASS_PROFICIENCIES: dict[str, dict[str, Any]] = {
    "barbarian": {
        "armor": ["shields"],
        "weapons": ["simple", "martial"],
        "tools": [],
        "skills": 0,
    },
    "bard": {
        "armor": ["light"],
        "weapons": [],
        "tools": ["one_musical_instrument"],
        "skills": 1,
    },
    "cleric": {
        "armor": ["light", "medium", "shields"],
        "weapons": [],
        "tools": [],
        "skills": 0,
    },
    "druid": {
        "armor": ["light", "shields"],
        "weapons": [],
        "tools": [],
        "skills": 0,
        "note_ru": "Без металлических доспехов/щитов — по правилу класса.",
    },
    "fighter": {
        "armor": ["light", "medium", "shields"],
        "weapons": ["simple", "martial"],
        "tools": [],
        "skills": 0,
    },
    "monk": {
        "armor": [],
        "weapons": ["simple", "light_martial_melee"],
        "tools": ["one_artisan_or_instrument"],
        "skills": 0,
    },
    "paladin": {
        "armor": ["light", "medium", "shields"],
        "weapons": ["simple", "martial"],
        "tools": [],
        "skills": 0,
    },
    "ranger": {
        "armor": ["light", "medium", "shields"],
        "weapons": ["simple", "martial"],
        "tools": [],
        "skills": 1,
    },
    "rogue": {
        "armor": ["light"],
        "weapons": [],
        "tools": ["thieves_tools"],
        "skills": 1,
    },
    "sorcerer": {"armor": [], "weapons": [], "tools": [], "skills": 0},
    "warlock": {"armor": ["light"], "weapons": [], "tools": [], "skills": 0},
    "wizard": {"armor": [], "weapons": [], "tools": [], "skills": 0},
    "artificer": {
        "armor": ["light", "medium", "shields"],
        "weapons": ["simple"],
        "tools": ["thieves_tools", "tinkers_tools", "one_artisan"],
        "skills": 0,
    },
}

# Spendable resource keys → display / recharge policy.
# Catalog may omit uses for Bardic (PB) and some derived pools.
RESOURCE_META: dict[str, dict[str, Any]] = {
    "second_wind": {
        "name_ru": "Второе дыхание",
        "reset": "long",
        "short_rest_regain": 1,
        "track": "spend",
        "on_hot": True,
        "feature_id": "second-wind",
    },
    "action_surge": {
        "name_ru": "Всплеск действий",
        "reset": "short",
        "track": "spend",
        "on_hot": True,
        "feature_id": "action-surge",
        "blocks_magic_action": True,
    },
    "indomitable": {
        "name_ru": "Непоколебимость",
        "reset": "long",
        "track": "spend",
        "on_hot": True,
        "feature_id": "indomitable",
    },
    "rages": {
        "name_ru": "Ярость",
        # SRD 5.2.1: +1 use on Short Rest, all on Long Rest.
        "reset": "long",
        "short_rest_regain": 1,
        "track": "spend",
        "on_hot": True,
        "feature_id": "rage",
        "unlimited_from_level": None,
    },
    "focus_points": {
        "name_ru": "Очки сосредоточенности",
        "reset": "short",
        "track": "spend",
        "on_hot": True,
        "feature_id": "monks-focus",
        "pool_alias": "ki",  # desk chips still look for :ki: in some paths
    },
    "uncanny_metabolism": {
        "name_ru": "Феноменальный метаболизм",
        "reset": "long",
        "track": "spend",
        "on_hot": False,
        "feature_id": "uncanny-metabolism",
        "fixed_uses": 1,
    },
    "bardic_inspiration": {
        "name_ru": "Бардовское вдохновение",
        # Uses = CHA mod (min 1). Font of Inspiration (L5+): full restore on short.
        "reset": "long",
        "track": "spend",
        "on_hot": True,
        "feature_id": "bardic-inspiration",
        "uses_from": "cha_mod_min_1",
        "distinct_from_heroic": True,
    },
    "channel_divinity": {
        "name_ru": "Проведение божественности",
        # Cleric/Paladin 2024: +1 on Short Rest, all on Long Rest.
        "reset": "long",
        "short_rest_regain": 1,
        "track": "spend",
        "on_hot": True,
        "feature_id": "channel-divinity",
    },
    "wild_shape": {
        "name_ru": "Дикий облик",
        # SRD 5.2.1: +1 on Short Rest, all on Long Rest.
        "reset": "long",
        "short_rest_regain": 1,
        "track": "spend",
        "on_hot": True,
        "feature_id": "wild-shape",
    },
    "magic_of_making": {
        "name_ru": "Магия вещей",
        "reset": "long",
        "track": "spend",
        "on_hot": True,
        "feature_id": "magic-of-making",
        "uses_from": "int_mod_min_1",
    },
    "lay_on_hands_hp": {
        "name_ru": "Наложение рук",
        "reset": "long",
        "track": "spend",
        "on_hot": True,
        "feature_id": "lay-on-hands",
    },
    "sorcery_points": {
        "name_ru": "Очки чародейства",
        "reset": "long",
        "track": "spend",
        "on_hot": True,
        "feature_id": "font-of-magic",
    },
    "innate_sorcery_uses": {
        "name_ru": "Врождённое чародейство",
        "reset": "long",
        "track": "spend",
        "on_hot": True,
        "feature_id": "innate-sorcery",
    },
    "sorcerous_restoration": {
        "name_ru": "Чародейское восстановление",
        "reset": "long",
        "track": "spend",
        "on_hot": False,
        "feature_id": "sorcerous-restoration",
        "fixed_uses": 1,
    },
    "favored_enemy_uses": {
        "name_ru": "Заклятый враг",
        "reset": "long",
        "track": "spend",
        "on_hot": True,
        "feature_id": "favored-enemy",
        "note_ru": "Бесплатные применения «Метки охотника».",
    },
    "arcane_recovery": {
        "name_ru": "Магическое восстановление",
        "reset": "long",
        "track": "spend",
        "on_hot": False,
        "feature_id": "arcane-recovery",
        "fixed_uses": 1,
    },
}

# Divine Sense is a Channel Divinity *option* for Paladin 2024, not a separate pool.

# Non-spend scale values shown on the sheet (not play.resources spend pools).
SCALE_KEYS = frozenset(
    {
        "rage_damage",
        "bardic_inspiration_die",
        "sneak_attack",
        "martial_arts_die",
        "unarmored_movement_ft",
        "eldritch_invocations",
        "replicate_plans_known",
        "replicate_magic_items",
        "weapon_mastery",
    }
)

CASTER_PROGRESSION: dict[str, str] = {
    "bard": "full",
    "cleric": "full",
    "druid": "full",
    "sorcerer": "full",
    "wizard": "full",
    "paladin": "half",
    "ranger": "half",
    "artificer": "half_up",
    "warlock": "pact",
    "barbarian": "none",
    "fighter": "none",
    "monk": "none",
    "rogue": "none",
}

FULL_CASTER_SLOTS: list[list[int]] = [
    [2, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 0, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 1, 0, 0, 0, 0, 0],
    [4, 3, 3, 2, 0, 0, 0, 0, 0],
    [4, 3, 3, 3, 1, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

SRD_SUBCLASS_BY_PARENT: dict[str, str] = {
    "barbarian": "barbarian__berserker",
    "bard": "bard__lore",
    "cleric": "cleric__life-domain",
    "druid": "druid__land",
    "fighter": "fighter__champion",
    "monk": "monk__warrior-of-the-hand",
    "paladin": "paladin__oath-of-devotion",
    "ranger": "ranger__hunter-ranger",
    "rogue": "rogue__thief",
    "sorcerer": "sorcerer__draconic-sorcery",
    "warlock": "warlock__fiend-patron",
    "wizard": "wizard__evoker",
}


class Edition2024ClassError(ValueError):
    def __init__(self, message: str, *, code: str = "edition_2024_class") -> None:
        super().__init__(message)
        self.code = code


def _live_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "srd" / "2024" / "live"


def _load_json(name: str) -> Any:
    return json.loads((_live_dir() / name).read_text(encoding="utf-8"))


def normalize_class_slug(value: str | None) -> str | None:
    raw = (value or "").strip().lower()
    if not raw:
        return None
    if raw in CLASS_SLUG_ALIASES:
        return CLASS_SLUG_ALIASES[raw]
    cleaned = raw.replace(" ", "-").replace("_", "-")
    if cleaned in CASTER_PROGRESSION:
        return cleaned
    if cleaned in CLASS_SLUG_ALIASES.values():
        return cleaned
    return cleaned if cleaned in MULTICLASS_PROFICIENCIES else None


def proficiency_bonus_for_level(total_level: int) -> int:
    lv = max(1, min(20, int(total_level or 1)))
    return ((lv - 1) // 4) + 2


def ability_mod(score: int) -> int:
    return (max(1, int(score)) - 10) // 2


def read_ability_scores_from_sheet(sheet: Mapping[str, Any] | None) -> dict[str, int]:
    """Parse sheet.abilities in the real leaf format: {str: {score: N}, ...}.

    Also accepts flat ints for convenience in unit tests.
    """
    out: dict[str, int] = {k: 10 for k in ("str", "dex", "con", "int", "wis", "cha")}
    if not isinstance(sheet, Mapping):
        return out
    ab = sheet.get("abilities")
    if not isinstance(ab, Mapping):
        return out
    for key in out:
        raw = ab.get(key)
        if isinstance(raw, Mapping):
            score = raw.get("score", raw.get("value", raw.get("base")))
            try:
                out[key] = int(score)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                pass
        elif isinstance(raw, (int, float)):
            out[key] = int(raw)
        elif isinstance(raw, str) and raw.strip().isdigit():
            out[key] = int(raw.strip())
    return out


@lru_cache(maxsize=1)
def load_class_catalog() -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for filename in ("classes_srd.json", "classes_efa.json"):
        payload = _load_json(filename)
        for entry in payload.get("entries") or []:
            slug = normalize_class_slug(entry.get("slug"))
            if not slug:
                continue
            out[slug] = {
                "slug": slug,
                "name_ru": entry.get("name_ru") or slug,
                "name_en": entry.get("name_en") or slug,
                "data": entry.get("data") or {},
            }
    return out


def load_subclass_catalog() -> dict[str, dict[str, Any]]:
    """All accepted 2024 subclass packs (SRD/PH24/EFA/FRHoF/RTW/AU)."""
    return e24sub.load_subclass_catalog()


def class_level_row(slug: str, level: int) -> dict[str, Any] | None:
    catalog = load_class_catalog().get(slug)
    if not catalog:
        return None
    lv = max(1, min(20, int(level or 1)))
    levels = catalog["data"].get("levels") or []
    for row in levels:
        if int(row.get("level") or 0) == lv:
            return row
    return None


@dataclass(frozen=True)
class ClassFeatureRow:
    id: str
    class_slug: str
    class_level: int
    name_ru: str
    name_en: str
    summary_ru: str
    source: str  # "class" | "subclass"
    subclass_slug: str | None = None
    automation: str = "text"  # resource | shared_option | always_prepared | third_caster | calc | text


@dataclass(frozen=True)
class ResourcePool:
    id: str  # feat:{class}:{pool}:{entry}
    pool_id: str
    class_slug: str
    name_ru: str
    max: int
    reset: str  # short | long | manual
    track: str = "spend"
    on_hot: bool = True
    short_rest_regain: int | None = None
    unlimited: bool = False
    blocks_magic_action: bool = False
    distinct_from_heroic: bool = False
    meta: dict[str, Any] = field(default_factory=dict)
    subclass_slug: str | None = None


@dataclass(frozen=True)
class SpellcastingBlock:
    class_slug: str
    progression: str
    cantrips: int
    prepared_spells: int
    slots: dict[str, int]  # "1".."9" max
    pact_slots: dict[str, int] | None  # {level, count}
    always_prepared: tuple[str, ...] = ()
    subclass_slug: str | None = None
    spells_known: int | None = None
    ability: str | None = None


@dataclass(frozen=True)
class ClassProgressionSnapshot:
    total_level: int
    proficiency_bonus: int
    features: tuple[ClassFeatureRow, ...]
    resources: tuple[ResourcePool, ...]
    scales: dict[str, Any]
    spellcasting: tuple[SpellcastingBlock, ...]
    multiclass_slots: dict[str, int]
    multiclass_pact: dict[str, int] | None
    feat_levels_reached: tuple[int, ...]
    epic_boon_reached: bool
    subclass_level: int


def _feature_rows_for_class(
    slug: str,
    level: int,
    *,
    subclass_slug: str | None,
    resource_feature_ids: set[str] | None = None,
    shared_option_ids: set[str] | None = None,
    calc_feature_ids: set[str] | None = None,
) -> list[ClassFeatureRow]:
    rows: list[ClassFeatureRow] = []
    catalog = load_class_catalog().get(slug)
    if not catalog:
        return rows
    subclass_at = int(catalog["data"].get("subclass_level") or 3)
    resource_feature_ids = resource_feature_ids or set()
    shared_option_ids = shared_option_ids or set()
    calc_feature_ids = calc_feature_ids or set()
    for row in catalog["data"].get("levels") or []:
        lv = int(row.get("level") or 0)
        if lv < 1 or lv > level:
            continue
        for feat in row.get("features") or []:
            fid = str(feat.get("id") or "").strip()
            if not fid:
                continue
            # Placeholder markers — real subclass features come from subclass pack.
            if fid.endswith("-subclass") or fid == "subclass-feature":
                continue
            rows.append(
                ClassFeatureRow(
                    id=fid.replace("-", "_"),
                    class_slug=slug,
                    class_level=lv,
                    name_ru=str(feat.get("name_ru") or fid),
                    name_en=str(feat.get("name_en") or fid),
                    summary_ru=str(feat.get("summary_ru") or ""),
                    source="class",
                    automation="resource" if fid in resource_feature_ids else "text",
                )
            )
    if subclass_slug and level >= subclass_at:
        sub = load_subclass_catalog().get(subclass_slug)
        if sub:
            parent = str((sub["data"] or {}).get("parent_class") or "")
            if normalize_class_slug(parent) in {slug, None} or not parent:
                for block in sub["data"].get("features") or []:
                    blv = int(block.get("level") or 0)
                    if blv < 1 or blv > level:
                        continue
                    for feat in block.get("features") or []:
                        fid = str(feat.get("id") or "").strip()
                        if not fid:
                            continue
                        fid_n = fid.replace("_", "-")
                        mode = e24sub.feature_automation_mode(
                            feature_id=fid,
                            subclass_slug=subclass_slug,
                            has_resource=fid in resource_feature_ids or fid_n in resource_feature_ids,
                            has_shared_option=fid_n in shared_option_ids
                            or fid.replace("-", "_") in shared_option_ids,
                            has_calc=fid_n in calc_feature_ids
                            or fid.replace("-", "_") in calc_feature_ids,
                        )
                        rows.append(
                            ClassFeatureRow(
                                id=fid.replace("-", "_"),
                                class_slug=slug,
                                class_level=blv,
                                name_ru=str(feat.get("name_ru") or fid),
                                name_en=str(feat.get("name_en") or fid),
                                summary_ru=str(feat.get("summary_ru") or ""),
                                source="subclass",
                                subclass_slug=subclass_slug,
                                automation=mode,
                            )
                        )
    return rows


def _always_prepared_for_subclass(
    subclass_slug: str | None,
    class_level: int,
    *,
    land_choice: str | None = None,
) -> list[str]:
    return e24sub.always_prepared_for_subclass(
        subclass_slug,
        class_level,
        land_choice=land_choice,
    )


def _resource_max(
    pool_key: str,
    raw_value: Any,
    *,
    class_slug: str,
    class_level: int,
    total_level: int,
    abilities: Mapping[str, int],
) -> int | None:
    meta = RESOURCE_META.get(pool_key)
    if pool_key in SCALE_KEYS:
        return None
    if meta and meta.get("fixed_uses") is not None:
        return int(meta["fixed_uses"])
    uses_from = (meta or {}).get("uses_from")
    if uses_from == "cha_mod_min_1" or pool_key == "bardic_inspiration":
        # SRD 5.2.1 Bardic Inspiration: Charisma modifier (minimum 1).
        return max(1, ability_mod(int(abilities.get("cha") or 10)))
    if uses_from == "int_mod_min_1":
        return max(1, ability_mod(int(abilities.get("int") or 10)))
    if uses_from == "one_plus_cha":
        return max(1, 1 + ability_mod(int(abilities.get("cha") or 10)))
    if uses_from == "proficiency_bonus":
        return proficiency_bonus_for_level(total_level)
    if isinstance(raw_value, (int, float)):
        n = int(raw_value)
        return n if n > 0 else 0
    return None


def _pool_id(class_slug: str, pool_key: str, entry_id: str) -> str:
    return f"feat:{class_slug}:{pool_key}:{entry_id}"


def _build_resources_for_class(
    slug: str,
    level: int,
    *,
    total_level: int,
    abilities: Mapping[str, int],
) -> tuple[list[ResourcePool], dict[str, Any]]:
    row = class_level_row(slug, level)
    if not row:
        return [], {}
    raw = dict(row.get("resources") or {})
    scales: dict[str, Any] = {}
    pools: list[ResourcePool] = []

    # Bardic: invent pool from die presence.
    if "bardic_inspiration_die" in raw:
        scales["bardic_inspiration_die"] = raw["bardic_inspiration_die"]
        raw.setdefault("bardic_inspiration", True)

    # Wizard arcane recovery — not in resources table.
    feature_ids = {str(f.get("id")) for f in (row.get("features") or [])}
    # Also check lower levels for arcane-recovery unlock
    catalog = load_class_catalog().get(slug)
    has_arcane = False
    if catalog:
        for lr in catalog["data"].get("levels") or []:
            if int(lr.get("level") or 0) > level:
                continue
            for f in lr.get("features") or []:
                if f.get("id") == "arcane-recovery":
                    has_arcane = True
    if has_arcane and slug == "wizard":
        raw.setdefault("arcane_recovery", 1)

    has_sorcerous_restoration = False
    if catalog:
        for lr in catalog["data"].get("levels") or []:
            if int(lr.get("level") or 0) > level:
                continue
            for f in lr.get("features") or []:
                if f.get("id") == "sorcerous-restoration":
                    has_sorcerous_restoration = True
    if has_sorcerous_restoration and slug == "sorcerer":
        raw.setdefault("sorcerous_restoration", 1)

    has_uncanny_metabolism = False
    if catalog:
        for lr in catalog["data"].get("levels") or []:
            if int(lr.get("level") or 0) > level:
                continue
            for f in lr.get("features") or []:
                if f.get("id") == "uncanny-metabolism":
                    has_uncanny_metabolism = True
    if has_uncanny_metabolism and slug == "monk":
        raw.setdefault("uncanny_metabolism", 1)

    # Artificer Magic of Making — INT mod uses / long rest (not in resources table).
    if slug == "artificer" and level >= 1:
        raw.setdefault("magic_of_making", True)

    for key, value in raw.items():
        if key in SCALE_KEYS or key == "weapon_mastery":
            scales[key] = value
            continue
        if key == "bardic_inspiration_die":
            continue
        meta = RESOURCE_META.get(key)
        if not meta and key not in ("bardic_inspiration",):
            # Unknown numeric → scale only if not spend-like name
            if isinstance(value, (int, float, str)):
                scales[key] = value
            continue
        max_uses = _resource_max(
            key,
            value,
            class_slug=slug,
            class_level=level,
            total_level=total_level,
            abilities=abilities,
        )
        if max_uses is None:
            continue
        if max_uses <= 0 and key != "channel_divinity":
            # 0 means not yet unlocked (e.g. action_surge at L1, wild_shape at L1)
            continue
        if max_uses <= 0:
            continue

        reset = str(meta.get("reset") or "long")
        short_regain = (
            int(meta["short_rest_regain"])
            if meta.get("short_rest_regain") is not None
            else None
        )
        # Bard Font of Inspiration (L5+): regain *all* BI uses on Short or Long Rest.
        if key == "bardic_inspiration" and level >= 5:
            reset = "short"
            short_regain = None

        entry = str(meta.get("feature_id") or key).replace("-", "_")
        pools.append(
            ResourcePool(
                id=_pool_id(slug, key, entry),
                pool_id=key,
                class_slug=slug,
                name_ru=str(meta.get("name_ru") or key),
                max=max_uses,
                reset=reset,
                track=str(meta.get("track") or "spend"),
                on_hot=bool(meta.get("on_hot", True)),
                short_rest_regain=short_regain,
                blocks_magic_action=bool(meta.get("blocks_magic_action")),
                distinct_from_heroic=bool(meta.get("distinct_from_heroic")),
                meta={
                    "feature_id": meta.get("feature_id"),
                    "pool_alias": meta.get("pool_alias"),
                    "note_ru": meta.get("note_ru"),
                    "rage_damage": raw.get("rage_damage") if key == "rages" else None,
                    "bardic_die": scales.get("bardic_inspiration_die")
                    if key == "bardic_inspiration"
                    else None,
                    "channel_options": (
                        ["divine_sense"]
                        if key == "channel_divinity" and slug == "paladin"
                        else None
                    ),
                },
            )
        )
    return pools, scales


def _spellcasting_for_class(
    slug: str,
    level: int,
    *,
    subclass_slug: str | None,
    land_choice: str | None = None,
) -> SpellcastingBlock | None:
    progression = CASTER_PROGRESSION.get(slug, "none")
    if progression == "none":
        return None
    row = class_level_row(slug, level)
    if not row:
        return None
    sc = row.get("spellcasting")
    if not sc:
        return None
    slots_raw = sc.get("slots") or {}
    pact_raw = sc.get("pact_slots")
    pact = None
    slots: dict[str, int] = {str(i): 0 for i in range(1, 10)}
    if progression == "pact":
        # Warlock: pact_slots = {slot_level, count} (or legacy slots shape).
        src = pact_raw if isinstance(pact_raw, dict) else slots_raw
        if isinstance(src, dict) and ("count" in src or "slot_level" in src):
            pact = {
                "level": int(src.get("slot_level") or src.get("level") or 1),
                "count": int(src.get("count") or 0),
            }
        else:
            pact = {"level": 1, "count": 0}
    else:
        for k, v in (slots_raw or {}).items():
            ks = str(k)
            if ks.isdigit() and 1 <= int(ks) <= 9:
                slots[ks] = int(v or 0)

    always = tuple(
        _always_prepared_for_subclass(
            subclass_slug,
            level,
            land_choice=land_choice,
        )
    )
    # Class-level always-prepared hints (ranger hunter's mark, paladin smite) —
    # encoded as feature text; add known free spells when feature unlocked.
    catalog = load_class_catalog().get(slug)
    free: list[str] = list(always)
    if catalog:
        unlocked_ids = set()
        for lr in catalog["data"].get("levels") or []:
            if int(lr.get("level") or 0) > level:
                continue
            for f in lr.get("features") or []:
                unlocked_ids.add(str(f.get("id")))
        if "favored-enemy" in unlocked_ids and "hunters-mark" not in free:
            free.append("hunters-mark")
        if "paladins-smite" in unlocked_ids and "divine-smite" not in free:
            free.append("divine-smite")
        if "magic-of-making" in unlocked_ids and "mending" not in free:
            free.append("mending")

    return SpellcastingBlock(
        class_slug=slug,
        progression=progression,
        cantrips=int(sc.get("cantrips") or 0),
        prepared_spells=int(sc.get("prepared_spells") or 0),
        slots=slots,
        pact_slots=pact,
        always_prepared=tuple(free),
        subclass_slug=subclass_slug,
    )


def multiclass_caster_level(entries: Sequence[tuple[str, int]]) -> int:
    """SRD multiclass spellcaster level (warlock excluded — pact separate)."""
    total = 0
    for slug, level in entries:
        prog = CASTER_PROGRESSION.get(slug, "none")
        lv = max(0, int(level or 0))
        if prog == "full":
            total += lv
        elif prog == "half":
            total += lv // 2
        elif prog == "half_up":
            total += (lv + 1) // 2
        elif prog == "third":
            total += lv // 3
    return total


def slots_for_caster_level(caster_level: int) -> dict[str, int]:
    if caster_level < 1:
        return {str(i): 0 for i in range(1, 10)}
    row = FULL_CASTER_SLOTS[min(20, caster_level) - 1]
    return {str(i + 1): int(row[i]) for i in range(9)}


_ABILITY_NAME_RU = {
    "str": "Сила",
    "dex": "Ловкость",
    "con": "Телосложение",
    "int": "Интеллект",
    "wis": "Мудрость",
    "cha": "Харизма",
}


def _primary_need_ru(primaries: Sequence[str], mode: str) -> str:
    names = [_ABILITY_NAME_RU.get(a, a) for a in primaries]
    if mode == "any":
        if len(names) == 1:
            return f"Нужен {names[0]} 13+"
        return f"Нужен {' или '.join(names)} 13+"
    if len(names) == 1:
        return f"Нужен {names[0]} 13+"
    return f"Нужны {' и '.join(names)} 13+"


def check_multiclass_prerequisites(
    *,
    current_classes: Sequence[str],
    new_class: str,
    abilities: Mapping[str, int],
) -> tuple[bool, str]:
    """Return (ok, reason_ru). Requires ≥13 in primaries of all involved classes."""
    new_slug = normalize_class_slug(new_class)
    if not new_slug or new_slug not in load_class_catalog():
        return False, f"Неизвестный класс: {new_class}"
    involved = []
    for name in current_classes:
        s = normalize_class_slug(name)
        if s:
            involved.append(s)
    if new_slug not in involved:
        involved.append(new_slug)
    for slug in involved:
        catalog = load_class_catalog().get(slug)
        if not catalog:
            return False, f"Нет каталога класса {slug}"
        primaries = list(catalog["data"].get("primary_abilities") or [])
        if not primaries:
            continue
        mode = MULTICLASS_MODE.get(slug, "all")
        scores = [int(abilities.get(a) or 0) for a in primaries]
        if mode == "any":
            if not any(s >= 13 for s in scores):
                return (
                    False,
                    f"{catalog['name_ru']}: {_primary_need_ru(primaries, 'any')}",
                )
        else:
            if not all(s >= 13 for s in scores):
                return (
                    False,
                    f"{catalog['name_ru']}: {_primary_need_ru(primaries, 'all')}",
                )
    return True, ""


def multiclass_proficiencies_for(slug: str) -> dict[str, Any]:
    return dict(MULTICLASS_PROFICIENCIES.get(normalize_class_slug(slug) or "", {}))


def compute_progression(
    classes: Sequence[Mapping[str, Any]],
    *,
    abilities: Mapping[str, int] | None = None,
) -> ClassProgressionSnapshot:
    """Build a full 2024 class progression snapshot for the sheet.

    `classes` items: {name|slug, level, subclass_slug?, land_choice?}
    """
    abilities = dict(abilities or {})
    parsed: list[tuple[str, int, str | None, str | None]] = []
    for row in classes:
        slug = normalize_class_slug(
            str(row.get("slug") or row.get("catalog_slug") or row.get("name") or "")
        )
        if not slug:
            continue
        level = max(1, min(20, int(row.get("level") or 1)))
        sub = row.get("subclass_slug") or row.get("subclass_catalog_id")
        sub_s = str(sub).strip() if sub else None
        if sub_s and "__" not in sub_s:
            # allow short form "champion" → fighter__champion when unique
            guess = SRD_SUBCLASS_BY_PARENT.get(slug)
            if guess and (sub_s in guess or guess.endswith(sub_s)):
                sub_s = guess
            else:
                # unique suffix match across catalog
                hits = [
                    s
                    for s in load_subclass_catalog()
                    if s.endswith(f"__{sub_s}") or s.endswith(sub_s)
                ]
                if len(hits) == 1:
                    sub_s = hits[0]
        land = row.get("land_choice") or row.get("circle_land")
        land_s = str(land).strip().lower() if land else None
        parsed.append((slug, level, sub_s, land_s))

    total_level = sum(lv for _, lv, _, _ in parsed) or 1
    total_level = min(20, total_level)
    pb = proficiency_bonus_for_level(total_level)

    features: list[ClassFeatureRow] = []
    resources: list[ResourcePool] = []
    scales: dict[str, Any] = {}
    spell_blocks: list[SpellcastingBlock] = []
    feat_levels: list[int] = []
    epic = False
    subclass_level = 3

    for slug, level, sub, land_s in parsed:
        catalog = load_class_catalog().get(slug)
        if not catalog:
            continue
        subclass_level = int(catalog["data"].get("subclass_level") or 3)
        for fl in catalog["data"].get("feat_levels") or []:
            if int(fl) <= level and int(fl) not in feat_levels:
                feat_levels.append(int(fl))
        if level >= int(catalog["data"].get("epic_boon_level") or 19):
            epic = True

        sub_pools = (
            e24sub.build_subclass_resources(
                sub,
                level,
                total_level=total_level,
                abilities=abilities,
            )
            if sub
            else []
        )
        shared_opts = (
            e24sub.shared_options_for_subclass(sub, level) if sub else []
        )
        perm_bonuses = (
            e24sub.build_permanent_bonuses(sub, level, abilities=abilities) if sub else []
        )
        resource_fids = {
            str(p.meta.get("feature_id") or "").replace("_", "-") for p in sub_pools
        }
        shared_fids = {o.feature_id.replace("_", "-") for o in shared_opts}
        calc_fids = {b.feature_id.replace("_", "-") for b in perm_bonuses}
        features.extend(
            _feature_rows_for_class(
                slug,
                level,
                subclass_slug=sub,
                resource_feature_ids=resource_fids,
                shared_option_ids=shared_fids,
                calc_feature_ids=calc_fids,
            )
        )
        pools, sc = _build_resources_for_class(
            slug, level, total_level=total_level, abilities=abilities
        )
        # Attach subclass Channel Divinity options onto the shared class pool.
        channel_opts = (
            e24sub.channel_option_ids_for_subclass(sub, level) if sub else []
        )
        for pool in pools:
            if pool.pool_id == "channel_divinity":
                existing = list(pool.meta.get("channel_options") or [])
                for opt in channel_opts:
                    if opt not in existing:
                        existing.append(opt)
                if slug == "paladin" and "divine_sense" not in existing:
                    existing.insert(0, "divine_sense")
                pool.meta["channel_options"] = existing
            # Bard college / monk / etc. shared options listed on the spend pool.
            matching = [
                {
                    "feature_id": o.feature_id,
                    "name_ru": o.name_ru,
                    "cost": o.cost,
                    "cost_max": o.cost_max,
                    "kind": o.kind,
                }
                for o in shared_opts
                if o.spend_pool == pool.pool_id
            ]
            if matching:
                pool.meta["subclass_spend_options"] = matching
        resources.extend(pools)
        for sp in sub_pools:
            resources.append(
                ResourcePool(
                    id=sp.id,
                    pool_id=sp.pool_id,
                    class_slug=sp.class_slug,
                    name_ru=sp.name_ru,
                    max=sp.max,
                    reset=sp.reset,
                    track=sp.track,
                    on_hot=sp.on_hot,
                    short_rest_regain=sp.short_rest_regain,
                    meta=sp.meta,
                    subclass_slug=sp.subclass_slug,
                )
            )
            if sp.meta.get("die"):
                scales[f"{slug}:{sp.pool_id}:die"] = sp.meta["die"]
        for k, v in sc.items():
            if k == "martial_arts_die" and isinstance(v, str):
                scales[f"{slug}:{k}"] = v.replace("d", "к").replace("D", "к")
            else:
                scales[f"{slug}:{k}"] = v
        if shared_opts:
            scales[f"{slug}:subclass_shared_options"] = e24sub.shared_options_to_sheet(
                shared_opts
            )
        if perm_bonuses:
            scales[f"{slug}:subclass_permanent_bonuses"] = e24sub.permanent_bonuses_to_sheet(
                perm_bonuses
            )
            crits = [b for b in perm_bonuses if b.kind == "crit_threshold"]
            if crits:
                # Lowest threshold wins (18 beats 19).
                scales[f"{slug}:crit_threshold"] = min(int(b.value) for b in crits)
            init_mod = next((b for b in perm_bonuses if b.kind == "initiative_mod"), None)
            if init_mod is not None:
                scales[f"{slug}:initiative_mod"] = init_mod.value
            hp_pl = next((b for b in perm_bonuses if b.kind == "hp_per_level"), None)
            if hp_pl is not None:
                scales[f"{slug}:hp_per_level"] = hp_pl.value
            ac = next((b for b in perm_bonuses if b.kind == "ac_formula"), None)
            if ac is not None:
                scales[f"{slug}:ac_formula"] = ac.value
            aura = next((b for b in perm_bonuses if b.kind == "aura_radius"), None)
            if aura is not None:
                scales[f"{slug}:aura_radius_ft"] = (
                    aura.value.get("ft") if isinstance(aura.value, dict) else aura.value
                )
        # Body and Mind (monk 20): permanent DEX/WIS +4, cap 25.
        if slug == "monk" and level >= 20:
            body_mind = {
                "feature_id": "body-and-mind",
                "name_ru": "Тело и разум",
                "kind": "ability_scores",
                "value": {"dex": 4, "wis": 4, "cap": 25},
                "min_level": 20,
            }
            existing = list(scales.get(f"{slug}:subclass_permanent_bonuses") or [])
            existing.append(body_mind)
            scales[f"{slug}:subclass_permanent_bonuses"] = existing
            scales[f"{slug}:body_and_mind"] = {"dex": 4, "wis": 4, "cap": 25}
        block = _spellcasting_for_class(
            slug,
            level,
            subclass_slug=sub,
            land_choice=land_s,
        )
        if block:
            spell_blocks.append(block)
        if sub:
            third = e24sub.third_caster_block(sub, level)
            if third:
                spell_blocks.append(
                    SpellcastingBlock(
                        class_slug=str(third["class_slug"]),
                        progression="third",
                        cantrips=int(third["cantrips"]),
                        prepared_spells=0,
                        slots=dict(third["slots"]),
                        pact_slots=None,
                        always_prepared=(),
                        subclass_slug=sub,
                        spells_known=int(third["spells_known"]),
                        ability=str(third["ability"]),
                    )
                )
                scales[f"{slug}:third_caster_known"] = third["spells_known"]

    caster_lv = multiclass_caster_level([(s, lv) for s, lv, _, _ in parsed])
    # Include third-caster levels in multiclass caster level.
    for slug, level, sub, _ in parsed:
        if sub and sub in e24sub.THIRD_CASTER_SUBCLASSES:
            caster_lv += level // 3
    # Single-class non-warlock: prefer class table slots; multiclass: combined table.
    non_pact = [b for b in spell_blocks if b.progression not in {"pact"}]
    primary_slots = [b for b in non_pact if b.progression != "third"]
    pact_blocks = [b for b in spell_blocks if b.progression == "pact"]
    third_only = [b for b in non_pact if b.progression == "third"]
    if len(parsed) <= 1 and primary_slots:
        mc_slots = dict(primary_slots[0].slots)
    elif len(parsed) <= 1 and third_only and not primary_slots:
        mc_slots = dict(third_only[0].slots)
    elif primary_slots or third_only:
        mc_slots = slots_for_caster_level(caster_lv)
    else:
        mc_slots = {str(i): 0 for i in range(1, 10)}

    pact = None
    if pact_blocks:
        # Highest warlock level wins.
        best = max(
            pact_blocks,
            key=lambda b: (b.pact_slots or {}).get("count", 0)
            + 10 * (b.pact_slots or {}).get("level", 0),
        )
        pact = dict(best.pact_slots or {})

    return ClassProgressionSnapshot(
        total_level=total_level,
        proficiency_bonus=pb,
        features=tuple(features),
        resources=tuple(resources),
        scales=scales,
        spellcasting=tuple(spell_blocks),
        multiclass_slots=mc_slots,
        multiclass_pact=pact,
        feat_levels_reached=tuple(sorted(feat_levels)),
        epic_boon_reached=epic,
        subclass_level=subclass_level,
    )


def apply_short_rest_to_resources(
    resources: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    """Return updated resource dicts after a short rest (2024 policies)."""
    out: list[dict[str, Any]] = []
    for raw in resources:
        row = dict(raw)
        reset = str(row.get("reset") or "long")
        used = int(row.get("used") or 0)
        max_u = int(row.get("max") or 0)
        regain = row.get("short_rest_regain")
        pool = str(row.get("pool_id") or "")
        if reset == "short":
            row["used"] = 0
        elif regain is not None:
            row["used"] = max(0, used - int(regain))
        elif pool == "second_wind":
            row["used"] = max(0, used - 1)
        else:
            row["used"] = min(max_u, used)
        out.append(row)
    return out


def apply_long_rest_to_resources(
    resources: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for raw in resources:
        row = dict(raw)
        if str(row.get("reset") or "long") in {"short", "long"}:
            row["used"] = 0
        out.append(row)
    return out


def action_surge_allows_action(action_kind: str | None) -> bool:
    """Action Surge cannot be spent on a Magic action (SRD 5.2.1)."""
    kind = str(action_kind or "").strip().lower()
    if kind in {"magic", "магия", "cast", "spell"}:
        return False
    return True


def resource_pools_to_sheet(
    resources: Sequence[ResourcePool],
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
                "unlimited": pool.unlimited,
                "blocks_magic_action": pool.blocks_magic_action,
                "distinct_from_heroic": pool.distinct_from_heroic,
                "meta": pool.meta,
            }
        )
    return rows


def snapshot_to_sheet_fragment(snap: ClassProgressionSnapshot) -> dict[str, Any]:
    return {
        "total_level": snap.total_level,
        "proficiency_bonus": snap.proficiency_bonus,
        "subclass_level": snap.subclass_level,
        "feat_levels_reached": list(snap.feat_levels_reached),
        "epic_boon_reached": snap.epic_boon_reached,
        "features": [
            {
                "id": f.id,
                "class_slug": f.class_slug,
                "class_level": f.class_level,
                "name_ru": f.name_ru,
                "name_en": f.name_en,
                "summary_ru": f.summary_ru,
                "source": f.source,
                "subclass_slug": f.subclass_slug,
                "automation": f.automation,
            }
            for f in snap.features
        ],
        "resources": resource_pools_to_sheet(snap.resources),
        "scales": snap.scales,
        "spellcasting": [
            {
                "class_slug": b.class_slug,
                "progression": b.progression,
                "cantrips": b.cantrips,
                "prepared_spells": b.prepared_spells,
                "slots": b.slots,
                "pact_slots": b.pact_slots,
                "always_prepared": list(b.always_prepared),
                "subclass_slug": b.subclass_slug,
                "spells_known": b.spells_known,
                "ability": b.ability,
            }
            for b in snap.spellcasting
        ],
        "multiclass_slots": snap.multiclass_slots,
        "multiclass_pact": snap.multiclass_pact,
    }


def validate_class_progress_update(
    *,
    rules_edition: str,
    previous: Any,
    incoming: Any,
    sheet: Mapping[str, Any] | None,
) -> dict[str, Any] | None:
    """Validate/normalize sheet.class_progress_2024. Strip on 2014."""
    if str(rules_edition).strip() != "2024":
        if incoming:
            raise Edition2024ClassError(
                "class_progress_2024 только для редакции 2024",
                code="class_progress_2014_forbidden",
            )
        return None

    classes_raw = []
    if isinstance(sheet, Mapping):
        raw_classes = sheet.get("classes")
        if isinstance(raw_classes, list):
            classes_raw = raw_classes
    abilities = read_ability_scores_from_sheet(sheet)

    snap = compute_progression(classes_raw, abilities=abilities)
    expected = snapshot_to_sheet_fragment(snap)

    # Merge used counters from incoming/previous when max matches.
    prev_used: dict[str, int] = {}
    for src in (previous, incoming):
        if not isinstance(src, Mapping):
            continue
        for row in src.get("resources") or []:
            if isinstance(row, Mapping) and row.get("id"):
                try:
                    prev_used[str(row["id"])] = int(row.get("used") or 0)
                except (TypeError, ValueError):
                    pass
    for row in expected["resources"]:
        uid = str(row["id"])
        if uid in prev_used:
            row["used"] = max(0, min(int(row["max"]), prev_used[uid]))

    return expected


def strip_class_progress_from_sheet_for_2014(sheet: dict[str, Any]) -> dict[str, Any]:
    out = dict(sheet)
    out.pop("class_progress_2024", None)
    return out


def list_srd_class_slugs() -> list[str]:
    return sorted(
        s
        for s in load_class_catalog()
        if s != "artificer" or True  # include artificer (EFA)
    )
