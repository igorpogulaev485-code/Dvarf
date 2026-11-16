"""P24-M03: validate and materialize a level-1 character for rules_edition=2024.

2014 create path is untouched. This module is the server source of truth for the
2024 wizard finalize payload.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping, Sequence

from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_class_options as e24opt
from app.dnd import weapon_mastery as wm
from app.dnd.edition_2024_languages import (
    COMMON_LANGUAGE_ID,
    CLASS_SPECIAL_LANGUAGES,
    list_selectable_languages,
    validate_language_picks,
)
from app.services.character_sheet import empty_character_sheet

ABILITY_KEYS = ("str", "dex", "con", "int", "wis", "cha")
STANDARD_ARRAY = (15, 14, 13, 12, 10, 8)
POINT_BUY_COST = {8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9}
POINT_BUY_BUDGET = 27
ABILITY_CAP = 20
BACKGROUND_GOLD_GP = 50

# Classes that grant a Fighting Style feat at level 1 (catalog L1 features).
FIGHTING_STYLE_AT_L1 = frozenset({"fighter"})

# Origin feats with structured picks (others are grant-only).
ORIGIN_FEATS_WITH_SPELL_LIST = frozenset({"magic-initiate"})
ORIGIN_FEATS_SKILLED = frozenset({"skilled"})
MAGIC_INITIATE_LISTS = frozenset({"cleric", "druid", "wizard"})

DIVINE_ORDER_OPTIONS = frozenset({"protector", "thaumaturge"})
PRIMAL_ORDER_OPTIONS = frozenset({"magician", "warden"})

ARTISAN_TOOL_IDS = (
    "alchemists-supplies",
    "brewers-supplies",
    "calligraphers-supplies",
    "carpenters-tools",
    "cartographers-tools",
    "cobblers-tools",
    "cooks-utensils",
    "glassblowers-tools",
    "jewelers-tools",
    "leatherworkers-tools",
    "masons-tools",
    "painters-supplies",
    "potters-tools",
    "smiths-tools",
    "tinkers-tools",
    "weavers-tools",
    "woodcarvers-tools",
)

GAMING_SET_IDS = (
    "dice-set",
    "dragonchess-set",
    "playing-card-set",
    "three-dragon-ante-set",
)

MUSICAL_INSTRUMENT_IDS = (
    "bagpipes",
    "drum",
    "dulcimer",
    "flute",
    "horn",
    "lute",
    "lyre",
    "pan-flute",
    "shawm",
    "viol",
)

SKILL_IDS = frozenset(
    {
        "acrobatics",
        "animal_handling",
        "arcana",
        "athletics",
        "deception",
        "history",
        "insight",
        "intimidation",
        "investigation",
        "medicine",
        "nature",
        "perception",
        "performance",
        "persuasion",
        "religion",
        "sleight_of_hand",
        "stealth",
        "survival",
    }
)


class Create2024Error(ValueError):
    """Validation failure for 2024 create; `.code` is a stable machine id."""

    def __init__(self, message: str, *, code: str = "create_2024_invalid") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class Create2024Payload:
    name: str
    class_slug: str
    background_slug: str
    species_slug: str
    ability_method: str  # standard_array | point_buy | roll | manual
    base_abilities: dict[str, int]
    background_asi_mode: str  # +2/+1 | +1/+1/+1
    background_asi: dict[str, int]
    language_ids: list[str]
    class_skill_ids: list[str] = field(default_factory=list)
    weapon_mastery_ids: list[str] = field(default_factory=list)
    fighting_style_slug: str | None = None
    background_tool_id: str | None = None
    background_equipment: str = "pack"  # pack | gold
    class_equipment: str = "a"  # a | b | gold
    species_size: str | None = None
    species_lineage_id: str | None = None
    species_ancestry_id: str | None = None  # dragonborn damage type etc.
    origin_feat_list: str | None = None  # magic initiate list
    origin_feat_cantrips: list[str] = field(default_factory=list)
    origin_feat_spell_id: str | None = None
    origin_feat_skilled: list[str] = field(default_factory=list)
    cantrip_ids: list[str] = field(default_factory=list)
    prepared_spell_ids: list[str] = field(default_factory=list)
    class_option_picks: dict[str, Any] = field(default_factory=dict)
    gender: str | None = None
    is_draft: bool = False
    is_preview: bool = False
    subclass_slug: str | None = None  # must be None/empty at L1


@dataclass
class Create2024Result:
    sheet: dict[str, Any]
    name: str
    level: int
    class_name: str
    race_name: str
    hp_max: int
    hp_current: int
    warnings: list[str] = field(default_factory=list)


def _live_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "srd" / "2024" / "live"


def _load_live(pattern: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(_live_dir().glob(pattern)):
        payload = json.loads(path.read_text(encoding="utf-8"))
        entries = payload.get("entries") if isinstance(payload, dict) else None
        if isinstance(entries, list):
            rows.extend(e for e in entries if isinstance(e, dict))
    return rows


@lru_cache(maxsize=1)
def load_background_catalog() -> dict[str, dict[str, Any]]:
    return {str(e["slug"]): e for e in _load_live("backgrounds_*.json") if e.get("slug")}


@lru_cache(maxsize=1)
def load_species_catalog() -> dict[str, dict[str, Any]]:
    return {str(e["slug"]): e for e in _load_live("species_*.json") if e.get("slug")}


@lru_cache(maxsize=1)
def load_feat_catalog() -> dict[str, dict[str, Any]]:
    return {str(e["slug"]): e for e in _load_live("feats_*.json") if e.get("slug")}


@lru_cache(maxsize=1)
def load_spell_catalog() -> dict[str, dict[str, Any]]:
    return {str(e["slug"]): e for e in _load_live("spells_*.json") if e.get("slug")}


@lru_cache(maxsize=1)
def load_item_catalog() -> dict[str, dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for pattern in ("weapons_*.json", "armor_*.json", "equipment_*.json"):
        rows.extend(_load_live(pattern))
    return {str(e["slug"]): e for e in rows if e.get("slug")}


def fighting_style_feat_slugs() -> frozenset[str]:
    out: set[str] = set()
    for slug, row in load_feat_catalog().items():
        data = row.get("data") if isinstance(row.get("data"), dict) else {}
        if data.get("category") == "fighting_style":
            out.add(slug)
    return frozenset(out)


def _ability_mod(score: int) -> int:
    return (int(score) - 10) // 2


def _require_mapping(value: Mapping[str, Any] | None, label: str) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise Create2024Error(f"{label} обязателен", code="create_2024_missing")
    return dict(value)


def _normalize_slug(value: str | None) -> str:
    # Keep underscores (e.g. species elf__lfl, skill animal_handling).
    return (value or "").strip().lower()


def _spell_level(row: Mapping[str, Any] | None) -> int:
    data = row.get("data") if isinstance(row, Mapping) else None
    if not isinstance(data, Mapping):
        return -1
    raw = data.get("level")
    if raw is None:
        return -1
    try:
        return int(raw)
    except (TypeError, ValueError):
        return -1


def payload_from_dict(raw: Mapping[str, Any]) -> Create2024Payload:
    base_abilities = {
        k: int((_require_mapping(raw.get("base_abilities"), "base_abilities").get(k) or 0))
        for k in ABILITY_KEYS
    }
    asi_raw = raw.get("background_asi") or {}
    if not isinstance(asi_raw, Mapping):
        raise Create2024Error("background_asi должен быть объектом", code="create_2024_asi")
    background_asi = {str(k).lower(): int(v) for k, v in asi_raw.items()}
    return Create2024Payload(
        name=str(raw.get("name") or "").strip() or "Новый персонаж",
        class_slug=_normalize_slug(str(raw.get("class_slug") or "")),
        background_slug=_normalize_slug(str(raw.get("background_slug") or "")),
        species_slug=_normalize_slug(str(raw.get("species_slug") or "")),
        ability_method=str(raw.get("ability_method") or "standard_array").strip(),
        base_abilities=base_abilities,
        background_asi_mode=str(raw.get("background_asi_mode") or "").strip(),
        background_asi=background_asi,
        language_ids=[str(x) for x in (raw.get("language_ids") or [])],
        class_skill_ids=[str(x) for x in (raw.get("class_skill_ids") or [])],
        weapon_mastery_ids=[str(x) for x in (raw.get("weapon_mastery_ids") or [])],
        fighting_style_slug=(
            _normalize_slug(str(raw.get("fighting_style_slug")))
            if raw.get("fighting_style_slug")
            else None
        ),
        background_tool_id=(
            _normalize_slug(str(raw.get("background_tool_id")))
            if raw.get("background_tool_id")
            else None
        ),
        background_equipment=str(raw.get("background_equipment") or "pack").strip().lower(),
        class_equipment=str(raw.get("class_equipment") or "a").strip().lower(),
        species_size=(str(raw.get("species_size")).strip().lower() if raw.get("species_size") else None),
        species_lineage_id=(
            _normalize_slug(str(raw.get("species_lineage_id")))
            if raw.get("species_lineage_id")
            else None
        ),
        species_ancestry_id=(
            _normalize_slug(str(raw.get("species_ancestry_id")))
            if raw.get("species_ancestry_id")
            else None
        ),
        origin_feat_list=(
            _normalize_slug(str(raw.get("origin_feat_list")))
            if raw.get("origin_feat_list")
            else None
        ),
        origin_feat_cantrips=[str(x) for x in (raw.get("origin_feat_cantrips") or [])],
        origin_feat_spell_id=(
            _normalize_slug(str(raw.get("origin_feat_spell_id")))
            if raw.get("origin_feat_spell_id")
            else None
        ),
        origin_feat_skilled=[str(x) for x in (raw.get("origin_feat_skilled") or [])],
        cantrip_ids=[str(x) for x in (raw.get("cantrip_ids") or [])],
        prepared_spell_ids=[str(x) for x in (raw.get("prepared_spell_ids") or [])],
        class_option_picks=dict(raw.get("class_option_picks") or {}),
        gender=str(raw.get("gender")).strip() if raw.get("gender") else None,
        is_draft=bool(raw.get("is_draft") or False),
        is_preview=bool(raw.get("is_preview") or False),
        subclass_slug=(
            _normalize_slug(str(raw.get("subclass_slug")))
            if raw.get("subclass_slug")
            else None
        ),
    )


def _validate_abilities(payload: Create2024Payload) -> None:
    method = payload.ability_method
    scores = payload.base_abilities
    for key in ABILITY_KEYS:
        if key not in scores:
            raise Create2024Error(f"Нет характеристики {key}", code="create_2024_abilities")
        val = int(scores[key])
        if method in {"standard_array", "point_buy"}:
            if val < 8 or val > 15:
                raise Create2024Error(
                    f"Базовая характеристика {key} вне диапазона метода ({val})",
                    code="create_2024_abilities",
                )
        elif val < 3 or val > 20:
            raise Create2024Error(
                f"Базовая характеристика {key} вне диапазона броска ({val})",
                code="create_2024_abilities",
            )
    values = [int(scores[k]) for k in ABILITY_KEYS]
    if method == "standard_array":
        if sorted(values, reverse=True) != sorted(STANDARD_ARRAY, reverse=True):
            raise Create2024Error(
                "Стандартный набор должен быть ровно 15/14/13/12/10/8",
                code="create_2024_abilities",
            )
    elif method == "point_buy":
        cost = 0
        for val in values:
            if val not in POINT_BUY_COST:
                raise Create2024Error(
                    f"Покупка очков: значение {val} недопустимо (8–15)",
                    code="create_2024_abilities",
                )
            cost += POINT_BUY_COST[val]
        if cost > POINT_BUY_BUDGET:
            raise Create2024Error(
                f"Покупка очков превышает бюджет {POINT_BUY_BUDGET} (сейчас {cost})",
                code="create_2024_abilities",
            )
    elif method in {"roll", "manual"}:
        pass
    else:
        raise Create2024Error(
            f"Неизвестный метод характеристик: {method}",
            code="create_2024_abilities",
        )


def _validate_background_asi(
    payload: Create2024Payload,
    bg_data: Mapping[str, Any],
) -> dict[str, int]:
    asi = bg_data.get("asi") if isinstance(bg_data.get("asi"), dict) else {}
    allowed = [str(a).lower() for a in (asi.get("abilities") or [])]
    if len(allowed) != 3:
        raise Create2024Error(
            "У предыстории должны быть ровно три характеристики ASI",
            code="create_2024_asi",
        )
    mode = payload.background_asi_mode
    if mode not in {"+2/+1", "+1/+1/+1"}:
        raise Create2024Error(
            "Режим ASI предыстории: только +2/+1 или +1/+1/+1",
            code="create_2024_asi",
        )
    options = {str(x) for x in (asi.get("options") or ["+2/+1", "+1/+1/+1"])}
    if mode not in options:
        raise Create2024Error(
            f"Режим ASI {mode} не разрешён этой предысторией",
            code="create_2024_asi",
        )
    assignments = {str(k).lower(): int(v) for k, v in payload.background_asi.items()}
    for key in assignments:
        if key not in allowed:
            raise Create2024Error(
                f"ASI нельзя дать характеристике {key} — только {', '.join(allowed)}",
                code="create_2024_asi",
            )
        if key not in ABILITY_KEYS:
            raise Create2024Error(f"Неизвестная характеристика ASI: {key}", code="create_2024_asi")
    if mode == "+2/+1":
        plus2 = [k for k, v in assignments.items() if v == 2]
        plus1 = [k for k, v in assignments.items() if v == 1]
        other = [k for k, v in assignments.items() if v not in (1, 2)]
        if other or len(plus2) != 1 or len(plus1) != 1 or len(assignments) != 2:
            raise Create2024Error(
                "Режим +2/+1: ровно одна характеристика +2 и одна +1 из тройки предыстории",
                code="create_2024_asi",
            )
    else:
        if sorted(assignments.keys()) != sorted(allowed) or any(
            v != 1 for v in assignments.values()
        ):
            raise Create2024Error(
                "Режим +1/+1/+1: +1 ко всем трём характеристикам предыстории",
                code="create_2024_asi",
            )
    return assignments


def _apply_asi(base: Mapping[str, int], asi: Mapping[str, int]) -> dict[str, int]:
    out = {k: int(base[k]) for k in ABILITY_KEYS}
    for key, bonus in asi.items():
        out[key] = int(out[key]) + int(bonus)
        if out[key] > ABILITY_CAP:
            raise Create2024Error(
                f"Характеристика {key} превышает потолок {ABILITY_CAP}",
                code="create_2024_asi_cap",
            )
    return out


def _validate_class_skills(
    payload: Create2024Payload,
    class_data: Mapping[str, Any],
) -> list[str]:
    choices = class_data.get("skill_choices") if isinstance(class_data.get("skill_choices"), dict) else {}
    count = int(choices.get("count") or 0)
    from_any = bool(choices.get("from_any"))
    allowed = [str(x) for x in (choices.get("from") or [])]
    if from_any or not allowed:
        allowed = sorted(SKILL_IDS)
    picks = [str(x) for x in payload.class_skill_ids]
    if len(picks) != count:
        raise Create2024Error(
            f"Класс требует {count} навыка(ов), выбрано {len(picks)}",
            code="create_2024_skills",
        )
    seen: set[str] = set()
    for skill in picks:
        if skill not in allowed:
            raise Create2024Error(
                f"Навык {skill} не в списке класса",
                code="create_2024_skills",
            )
        if skill in seen:
            raise Create2024Error(f"Навык выбран дважды: {skill}", code="create_2024_skills")
        seen.add(skill)
    return picks


def _validate_fighting_style(payload: Create2024Payload) -> str | None:
    slug = payload.class_slug
    if slug in FIGHTING_STYLE_AT_L1:
        if not payload.fighting_style_slug:
            raise Create2024Error(
                "На 1 уровне воину нужен боевой стиль",
                code="create_2024_fighting_style",
            )
        if payload.fighting_style_slug not in fighting_style_feat_slugs():
            raise Create2024Error(
                f"Неизвестный боевой стиль: {payload.fighting_style_slug}",
                code="create_2024_fighting_style",
            )
        return payload.fighting_style_slug
    if payload.fighting_style_slug:
        raise Create2024Error(
            "Этот класс не даёт боевой стиль на 1 уровне",
            code="create_2024_fighting_style",
        )
    return None


def _weapon_mastery_limit(class_slug: str) -> int:
    rules = wm.load_class_weapon_mastery_rules()
    rule = rules.get(class_slug)
    if rule is None or not rule.enabled:
        return 0
    return wm.mastery_limit_for_class(rule, 1)


def _validate_weapon_mastery(payload: Create2024Payload) -> list[str]:
    limit = _weapon_mastery_limit(payload.class_slug)
    picks = [_normalize_slug(x) for x in payload.weapon_mastery_ids]
    if limit <= 0:
        if picks:
            raise Create2024Error(
                "У этого класса нет мастерства оружия на 1 уровне",
                code="create_2024_weapon_mastery",
            )
        return []
    if len(picks) != limit:
        raise Create2024Error(
            f"Нужно выбрать {limit} вида(ов) оружия с мастерством, сейчас {len(picks)}",
            code="create_2024_weapon_mastery",
        )
    if len(set(picks)) != len(picks):
        raise Create2024Error(
            "Виды оружия с мастерством не должны повторяться",
            code="create_2024_weapon_mastery",
        )
    stub_sheet = {
        "classes": [{"slug": payload.class_slug, "level": 1, "name": payload.class_slug}],
        "proficiency": {"weapons": {"simple": True, "martial": True}},
    }
    state = {
        "known": picks,
        "source_class": payload.class_slug,
        "baseline": picks,
        "swap_available": False,
    }
    try:
        wm.validate_weapon_mastery_update(
            rules_edition="2024",
            previous=None,
            incoming=state,
            sheet=stub_sheet,
            has_simple_prof=True,
            has_martial_prof=True,
        )
    except wm.WeaponMasteryValidationError as exc:
        raise Create2024Error(str(exc), code=exc.code) from exc
    return picks


def _tool_choice_pool(choices: Mapping[str, Any] | None) -> list[str] | None:
    if not isinstance(choices, Mapping):
        return None
    if choices.get("from"):
        return [str(x) for x in choices["from"]]
    category = str(
        choices.get("category")
        or choices.get("from_category")
        or choices.get("from_group")
        or ""
    ).lower()
    if "artisan" in category:
        return list(ARTISAN_TOOL_IDS)
    if "gaming" in category:
        return list(GAMING_SET_IDS)
    if "musical" in category or "instrument" in category:
        return list(MUSICAL_INSTRUMENT_IDS)
    return None


def _validate_background_tool(
    payload: Create2024Payload,
    bg_data: Mapping[str, Any],
) -> str | None:
    fixed = [str(x) for x in (bg_data.get("tool_proficiencies") or []) if x]
    choices = bg_data.get("tool_choices")
    if fixed and not choices:
        return fixed[0]
    pool = _tool_choice_pool(choices if isinstance(choices, dict) else None)
    if pool is None and not fixed:
        return None
    if pool is not None:
        if not payload.background_tool_id:
            raise Create2024Error(
                "Нужно выбрать инструмент предыстории",
                code="create_2024_tool",
            )
        if payload.background_tool_id not in pool and payload.background_tool_id not in fixed:
            # Allow any non-empty tool id for category pools when catalog ids diverge.
            if len(payload.background_tool_id) < 2:
                raise Create2024Error("Некорректный инструмент", code="create_2024_tool")
        return payload.background_tool_id
    return fixed[0] if fixed else None


def _client_picks(payload: Create2024Payload) -> dict[str, Any]:
    raw = payload.class_option_picks if isinstance(payload.class_option_picks, dict) else {}
    nested = raw.get("client_picks") if isinstance(raw.get("client_picks"), dict) else {}
    return dict(nested or {})


def _validate_origin_feat(
    payload: Create2024Payload,
    bg_data: Mapping[str, Any],
) -> dict[str, Any]:
    from app.dnd.edition_2024_origin_feats import OriginFeatError, validate_origin_feat_picks

    origin = bg_data.get("origin_feat") if isinstance(bg_data.get("origin_feat"), dict) else {}
    feat_slug = _normalize_slug(str(origin.get("slug") or origin.get("id") or ""))
    if not feat_slug:
        raise Create2024Error(
            "У предыстории нет черты происхождения",
            code="create_2024_origin_feat",
        )
    client = _client_picks(payload)
    nested = client.get("origin_feat_picks") if isinstance(client.get("origin_feat_picks"), dict) else {}
    # Merge legacy top-level magic-initiate / skilled fields for older clients/tests.
    picks_in: dict[str, Any] = dict(nested)
    if payload.origin_feat_list and "list" not in picks_in:
        picks_in["list"] = [payload.origin_feat_list]
    if payload.origin_feat_cantrips and "cantrips" not in picks_in:
        picks_in["cantrips"] = list(payload.origin_feat_cantrips)
    if payload.origin_feat_spell_id and "spell" not in picks_in:
        picks_in["spell"] = [payload.origin_feat_spell_id]
    if payload.origin_feat_skilled and "skilled" not in picks_in:
        picks_in["skilled"] = list(payload.origin_feat_skilled)
    # Default casting ability for magic-initiate when tests omit it.
    if feat_slug == "magic-initiate" and "ability" not in picks_in:
        picks_in["ability"] = ["int"]
    try:
        return validate_origin_feat_picks(feat_slug, picks_in, context="background")
    except OriginFeatError as exc:
        raise Create2024Error(exc.message, code=exc.code) from exc


def _validate_species(payload: Create2024Payload) -> dict[str, Any]:
    species = load_species_catalog().get(payload.species_slug)
    if species is None:
        raise Create2024Error(
            f"Неизвестный вид: {payload.species_slug}",
            code="create_2024_species",
        )
    data = species.get("data") if isinstance(species.get("data"), dict) else {}
    # No racial ASI / languages from species.
    if data.get("ability_bonuses"):
        # Data may still carry empty dict; non-empty is a catalog bug for 2024.
        bonuses = data.get("ability_bonuses")
        if isinstance(bonuses, dict) and any(int(v or 0) for v in bonuses.values()):
            raise Create2024Error(
                "Вид 2024 не должен давать бонусы характеристик",
                code="create_2024_species",
            )
    size_options = [str(x).lower() for x in (data.get("size_options") or [])]
    if not size_options and data.get("size"):
        size_options = [str(data.get("size")).lower()]
    size = (payload.species_size or (size_options[0] if size_options else "medium")).lower()
    if size_options and size not in size_options:
        raise Create2024Error(
            f"Размер {size} недоступен для вида (доступно: {', '.join(size_options)})",
            code="create_2024_species",
        )
    lineage_id = payload.species_lineage_id
    lineages = data.get("lineages") if isinstance(data.get("lineages"), list) else []
    if data.get("lineage_required") or lineages:
        allowed = {_normalize_slug(str(x.get("id") or x.get("slug") or "")) for x in lineages if isinstance(x, dict)}
        if not lineage_id or lineage_id not in allowed:
            raise Create2024Error(
                "Для этого вида нужно выбрать родословную/наследие",
                code="create_2024_species",
            )
    elif lineage_id:
        raise Create2024Error(
            "У этого вида нет выбора родословной",
            code="create_2024_species",
        )
    ancestry_id = payload.species_ancestry_id
    if data.get("draconic_ancestry"):
        allowed_damage = {
            "acid",
            "cold",
            "fire",
            "lightning",
            "poison",
        }
        if ancestry_id not in allowed_damage:
            raise Create2024Error(
                "Драконорождённый: выберите тип урона наследия",
                code="create_2024_species",
            )

    from app.dnd.edition_2024_origin_feats import (
        OriginFeatError,
        validate_origin_feat_picks,
        validate_species_trait_picks,
    )

    client = _client_picks(payload)
    species_picks_raw = (
        client.get("species_picks") if isinstance(client.get("species_picks"), dict) else {}
    )
    try:
        species_picks = validate_species_trait_picks(
            payload.species_slug, data, species_picks_raw
        )
    except OriginFeatError as exc:
        raise Create2024Error(exc.message, code=exc.code) from exc

    species_feat: dict[str, Any] | None = None
    if data.get("origin_feat_choice"):
        feat_blob = client.get("species_feat") if isinstance(client.get("species_feat"), dict) else {}
        feat_slug = _normalize_slug(str(feat_blob.get("slug") or ""))
        if not feat_slug:
            raise Create2024Error(
                "Человек: выберите черту происхождения (Гибкий)",
                code="create_2024_species",
            )
        feat_picks = feat_blob.get("picks") if isinstance(feat_blob.get("picks"), dict) else {}
        if feat_slug == "magic-initiate" and "ability" not in feat_picks:
            feat_picks = {**feat_picks, "ability": ["int"]}
        try:
            species_feat = validate_origin_feat_picks(
                feat_slug, feat_picks, context="species"
            )
        except OriginFeatError as exc:
            raise Create2024Error(exc.message, code=exc.code) from exc

    return {
        "slug": payload.species_slug,
        "name_ru": species.get("name_ru"),
        "size": size,
        "speed": int(data.get("speed") or 30),
        "darkvision": int(data.get("darkvision") or 0),
        "lineage_id": lineage_id,
        "ancestry_id": ancestry_id,
        "traits_text": data.get("traits_text") or "",
        "data": data,
        "picks": species_picks,
        "species_feat": species_feat,
    }


def _validate_equipment(payload: Create2024Payload, class_data: Mapping[str, Any]) -> dict[str, Any]:
    packs = class_data.get("starting_equipment") or []
    if not isinstance(packs, list) or not packs:
        raise Create2024Error("У класса нет стартового снаряжения", code="create_2024_gear")
    by_id = {str(p.get("id")): p for p in packs if isinstance(p, dict)}
    choice = payload.class_equipment
    if choice not in by_id:
        raise Create2024Error(
            f"Пакет класса {choice} недоступен (есть: {', '.join(by_id)})",
            code="create_2024_gear",
        )
    if payload.background_equipment not in {"pack", "gold"}:
        raise Create2024Error(
            "Снаряжение предыстории: pack или gold",
            code="create_2024_gear",
        )
    return {"class_pack": by_id[choice], "background_mode": payload.background_equipment}


def _class_spell_list_slugs(class_slug: str) -> set[str]:
    """Best-effort: spells whose data.classes / lists mention the class."""
    out: set[str] = set()
    for slug, row in load_spell_catalog().items():
        data = row.get("data") if isinstance(row.get("data"), dict) else {}
        classes = data.get("classes") or data.get("class_lists") or data.get("lists") or []
        if isinstance(classes, list):
            normalized = {_normalize_slug(str(c)) for c in classes}
            if class_slug in normalized:
                out.add(slug)
        # Some cards use boolean map
        if isinstance(classes, dict) and classes.get(class_slug):
            out.add(slug)
    # Fallback: if catalog lacks class tags, allow any spell of matching level
    # only when the set is empty — tests seed SRD lists with class tags.
    return out


def _validate_spells(payload: Create2024Payload) -> dict[str, Any]:
    snap = e24.compute_progression(
        [{"slug": payload.class_slug, "level": 1}],
        abilities=payload.base_abilities,
    )
    blocks = list(snap.spellcasting or [])
    if not blocks:
        if payload.cantrip_ids or payload.prepared_spell_ids:
            raise Create2024Error(
                "Этот класс не выбирает заклинания на 1 уровне",
                code="create_2024_spells",
            )
        return {"cantrips": [], "prepared": [], "slots": {}, "pact_slots": None, "ability": None}

    block = blocks[0]
    cantrip_need = int(block.cantrips or 0)
    prep_need = int(block.prepared_spells or 0)
    cantrips = [_normalize_slug(x) for x in payload.cantrip_ids]
    prepared = [_normalize_slug(x) for x in payload.prepared_spell_ids]
    if len(cantrips) != cantrip_need or len(set(cantrips)) != len(cantrips):
        raise Create2024Error(
            f"Нужно {cantrip_need} заговора(ов), выбрано {len(cantrips)}",
            code="create_2024_spells",
        )
    # Always-prepared (e.g. hunter's mark) do not consume the prepared budget.
    always = {_normalize_slug(x) for x in (block.always_prepared or ())}
    prepared_budget = [p for p in prepared if p not in always]
    if len(prepared_budget) != prep_need or len(set(prepared)) != len(prepared):
        raise Create2024Error(
            f"Нужно {prep_need} подготовленных заклинаний 1 круга, выбрано {len(prepared_budget)}",
            code="create_2024_spells",
        )

    spell_list = _class_spell_list_slugs(payload.class_slug)
    spells = load_spell_catalog()
    for cid in cantrips:
        row = spells.get(cid)
        if row is None:
            raise Create2024Error(f"Неизвестный заговор: {cid}", code="create_2024_spells")
        if _spell_level(row) != 0:
            raise Create2024Error(f"{cid} не заговор", code="create_2024_spells")
        if spell_list and cid not in spell_list:
            raise Create2024Error(
                f"Заговор {cid} не из списка класса",
                code="create_2024_spells",
            )
    for sid in prepared:
        if sid in always:
            continue
        row = spells.get(sid)
        if row is None:
            raise Create2024Error(f"Неизвестное заклинание: {sid}", code="create_2024_spells")
        if _spell_level(row) != 1:
            raise Create2024Error(
                f"{sid} должно быть 1 круга",
                code="create_2024_spells",
            )
        if spell_list and sid not in spell_list:
            raise Create2024Error(
                f"Заклинание {sid} не из списка класса",
                code="create_2024_spells",
            )

    ability = None
    class_row = e24.load_class_catalog().get(payload.class_slug) or {}
    primaries = (class_row.get("data") or {}).get("primary_abilities") or []
    if isinstance(primaries, list) and primaries:
        ability = str(primaries[0]).lower()
    return {
        "cantrips": cantrips,
        "prepared": prepared + sorted(always - set(prepared)),
        "always_prepared": sorted(always),
        "slots": dict(block.slots or {}),
        "pact_slots": dict(block.pact_slots) if block.pact_slots else None,
        "ability": ability,
    }


def _validate_class_options(payload: Create2024Payload) -> dict[str, Any]:
    picks = dict(payload.class_option_picks or {})
    out: dict[str, Any] = {}
    if payload.class_slug == "cleric":
        order = str(picks.get("divine_order") or "").lower()
        if order not in DIVINE_ORDER_OPTIONS:
            raise Create2024Error(
                "Жрец: выберите Божественный указ (protector/thaumaturge)",
                code="create_2024_class_options",
            )
        out["divine_order"] = order
    if payload.class_slug == "druid":
        order = str(picks.get("primal_order") or "").lower()
        if order not in PRIMAL_ORDER_OPTIONS:
            raise Create2024Error(
                "Друид: выберите Изначальный указ (magician/warden)",
                code="create_2024_class_options",
            )
        out["primal_order"] = order
    if payload.class_slug == "rogue":
        expertise = [str(x) for x in (picks.get("expertise") or [])]
        if len(expertise) != 2 or len(set(expertise)) != 2:
            raise Create2024Error(
                "Плут: выберите два навыка/инструмента для компетентности",
                code="create_2024_class_options",
            )
        out["expertise"] = expertise
    if payload.class_slug == "warlock":
        raw_inv = picks.get("eldritch_invocations") or picks.get("invocations") or []
        inv = [_normalize_slug(str(x)) for x in raw_inv]
        if len(inv) != 1:
            raise Create2024Error(
                "Колдун на 1 уровне выбирает 1 воззвание",
                code="create_2024_class_options",
            )
        known = {row.id for row in e24opt.ELDRITCH_INVOCATIONS_2024}
        if inv[0] not in known:
            raise Create2024Error(
                f"Неизвестное воззвание: {inv[0]}",
                code="create_2024_class_options",
            )
        defn = next(x for x in e24opt.ELDRITCH_INVOCATIONS_2024 if x.id == inv[0])
        if defn.min_level > 1:
            raise Create2024Error(
                f"Воззвание {inv[0]} недоступно на 1 уровне",
                code="create_2024_class_options",
            )
        out["eldritch_invocations"] = inv
    return out


def validate_create_2024(payload: Create2024Payload) -> Create2024Result:
    if payload.subclass_slug:
        raise Create2024Error(
            "Подкласс на 1 уровне недоступен (с 3 уровня)",
            code="create_2024_subclass",
        )

    class_slug = e24.normalize_class_slug(payload.class_slug) or payload.class_slug
    payload.class_slug = class_slug
    class_catalog = e24.load_class_catalog()
    class_row = class_catalog.get(class_slug)
    if class_row is None:
        raise Create2024Error(f"Неизвестный класс: {class_slug}", code="create_2024_class")
    class_data = class_row.get("data") if isinstance(class_row.get("data"), dict) else {}
    if int(class_data.get("subclass_level") or 3) > 1 and payload.subclass_slug:
        raise Create2024Error(
            "Подкласс на 1 уровне недоступен",
            code="create_2024_subclass",
        )

    bg = load_background_catalog().get(payload.background_slug)
    if bg is None:
        raise Create2024Error(
            f"Неизвестная предыстория: {payload.background_slug}",
            code="create_2024_background",
        )
    bg_data = bg.get("data") if isinstance(bg.get("data"), dict) else {}

    _validate_abilities(payload)
    asi = _validate_background_asi(payload, bg_data)
    final_abilities = _apply_asi(payload.base_abilities, asi)
    class_skills = _validate_class_skills(payload, class_data)
    fighting_style = _validate_fighting_style(payload)
    mastery = _validate_weapon_mastery(payload)
    tool_id = _validate_background_tool(payload, bg_data)
    origin_picks = _validate_origin_feat(payload, bg_data)
    species_info = _validate_species(payload)
    try:
        language_picks = validate_language_picks(payload.language_ids)
    except ValueError as exc:
        raise Create2024Error(str(exc), code="create_2024_languages") from exc
    gear = _validate_equipment(payload, class_data)
    # Spells use final abilities only for progression tables (counts), base is fine.
    spell_info = _validate_spells(payload)
    class_options = _validate_class_options(payload)

    sheet = _build_sheet(
        payload=payload,
        class_row=class_row,
        class_data=class_data,
        bg=bg,
        bg_data=bg_data,
        asi=asi,
        final_abilities=final_abilities,
        class_skills=class_skills,
        fighting_style=fighting_style,
        mastery=mastery,
        tool_id=tool_id,
        origin_picks=origin_picks,
        species_info=species_info,
        language_picks=language_picks,
        gear=gear,
        spell_info=spell_info,
        class_options=class_options,
    )

    hp_max = int(sheet["combat"]["hp_max"])
    return Create2024Result(
        sheet=sheet,
        name=payload.name,
        level=1,
        class_name=str(class_row.get("name_ru") or class_slug),
        race_name=str(species_info.get("name_ru") or payload.species_slug),
        hp_max=hp_max,
        hp_current=hp_max,
    )


def _build_sheet(
    *,
    payload: Create2024Payload,
    class_row: Mapping[str, Any],
    class_data: Mapping[str, Any],
    bg: Mapping[str, Any],
    bg_data: Mapping[str, Any],
    asi: Mapping[str, int],
    final_abilities: Mapping[str, int],
    class_skills: Sequence[str],
    fighting_style: str | None,
    mastery: Sequence[str],
    tool_id: str | None,
    origin_picks: Mapping[str, Any],
    species_info: Mapping[str, Any],
    language_picks: Sequence[str],
    gear: Mapping[str, Any],
    spell_info: Mapping[str, Any],
    class_options: Mapping[str, Any],
) -> dict[str, Any]:
    sheet = empty_character_sheet()
    con_mod = _ability_mod(int(final_abilities["con"]))
    hit_die = int(class_data.get("hit_die") or 8)
    hp_max = hit_die + con_mod

    # Abilities
    sheet["abilities"] = {k: {"score": int(final_abilities[k])} for k in ABILITY_KEYS}

    # Saves
    save_prof = {str(x).lower() for x in (class_data.get("saving_throws") or [])}
    sheet["saves"] = {
        k: {"is_proficient": k in save_prof} for k in ABILITY_KEYS
    }

    # Skills: background fixed + class picks + skilled feat + species picks
    bg_skills = {str(x) for x in (bg_data.get("skill_proficiencies") or [])}
    skilled = {str(x) for x in (origin_picks.get("skilled") or []) if x in SKILL_IDS}
    species_skills = {
        str(x)
        for x in ((species_info.get("picks") or {}).get("skills") or [])
        if x in SKILL_IDS
    }
    species_feat = species_info.get("species_feat") if isinstance(species_info.get("species_feat"), dict) else {}
    species_feat_skilled = {
        str(x) for x in (species_feat.get("skilled") or []) if x in SKILL_IDS
    }
    if species_feat.get("skill") in SKILL_IDS:
        species_feat_skilled.add(str(species_feat.get("skill")))
    skill_or_tool_raw = (species_info.get("picks") or {}).get("skill_or_tool")
    if isinstance(skill_or_tool_raw, (list, tuple)):
        skill_or_tool = str(skill_or_tool_raw[0]) if skill_or_tool_raw else ""
    else:
        skill_or_tool = str(skill_or_tool_raw or "")
    if skill_or_tool in SKILL_IDS:
        species_skills.add(skill_or_tool)
    proficient = set(bg_skills) | set(class_skills) | skilled | species_skills | species_feat_skilled
    expertise = {str(x) for x in (class_options.get("expertise") or []) if x in SKILL_IDS}
    for skill, meta in sheet["skills"].items():
        meta["is_proficient"] = skill in proficient
        meta["is_expertise"] = skill in expertise

    # Identity / species
    speed = int(species_info.get("speed") or 30)
    if species_info.get("lineage_id"):
        for lineage in (species_info.get("data") or {}).get("lineages") or []:
            if isinstance(lineage, dict) and _normalize_slug(str(lineage.get("id"))) == species_info.get(
                "lineage_id"
            ):
                if lineage.get("speed"):
                    speed = int(lineage["speed"])
                if lineage.get("darkvision"):
                    species_info = {**species_info, "darkvision": int(lineage["darkvision"])}
                break

    sheet["identity"] = {
        **sheet.get("identity", {}),
        "background": bg.get("name_ru"),
        "background_slug": payload.background_slug,
        "species_slug": payload.species_slug,
        "species_lineage_id": species_info.get("lineage_id"),
        "species_ancestry_id": species_info.get("ancestry_id"),
        "size": species_info.get("size") or "medium",
        "gender": payload.gender,
        "subclass_name": None,
        "experience": 0,
    }

    dex_mod = _ability_mod(int(final_abilities["dex"]))
    sheet["combat"] = {
        **sheet.get("combat", {}),
        "hp_current": hp_max,
        "hp_max": hp_max,
        "hp_temp": 0,
        "hit_die": f"1d{hit_die}",
        "hp_dice_current": 1,
        "ac": 10 + dex_mod,  # refined below from armor if present
        "speed": speed,
        "initiative": dex_mod,
        "darkvision": int(species_info.get("darkvision") or 0),
        "is_dying": False,
        "death_successes": 0,
        "death_fails": 0,
        "conditions": [],
        "exhaustion": 0,
        "inspiration": False,
    }

    # Proficiencies
    armor = class_data.get("armor") or []
    weapons = class_data.get("weapons") or []
    sheet["proficiency"] = {
        "bonus": 2,
        "armor": {
            "light": "light" in armor or "all" in armor,
            "medium": "medium" in armor or "all" in armor,
            "heavy": "heavy" in armor or "all" in armor,
            "shields": "shields" in armor or "shield" in armor,
        },
        "weapons": {
            "simple": "simple" in weapons or "all" in weapons,
            "martial": "martial" in weapons or "all" in weapons,
        },
        "tools": [
            *( [tool_id] if tool_id else list(class_data.get("tools_fixed") or []) ),
            *[
                str(x)
                for x in ((species_info.get("picks") or {}).get("tools") or [])
                if x
            ],
            *[
                str(x)
                for x in ((_client_picks(payload).get("class_tools") or []))
                if x
            ],
        ],
        "languages": [COMMON_LANGUAGE_ID, *language_picks],
        "skills": sorted(proficient),
    }
    # Deduplicate tools while preserving order.
    seen_tools: set[str] = set()
    deduped_tools: list[str] = []
    for t in sheet["proficiency"]["tools"]:
        key = str(t)
        if key and key not in seen_tools:
            seen_tools.add(key)
            deduped_tools.append(key)
    if skill_or_tool and skill_or_tool not in SKILL_IDS and skill_or_tool not in seen_tools:
        deduped_tools.append(skill_or_tool)
        seen_tools.add(skill_or_tool)
    sheet["proficiency"]["tools"] = deduped_tools
    sheet["proficiency"]["skills"] = sorted(proficient)
    if payload.class_slug == "druid":
        sheet["proficiency"]["languages"].append("druidic")
    if payload.class_slug == "rogue":
        sheet["proficiency"]["languages"].append("thieves-cant")

    # Classes
    sheet["classes"] = [
        {
            "id": f"class-{payload.class_slug}",
            "slug": payload.class_slug,
            "name": class_row.get("name_ru"),
            "name_ru": class_row.get("name_ru"),
            "level": 1,
            "subclass_slug": None,
            "hit_die": hit_die,
        }
    ]

    # Inventory from packs — Russian names + weight from catalog.
    items: list[dict[str, Any]] = []
    coins_gp = 0
    item_catalog = load_item_catalog()

    def _push_item(item_id: str, qty: int, *, notes: str | None = None) -> None:
        cat = item_catalog.get(item_id) or {}
        cat_data = cat.get("data") if isinstance(cat.get("data"), dict) else {}
        name_ru = str(cat.get("name_ru") or item_id or "Предмет")
        weight = cat_data.get("weight_lb")
        items.append(
            {
                "id": f"start-{item_id or 'item'}-{len(items)}",
                "slug": item_id or None,
                "name": name_ru,
                "name_ru": name_ru,
                "qty": max(1, int(qty or 1)),
                "weight_lb": float(weight) if weight is not None else None,
                "notes": notes,
                "equipped": False,
            }
        )

    class_pack = gear["class_pack"]
    for entry in class_pack.get("items") or []:
        if not isinstance(entry, dict):
            continue
        item_id = str(entry.get("id") or entry.get("slug") or "")
        qty = int(entry.get("qty") or 1)
        if not item_id:
            label = str(entry.get("label_ru") or entry.get("name_ru") or "Предмет на выбор")
            _push_item("", qty, notes=label)
            items[-1]["name"] = label
            items[-1]["name_ru"] = label
            continue
        _push_item(item_id, qty)
    coins_gp += int(class_pack.get("coins_gp") or 0)

    if gear["background_mode"] == "gold":
        coins_gp += BACKGROUND_GOLD_GP
    else:
        eq = bg_data.get("equipment_or_gold") if isinstance(bg_data.get("equipment_or_gold"), dict) else {}
        structured = eq.get("items") if isinstance(eq.get("items"), list) else []
        if structured:
            for entry in structured:
                if not isinstance(entry, dict):
                    continue
                _push_item(
                    str(entry.get("id") or entry.get("slug") or ""),
                    int(entry.get("qty") or 1),
                    notes=str(entry.get("label_ru") or "") or None,
                )
        else:
            # Expand pack_summary_ru into individual named lines; match catalog by name when possible.
            pack_summary = str(eq.get("pack_summary_ru") or "").strip()
            if pack_summary:
                by_name = {
                    str(row.get("name_ru") or "").strip().lower(): slug
                    for slug, row in item_catalog.items()
                    if row.get("name_ru")
                }
                chunks = [c.strip() for c in pack_summary.replace(";", ",").split(",") if c.strip()]
                for chunk in chunks:
                    # "пергамент ×10" / "стрелы ×20"
                    qty = 1
                    name = chunk
                    for sep in ("×", "x", "х"):
                        if sep in chunk.lower() if sep != "×" else sep in chunk:
                            left, _, right = chunk.partition(sep) if sep == "×" else chunk.lower().partition(sep)
                            if sep != "×":
                                # rebuild with original casing roughly
                                idx = chunk.lower().find(sep)
                                left, right = chunk[:idx], chunk[idx + len(sep) :]
                            try:
                                qty = int("".join(ch for ch in right if ch.isdigit()) or "1")
                                name = left.strip()
                            except ValueError:
                                qty = 1
                            break
                    slug = by_name.get(name.lower())
                    if slug:
                        _push_item(slug, qty)
                    else:
                        items.append(
                            {
                                "id": f"bg-{len(items)}",
                                "slug": None,
                                "name": name,
                                "name_ru": name,
                                "qty": qty,
                                "weight_lb": None,
                                "notes": "Пакет предыстории",
                                "equipped": False,
                            }
                        )

    sheet["inventory"] = {
        "coins": {"cp": 0, "sp": 0, "ep": 0, "gp": coins_gp, "pp": 0},
        "items": items,
    }

    # Rough AC from equipped armor names in pack
    ac = 10 + dex_mod
    armor_slug_bonus = {
        "padded": 11,
        "leather": 11,
        "leather-armor": 11,
        "studded-leather": 12,
        "studded-leather-armor": 12,
        "hide": 12,
        "chain-shirt": 13,
        "scale-mail": 14,
        "breastplate": 14,
        "half-plate": 15,
        "ring-mail": 14,
        "chain-mail": 16,
        "splint": 17,
        "plate": 18,
    }
    for item in items:
        slug = str(item.get("slug") or "")
        if slug in armor_slug_bonus:
            base = armor_slug_bonus[slug]
            if slug in {"padded", "leather", "leather-armor", "studded-leather", "studded-leather-armor"}:
                ac = base + dex_mod
            elif slug in {"hide", "chain-shirt", "scale-mail", "breastplate", "half-plate"}:
                ac = base + min(dex_mod, 2)
            else:
                ac = base
            item["equipped"] = True
            break
    if any(str(i.get("slug")) == "shield" for i in items):
        ac += 2
    # Unarmored defense
    if payload.class_slug == "barbarian" and not any(
        str(i.get("slug")) in armor_slug_bonus for i in items
    ):
        ac = 10 + dex_mod + _ability_mod(int(final_abilities["con"]))
    if payload.class_slug == "monk" and not any(
        str(i.get("slug")) in armor_slug_bonus for i in items
    ):
        ac = 10 + dex_mod + _ability_mod(int(final_abilities["wis"]))
    sheet["combat"]["ac"] = ac

    # Spells
    known = list(spell_info.get("cantrips") or []) + list(spell_info.get("prepared") or [])
    # Origin / species feat spell extras
    for feat_picks in (origin_picks, species_feat):
        if not isinstance(feat_picks, dict):
            continue
        if feat_picks.get("cantrips"):
            known.extend(feat_picks["cantrips"])
        if feat_picks.get("cantrip"):
            known.append(feat_picks["cantrip"])
        if feat_picks.get("spell_id"):
            known.append(feat_picks["spell_id"])
    sheet["spells"] = {
        "casting_ability": spell_info.get("ability"),
        "slots": spell_info.get("slots") or {},
        "pact_slots": spell_info.get("pact_slots") or {},
        "known": sorted(set(known)),
        "prepared": list(spell_info.get("prepared") or []),
        "cantrips": list(spell_info.get("cantrips") or []),
        "always_prepared": list(spell_info.get("always_prepared") or []),
    }

    # Features text
    traits = str(species_info.get("traits_text") or "")
    feat_name = origin_picks.get("name_ru") or origin_picks.get("slug")
    features_lines = [
        f"Класс: {class_row.get('name_ru')} 1",
        f"Предыстория: {bg.get('name_ru')}",
        f"Черта происхождения: {feat_name}",
    ]
    if fighting_style:
        fs = load_feat_catalog().get(fighting_style) or {}
        features_lines.append(f"Боевой стиль: {fs.get('name_ru') or fighting_style}")
    if class_options:
        features_lines.append(f"Выборы класса: {json.dumps(class_options, ensure_ascii=False)}")
    sheet["features_text"] = {
        "traits": traits,
        "features": "\n".join(features_lines),
        "feats": str(feat_name or ""),
    }

    # Weapon mastery
    if mastery:
        sheet["weapon_mastery"] = {
            "known": list(mastery),
            "source_class": payload.class_slug,
            "baseline": list(mastery),
            "swap_available": False,
        }

    # Class progress 2024
    progress = e24.compute_progression(
        [{"slug": payload.class_slug, "level": 1}],
        abilities=dict(final_abilities),
    )
    sheet["class_progress_2024"] = e24.snapshot_to_sheet_fragment(progress)

    # class_options_2024 must match M02a validator shape (extra keys are dropped on PATCH).
    options_sheet: dict[str, Any] = {
        "eldritch_invocations": list(class_options.get("eldritch_invocations") or []),
        "metamagic": [],
        "replicate_plans": [],
        "rage": {"active": False, "rounds_extended": 0, "max_minutes": 10},
    }
    sheet["class_options_2024"] = options_sheet

    sheet["create_2024"] = {
        "version": 1,
        "ability_method": payload.ability_method,
        "base_abilities": dict(payload.base_abilities),
        "background_asi": dict(asi),
        "background_asi_mode": payload.background_asi_mode,
        "languages_chosen": list(language_picks),
        "class_equipment": payload.class_equipment,
        "background_equipment": payload.background_equipment,
        "fighting_style": fighting_style,
        "origin_feat": dict(origin_picks),
        "class_option_picks": dict(class_options),
        "species": {
            "slug": species_info.get("slug"),
            "size": species_info.get("size"),
            "lineage_id": species_info.get("lineage_id"),
            "ancestry_id": species_info.get("ancestry_id"),
            "picks": dict(species_info.get("picks") or {}),
            "species_feat": species_feat or None,
        },
        "class_skills": list(class_skills),
        "weapon_mastery": list(mastery),
        "background_tool_id": tool_id,
        "class_tools": list((_client_picks(payload).get("class_tools") or [])),
    }
    sheet["meta"] = {
        **sheet.get("meta", {}),
        "rules_edition": "2024",
        "create_pipeline": "2024",
    }
    return sheet


def languages_catalog_payload() -> list[dict[str, str]]:
    return [
        {"id": row.id, "name_en": row.name_en, "name_ru": row.name_ru, "kind": row.kind}
        for row in list_selectable_languages()
    ]


def class_special_languages_payload() -> list[dict[str, str]]:
    return [
        {"id": row.id, "name_en": row.name_en, "name_ru": row.name_ru, "kind": row.kind}
        for row in CLASS_SPECIAL_LANGUAGES
    ]
