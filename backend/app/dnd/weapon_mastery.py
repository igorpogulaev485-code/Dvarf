"""P24-M01: Weapon Mastery (2024) — limits, picks, property resolution.

Catalog groundwork lives in P24-C03/C04 (weapons.data.mastery, class.weapon_mastery).
This module is the runtime rules engine. 2014 characters must never carry mastery picks.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

from app.services.edition_2024_catalog_seed import (
    WEAPON_MASTERY_IDS,
    load_weapon_mastery_dictionary,
)

MASTERY_FEATURE_ID = "weapon-mastery"
TACTICAL_MASTER_FEATURE_ID = "tactical-master"
TACTICAL_MASTER_LEVEL = 9
TACTICAL_MASTER_OPTIONS = frozenset({"push", "sap", "slow"})

# Multiclass 2024: if more than one class grants Weapon Mastery, the feature
# is used for only one of those classes (PHB/SRD multiclassing).
CLASS_SLUG_ALIASES = {
    "боец": "fighter",
    "воин": "fighter",
    "варвар": "barbarian",
    "паладин": "paladin",
    "следопыт": "ranger",
    "плут": "rogue",
    "разбойник": "rogue",
}


@dataclass(frozen=True)
class WeaponMasteryClassRules:
    slug: str
    enabled: bool
    by_level: dict[int, int]
    melee_only: bool
    weapon_categories: tuple[str, ...]
    change_after_long_rest: int | str  # 1 or "all"
    requires_proficiency: bool


@dataclass(frozen=True)
class WeaponCatalogRow:
    slug: str
    mastery: str | None
    category: str
    range_kind: str
    properties: tuple[str, ...]
    name_ru: str


@dataclass(frozen=True)
class WeaponMasteryState:
    known: tuple[str, ...]
    source_class: str | None
    baseline: tuple[str, ...]
    swap_available: bool


@dataclass(frozen=True)
class MasteryPropertyResult:
    property_id: str
    name_ru: str
    summary_ru: str
    applied: bool
    feed_line_ru: str
    effects: dict[str, Any]


def _live_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "srd" / "2024" / "live"


def _load_json(name: str) -> Any:
    path = _live_dir() / name
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_class_slug(value: str | None) -> str | None:
    raw = (value or "").strip().lower()
    if not raw:
        return None
    if raw in CLASS_SLUG_ALIASES:
        return CLASS_SLUG_ALIASES[raw]
    # catalog slug or english name
    cleaned = raw.replace(" ", "-").replace("_", "-")
    if cleaned in CLASS_SLUG_ALIASES.values() or cleaned in {
        "fighter",
        "barbarian",
        "paladin",
        "ranger",
        "rogue",
        "bard",
        "cleric",
        "druid",
        "monk",
        "sorcerer",
        "warlock",
        "wizard",
    }:
        return cleaned
    return CLASS_SLUG_ALIASES.get(raw) or cleaned


def load_class_weapon_mastery_rules() -> dict[str, WeaponMasteryClassRules]:
    payload = _load_json("classes_srd.json")
    entries = payload.get("entries") if isinstance(payload, dict) else payload
    out: dict[str, WeaponMasteryClassRules] = {}
    for row in entries or []:
        if not isinstance(row, Mapping):
            continue
        slug = normalize_class_slug(str(row.get("slug") or ""))
        if not slug:
            continue
        data = row.get("data") if isinstance(row.get("data"), Mapping) else {}
        wm = data.get("weapon_mastery") if isinstance(data.get("weapon_mastery"), Mapping) else {}
        enabled = bool(wm.get("enabled"))
        by_level_raw = wm.get("by_level") if isinstance(wm.get("by_level"), Mapping) else {}
        by_level = {int(k): int(v) for k, v in by_level_raw.items()}
        cats = wm.get("weapon_categories")
        if isinstance(cats, list) and cats:
            categories = tuple(str(c).lower() for c in cats)
        else:
            categories = ("simple", "martial")
        change = wm.get("change_after_long_rest", 1)
        if change == "all" or str(change).lower() == "all":
            change_norm: int | str = "all"
        else:
            try:
                change_norm = int(change)
            except (TypeError, ValueError):
                change_norm = 1
        # Paladin / ranger / rogue: weapons the character is proficient with.
        requires_prof = slug in {"paladin", "ranger", "rogue"}
        out[slug] = WeaponMasteryClassRules(
            slug=slug,
            enabled=enabled,
            by_level=by_level,
            melee_only=bool(wm.get("melee_only")),
            weapon_categories=categories,
            change_after_long_rest=change_norm,
            requires_proficiency=requires_prof,
        )
    return out


def load_weapon_catalog_index() -> dict[str, WeaponCatalogRow]:
    payload = _load_json("weapons_srd.json")
    entries = payload.get("entries") if isinstance(payload, dict) else payload
    out: dict[str, WeaponCatalogRow] = {}
    for row in entries or []:
        if not isinstance(row, Mapping):
            continue
        slug = str(row.get("slug") or "").strip().lower()
        if not slug:
            continue
        data = row.get("data") if isinstance(row.get("data"), Mapping) else {}
        mastery = data.get("mastery")
        mastery_s = str(mastery).strip().lower() if mastery else None
        if mastery_s and mastery_s not in WEAPON_MASTERY_IDS:
            mastery_s = None
        props_raw = data.get("properties") if isinstance(data.get("properties"), list) else []
        props = tuple(str(p).strip().lower() for p in props_raw if p is not None)
        out[slug] = WeaponCatalogRow(
            slug=slug,
            mastery=mastery_s,
            category=str(data.get("category") or "simple").strip().lower(),
            range_kind=str(data.get("range_kind") or "melee").strip().lower(),
            properties=props,
            name_ru=str(row.get("name_ru") or slug),
        )
    return out


def mastery_dictionary_by_id() -> dict[str, dict[str, Any]]:
    return {str(e["id"]): e for e in load_weapon_mastery_dictionary()}


def empty_weapon_mastery_state() -> WeaponMasteryState:
    return WeaponMasteryState(known=(), source_class=None, baseline=(), swap_available=False)


def read_weapon_mastery_state(raw: Any) -> WeaponMasteryState:
    if not isinstance(raw, Mapping):
        return empty_weapon_mastery_state()
    known_raw = raw.get("known") or raw.get("known_weapon_slugs") or []
    baseline_raw = raw.get("baseline") or raw.get("rest_baseline") or known_raw
    known = tuple(
        str(x).strip().lower()
        for x in (known_raw if isinstance(known_raw, list) else [])
        if str(x).strip()
    )
    baseline = tuple(
        str(x).strip().lower()
        for x in (baseline_raw if isinstance(baseline_raw, list) else [])
        if str(x).strip()
    )
    source = normalize_class_slug(
        str(raw.get("source_class") or raw.get("source_class_slug") or "") or None
    )
    swap = bool(raw.get("swap_available") or raw.get("long_rest_swap_available"))
    return WeaponMasteryState(
        known=known,
        source_class=source,
        baseline=baseline,
        swap_available=swap,
    )


def weapon_mastery_to_sheet(state: WeaponMasteryState) -> dict[str, Any]:
    return {
        "known": list(state.known),
        "source_class": state.source_class,
        "baseline": list(state.baseline),
        "swap_available": bool(state.swap_available),
    }


def class_levels_from_sheet(sheet: Mapping[str, Any] | None) -> list[tuple[str, int]]:
    """Return [(class_slug, level), ...] from sheet.classes / fallbacks."""
    if not isinstance(sheet, Mapping):
        return []
    rows = sheet.get("classes")
    out: list[tuple[str, int]] = []
    if isinstance(rows, list) and rows:
        for item in rows:
            if not isinstance(item, Mapping):
                continue
            name = item.get("name") or item.get("slug") or item.get("class_name")
            slug = normalize_class_slug(str(name) if name else None)
            # Prefer explicit slug field when present.
            if item.get("slug"):
                slug = normalize_class_slug(str(item.get("slug"))) or slug
            try:
                level = max(1, int(item.get("level") or 1))
            except (TypeError, ValueError):
                level = 1
            if slug:
                out.append((slug, level))
        if out:
            return out
    # Fallback single class
    fallback_name = sheet.get("class_name") or (sheet.get("identity") or {}).get("class_name")
    slug = normalize_class_slug(str(fallback_name) if fallback_name else None)
    try:
        level = max(1, int(sheet.get("level") or 1))
    except (TypeError, ValueError):
        level = 1
    if slug:
        return [(slug, level)]
    return []


def granting_weapon_mastery_classes(
    class_levels: Sequence[tuple[str, int]],
    rules: Mapping[str, WeaponMasteryClassRules] | None = None,
) -> list[tuple[WeaponMasteryClassRules, int]]:
    table = rules or load_class_weapon_mastery_rules()
    out: list[tuple[WeaponMasteryClassRules, int]] = []
    for slug, level in class_levels:
        rule = table.get(slug)
        if rule and rule.enabled:
            out.append((rule, level))
    return out


def mastery_limit_for_class(rule: WeaponMasteryClassRules, level: int) -> int:
    if not rule.enabled:
        return 0
    lvl = max(1, min(20, int(level)))
    if rule.by_level:
        if lvl in rule.by_level:
            return int(rule.by_level[lvl])
        # nearest lower
        keys = sorted(k for k in rule.by_level if k <= lvl)
        if keys:
            return int(rule.by_level[keys[-1]])
    return 0


def resolve_active_mastery_budget(
    class_levels: Sequence[tuple[str, int]],
    *,
    source_class: str | None = None,
    rules: Mapping[str, WeaponMasteryClassRules] | None = None,
) -> tuple[WeaponMasteryClassRules | None, int]:
    """Multiclass: only one class's Weapon Mastery is active.

    If ``source_class`` is set and grants WM, use it. Otherwise pick the
    granting class with the highest limit (ties → first in sheet order).
    """
    granted = granting_weapon_mastery_classes(class_levels, rules)
    if not granted:
        return None, 0
    if source_class:
        src = normalize_class_slug(source_class)
        for rule, level in granted:
            if rule.slug == src:
                return rule, mastery_limit_for_class(rule, level)
    best: tuple[WeaponMasteryClassRules, int, int] | None = None
    for rule, level in granted:
        limit = mastery_limit_for_class(rule, level)
        if best is None or limit > best[2]:
            best = (rule, level, limit)
    assert best is not None
    return best[0], best[2]


def has_tactical_master(class_levels: Sequence[tuple[str, int]]) -> bool:
    for slug, level in class_levels:
        if normalize_class_slug(slug) == "fighter" and level >= TACTICAL_MASTER_LEVEL:
            return True
    return False


def weapon_allowed_for_mastery(
    weapon: WeaponCatalogRow,
    rule: WeaponMasteryClassRules,
    *,
    proficient_weapon_slugs: Sequence[str] | None = None,
    has_simple_prof: bool = True,
    has_martial_prof: bool = True,
) -> bool:
    if weapon.category not in rule.weapon_categories:
        return False
    if rule.melee_only and weapon.range_kind != "melee":
        return False
    if rule.requires_proficiency:
        prof_set = {s.strip().lower() for s in (proficient_weapon_slugs or []) if s}
        if weapon.slug in prof_set:
            return True
        if weapon.category == "simple" and has_simple_prof:
            return True
        if weapon.category == "martial" and has_martial_prof:
            return True
        return False
    return True


def count_changed_weapons(before: Sequence[str], after: Sequence[str]) -> int:
    """How many mastery slots were replaced (symmetric difference / 2, ceil)."""
    a = {str(x).strip().lower() for x in before if str(x).strip()}
    b = {str(x).strip().lower() for x in after if str(x).strip()}
    # Replacements: max(|A-B|, |B-A|) when sizes equal; otherwise |A△B| adjusted.
    removed = a - b
    added = b - a
    return max(len(removed), len(added))


class WeaponMasteryValidationError(ValueError):
    def __init__(self, message: str, *, code: str = "weapon_mastery_invalid"):
        super().__init__(message)
        self.code = code


def validate_weapon_mastery_update(
    *,
    rules_edition: str | None,
    previous: Any,
    incoming: Any,
    sheet: Mapping[str, Any] | None,
    proficient_weapon_slugs: Sequence[str] | None = None,
    has_simple_prof: bool = True,
    has_martial_prof: bool = True,
    weapons_index: Mapping[str, WeaponCatalogRow] | None = None,
    class_rules: Mapping[str, WeaponMasteryClassRules] | None = None,
) -> WeaponMasteryState | None:
    """Validate sheet.weapon_mastery write.

    Returns normalized state for 2024 (or None when field absent/empty on 2014).
    Raises WeaponMasteryValidationError on illegal writes.
    """
    edition = str(getattr(rules_edition, "value", rules_edition) or "2014")
    prev = read_weapon_mastery_state(previous)
    has_incoming = incoming is not None and incoming != {}

    if edition != "2024":
        if has_incoming and read_weapon_mastery_state(incoming).known:
            raise WeaponMasteryValidationError(
                "Мастерство оружия есть только в редакции 2024",
                code="weapon_mastery_edition_2014",
            )
        # Allow clearing / omitting on 2014.
        return None

    if not has_incoming:
        return prev if prev.known or prev.source_class else empty_weapon_mastery_state()

    nxt = read_weapon_mastery_state(incoming)
    class_levels = class_levels_from_sheet(sheet)
    rule, limit = resolve_active_mastery_budget(
        class_levels, source_class=nxt.source_class, rules=class_rules
    )
    if rule is None or limit <= 0:
        if nxt.known:
            raise WeaponMasteryValidationError(
                "У этого персонажа нет умения «Мастерство оружия»",
                code="weapon_mastery_not_available",
            )
        return empty_weapon_mastery_state()

    if len(nxt.known) > limit:
        raise WeaponMasteryValidationError(
            f"Можно выбрать не больше {limit} видов оружия с мастерством",
            code="weapon_mastery_limit",
        )

    # Deduplicate while preserving order.
    seen: set[str] = set()
    known_unique: list[str] = []
    for slug in nxt.known:
        if slug in seen:
            continue
        seen.add(slug)
        known_unique.append(slug)

    index = weapons_index or load_weapon_catalog_index()
    for slug in known_unique:
        weapon = index.get(slug)
        if weapon is None:
            raise WeaponMasteryValidationError(
                f"Неизвестное оружие для мастерства: {slug}",
                code="weapon_mastery_unknown_weapon",
            )
        if not weapon.mastery:
            raise WeaponMasteryValidationError(
                f"У оружия {slug} нет свойства мастерства",
                code="weapon_mastery_no_property",
            )
        if not weapon_allowed_for_mastery(
            weapon,
            rule,
            proficient_weapon_slugs=proficient_weapon_slugs,
            has_simple_prof=has_simple_prof,
            has_martial_prof=has_martial_prof,
        ):
            raise WeaponMasteryValidationError(
                f"Оружие {slug} недоступно для мастерства класса {rule.slug}",
                code="weapon_mastery_weapon_not_allowed",
            )

    # Swap rules after long rest (or initial free pick when baseline empty).
    baseline = prev.baseline if prev.baseline else prev.known
    changing = tuple(known_unique) != prev.known
    if changing and baseline and not nxt.swap_available and not prev.swap_available:
        # Initial fill of empty known is always ok; otherwise need swap window.
        if prev.known:
            raise WeaponMasteryValidationError(
                "Смена мастерства оружия доступна после продолжительного отдыха",
                code="weapon_mastery_swap_locked",
            )

    if changing and (nxt.swap_available or prev.swap_available) and baseline:
        changed = count_changed_weapons(baseline, known_unique)
        allowed = rule.change_after_long_rest
        if allowed != "all":
            max_change = int(allowed)
            if changed > max_change:
                raise WeaponMasteryValidationError(
                    f"После отдыха можно сменить не больше {max_change} вида(ов) оружия",
                    code="weapon_mastery_swap_limit",
                )

    source = rule.slug
    # After a successful swap (or first pick), clear swap flag and refresh baseline
    # when the caller marks the write as completing the rest swap.
    swap_flag = bool(nxt.swap_available)
    new_baseline = baseline
    if changing and (prev.swap_available or nxt.swap_available):
        # Completing the rest swap: lock again and adopt new baseline.
        swap_flag = False
        new_baseline = tuple(known_unique)
    elif not baseline and known_unique:
        new_baseline = tuple(known_unique)
        swap_flag = False
    elif not changing:
        # Preserve caller's swap_available (e.g. long rest just opened the window).
        swap_flag = bool(nxt.swap_available) if "swap_available" in (
            incoming if isinstance(incoming, Mapping) else {}
        ) or "long_rest_swap_available" in (
            incoming if isinstance(incoming, Mapping) else {}
        ) else prev.swap_available
        new_baseline = baseline if baseline else tuple(known_unique)

    return WeaponMasteryState(
        known=tuple(known_unique),
        source_class=source,
        baseline=tuple(new_baseline),
        swap_available=swap_flag,
    )


def mark_long_rest_swap(state: WeaponMasteryState | None) -> WeaponMasteryState:
    cur = state or empty_weapon_mastery_state()
    return WeaponMasteryState(
        known=cur.known,
        source_class=cur.source_class,
        baseline=cur.known if cur.known else cur.baseline,
        swap_available=True,
    )


def resolve_effective_mastery_property(
    *,
    weapon_slug: str,
    known: Sequence[str],
    tactical_master: bool = False,
    substitute: str | None = None,
    weapons_index: Mapping[str, WeaponCatalogRow] | None = None,
) -> str | None:
    """Return mastery property id if the weapon is known; apply Tactical Master."""
    slug = str(weapon_slug or "").strip().lower()
    if not slug or slug not in {str(x).strip().lower() for x in known}:
        return None
    index = weapons_index or load_weapon_catalog_index()
    weapon = index.get(slug)
    if weapon is None or not weapon.mastery:
        return None
    prop = weapon.mastery
    if tactical_master and substitute:
        sub = str(substitute).strip().lower()
        if sub in TACTICAL_MASTER_OPTIONS:
            return sub
    return prop


def topple_save_dc(*, attack_ability_mod: int, proficiency_bonus: int) -> int:
    return 8 + int(attack_ability_mod) + int(proficiency_bonus)


def apply_mastery_property(
    property_id: str,
    *,
    hit: bool,
    damage_dealt: bool = False,
    attack_ability_mod: int = 0,
    proficiency_bonus: int = 2,
    damage_type: str | None = None,
    nick_already_used: bool = False,
    cleave_already_used: bool = False,
) -> MasteryPropertyResult:
    """Resolve one mastery property application for an attack outcome."""
    pid = str(property_id or "").strip().lower()
    dictionary = mastery_dictionary_by_id()
    card = dictionary.get(pid) or {
        "id": pid,
        "name_ru": pid,
        "summary_ru": "",
    }
    name_ru = str(card.get("name_ru") or pid)
    summary_ru = str(card.get("summary_ru") or "")
    effects: dict[str, Any] = {"property": pid}

    def _fail(reason: str) -> MasteryPropertyResult:
        return MasteryPropertyResult(
            property_id=pid,
            name_ru=name_ru,
            summary_ru=summary_ru,
            applied=False,
            feed_line_ru=reason,
            effects=effects,
        )

    if pid not in WEAPON_MASTERY_IDS:
        return _fail(f"Неизвестное свойство мастерства: {pid}")

    if pid == "graze":
        if hit:
            return _fail("Касание срабатывает только при промахе")
        dmg = max(0, int(attack_ability_mod))
        effects.update(
            {
                "graze_damage": dmg,
                "damage_type": damage_type,
            }
        )
        return MasteryPropertyResult(
            property_id=pid,
            name_ru=name_ru,
            summary_ru=summary_ru,
            applied=True,
            feed_line_ru=f"Касание: {dmg} урона ({damage_type or 'тот же тип'}) при промахе",
            effects=effects,
        )

    if not hit:
        return _fail(f"{name_ru}: нужно попадание")

    if pid == "cleave":
        if cleave_already_used:
            return _fail("Рассечение уже использовано в этот ход")
        effects["cleave_extra_attack"] = True
        effects["omit_ability_mod_if_nonneg"] = True
        return MasteryPropertyResult(
            property_id=pid,
            name_ru=name_ru,
            summary_ru=summary_ru,
            applied=True,
            feed_line_ru="Рассечение: доп. атака по второму существу в 5 фт",
            effects=effects,
        )

    if pid == "nick":
        if nick_already_used:
            return _fail("Засечка уже использована в этот ход")
        effects["nick_light_attack_in_attack_action"] = True
        effects["consumes_bonus_action"] = False
        return MasteryPropertyResult(
            property_id=pid,
            name_ru=name_ru,
            summary_ru=summary_ru,
            applied=True,
            feed_line_ru="Засечка: доп. атака лёгким оружием как часть действия «Атака»",
            effects=effects,
        )

    if pid == "push":
        effects["push_ft"] = 10
        effects["max_size"] = "large"
        return MasteryPropertyResult(
            property_id=pid,
            name_ru=name_ru,
            summary_ru=summary_ru,
            applied=True,
            feed_line_ru="Толчок: цель оттолкнута на 10 фт",
            effects=effects,
        )

    if pid == "sap":
        effects["target_attack_disadvantage_next"] = True
        return MasteryPropertyResult(
            property_id=pid,
            name_ru=name_ru,
            summary_ru=summary_ru,
            applied=True,
            feed_line_ru="Ослабление: помеха на следующую атаку цели",
            effects=effects,
        )

    if pid == "slow":
        if not damage_dealt:
            return _fail("Замедление требует попадания и урона")
        effects["speed_penalty_ft"] = 10
        effects["speed_penalty_stacks"] = False
        return MasteryPropertyResult(
            property_id=pid,
            name_ru=name_ru,
            summary_ru=summary_ru,
            applied=True,
            feed_line_ru="Замедление: скорость цели −10 фт",
            effects=effects,
        )

    if pid == "topple":
        dc = topple_save_dc(
            attack_ability_mod=attack_ability_mod,
            proficiency_bonus=proficiency_bonus,
        )
        effects["save"] = {"ability": "con", "dc": dc}
        effects["condition_on_fail"] = "prone"
        return MasteryPropertyResult(
            property_id=pid,
            name_ru=name_ru,
            summary_ru=summary_ru,
            applied=True,
            feed_line_ru=f"Опрокидывание: спас Тел Сл {dc} или опрокинут",
            effects=effects,
        )

    if pid == "vex":
        if not damage_dealt:
            return _fail("Смущение требует попадания и урона")
        effects["attacker_advantage_next_vs_target"] = True
        return MasteryPropertyResult(
            property_id=pid,
            name_ru=name_ru,
            summary_ru=summary_ru,
            applied=True,
            feed_line_ru="Смущение: преимущество на следующую атаку по этой цели",
            effects=effects,
        )

    return _fail(f"Свойство {pid} не реализовано")


def strip_weapon_mastery_from_sheet_for_2014(sheet: dict[str, Any]) -> dict[str, Any]:
    """Ensure 2014 sheets do not persist mastery picks."""
    if "weapon_mastery" in sheet:
        sheet = dict(sheet)
        sheet.pop("weapon_mastery", None)
    return sheet
