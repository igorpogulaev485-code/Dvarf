"""P24-M03 / M03c: validate and materialize a 2024 character (level 1+ with multiclass).

2014 create path is untouched. This module is the server source of truth for the
2024 wizard finalize payload.

NOTES (wizard spellbook, for the M02 sheet UI):
- Create persists 2014-shaped data: ``sheet.spells.known`` rows are SheetSpell objects
  (``in_spellbook``, ``spellbook_acquisition='starting'``, ``prepared``) and
  ``sheet.spells.wizard_spellbook`` binds the pack's «Книга заклинаний» inventory item.
- Level-up (+2 book spells per wizard level) is queued on the client from
  ``freeBookSlotsAtLevel``; the server does not validate it here.
- Gap: the 2024 Play Desk has no dedicated book-editing surface yet — it reuses the 2014
  grimoire / prepare dialogs, which read the shape above.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping, Sequence

from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_class_options as e24opt
from app.dnd import edition_2024_subclasses as e24sub
from app.dnd import weapon_mastery as wm
from app.dnd.edition_2024_languages import (
    COMMON_LANGUAGE_ID,
    CLASS_SPECIAL_LANGUAGES,
    language_name_ru,
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
# Paladin / Ranger gain Fighting Style at class level 2+.
FIGHTING_STYLE_AT_L2 = frozenset({"paladin", "ranger"})
BLESSED_WARRIOR_STYLE_SLUG = "blessed-warrior"
BLESSED_WARRIOR_CANTRIPS_KEY = "blessed_warrior_cantrips"
BLESSED_WARRIOR_CANTRIP_COUNT = 2
BLESSED_WARRIOR_NAME_RU = "Благословенный воин"
DRUIDIC_WARRIOR_STYLE_SLUG = "druidic-warrior"
DRUIDIC_WARRIOR_CANTRIPS_KEY = "druidic_warrior_cantrips"
DRUIDIC_WARRIOR_CANTRIP_COUNT = 2
DRUIDIC_WARRIOR_NAME_RU = "Воин-друид"

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

# Mirrors frontend TOOL_NAME_FALLBACK_RU (create2024Labels.ts) for ids the item catalog lacks.
TOOL_NAME_FALLBACK_RU: dict[str, str] = {
    "dice-set": "Набор игральных костей",
    "dragonchess-set": "Набор драконьих шахмат",
    "playing-card-set": "Набор игральных карт",
    "three-dragon-ante-set": "Набор «Ставка трёх драконов»",
    "gaming-set": "Игровой набор",
    "musical-instrument": "Музыкальный инструмент",
}

WIZARD_CLASS_SLUG = "wizard"
WIZARD_BOOK_SPELLS_AT_L1 = 6
SPELLBOOK_ITEM_NAME_RU = "Книга заклинаний"
# School Savant free-book totals (PHB + AU). Bladesinger is not a school Savant.
WIZARD_SAVANT_SUBCLASS_SLUGS = frozenset(
    {
        "wizard__abjurer",
        "wizard__diviner",
        "wizard__evoker",
        "wizard__illusionist",
        "wizard__conjurer",
        "wizard__enchanter",
        "wizard__necromancer",
        "wizard__transmuter",
    }
)
# Full-caster levels that open a new slot tier (same as FE NEW_SLOT_TIER_BY_WIZARD_LEVEL).
_WIZARD_NEW_SLOT_TIER_LEVELS = frozenset({1, 3, 5, 7, 9, 11, 13, 15, 17})
ENCHANTER_ORATOR_SKILLS_2024 = frozenset({"intimidation", "deception", "persuasion"})
BLADESINGER_WAR_SONG_SKILLS_2024 = frozenset(
    {"acrobatics", "athletics", "performance", "persuasion"}
)
TRANSMUTER_STONE_BENEFITS_2024 = frozenset(
    {
        "darkvision",
        "speed",
        "resist_acid",
        "resist_cold",
        "resist_fire",
        "resist_lightning",
        "resist_thunder",
        "resist_poison",
    }
)
TRANSMUTER_STONE_BENEFITS_2_2024 = TRANSMUTER_STONE_BENEFITS_2024 | frozenset(
    {"mighty_build", "tremorsense"}
)


def _savant_free_book_total_through_level(wizard_lv: int, subclass_slug: str | None) -> int:
    slug = (subclass_slug or "").strip().lower()
    if wizard_lv < 3 or slug not in WIZARD_SAVANT_SUBCLASS_SLUGS:
        return 0
    total = 2  # two ≤2nd-circle school spells when the subclass is taken
    for lv in range(4, wizard_lv + 1):
        if lv in _WIZARD_NEW_SLOT_TIER_LEVELS:
            total += 1
    return total


def wizard_create_book_need_2024(wizard_lv: int, subclass_slug: str | None) -> int:
    """Create-at / leveling book quota: free research + Savant free school spells."""
    level = max(1, int(wizard_lv or 1))
    free = WIZARD_BOOK_SPELLS_AT_L1 + max(0, level - 1) * 2
    return free + _savant_free_book_total_through_level(level, subclass_slug)


def trim_wizard_book_picks_on_level_down_2024(
    values: Mapping[str, Any],
    class_entry_id: str,
    new_wizard_level: int,
) -> dict[str, Any]:
    """Mirror FE trimWizardBookPicksOnLevelDown2024 for orator / war-song / stone picks."""
    level = max(0, int(new_wizard_level or 0))
    out = dict(values or {})
    prefix = f"{class_entry_id}:"

    def drop(*keys: str) -> None:
        for key in keys:
            out.pop(f"{prefix}{key}", None)

    if level < 3:
        drop(
            "enchanting-conversationalist",
            "enchanting_conversationalist",
            "training-in-war-and-song",
            "training_in_war_and_song",
            "transmuter_stone_benefit",
            "transmuter-s-stone",
            "transmuters_stone",
        )
    if level < 10:
        drop("transmuter_stone_benefit_2")
    return out

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
    spellbook_spell_ids: list[str] = field(default_factory=list)
    class_option_picks: dict[str, Any] = field(default_factory=dict)
    gender: str | None = None
    is_draft: bool = False
    is_preview: bool = False
    subclass_slug: str | None = None  # L1 must stay empty; higher levels use class_levels / gains
    # P24-M03c: optional create-at-N plan (None → level 1 only, backward compatible).
    class_levels: list[dict[str, Any]] | None = None
    hp_choices: list[dict[str, Any]] = field(default_factory=list)
    asi_choices: list[dict[str, Any]] = field(default_factory=list)
    level_gains: list[dict[str, Any]] = field(default_factory=list)
    spells_by_class: dict[str, Any] = field(default_factory=dict)


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


LIGHT_MARTIAL_MELEE_RU = "Воинское рукопашное оружие со свойством «лёгкое»"
BLADESINGER_MARTIAL_MELEE_RU = (
    "Воинское рукопашное оружие без свойств «Двуручное» и «Тяжёлое»"
)


def _weapons_proficiency_from_class_data(weapons_raw: Any) -> dict[str, Any]:
    """Parse class ``weapons`` (dict with simple/martial/extras or legacy list).

    Important: for dict catalogs, ``\"martial\" in weapons`` is True even when
    ``martial: false`` — never use bare ``in`` on the dict keys.
    """
    simple = False
    martial = False
    extras: list[str] = []

    def _push_extra(token: str) -> None:
        key = token.strip().lower().replace("-", "_").replace(" ", "_")
        if not key:
            return
        if key in {"light_martial_melee", "light_martial"}:
            label = LIGHT_MARTIAL_MELEE_RU
        else:
            label = token.strip()
        if label and label not in extras:
            extras.append(label)

    if isinstance(weapons_raw, Mapping):
        simple = bool(weapons_raw.get("simple"))
        martial = bool(weapons_raw.get("martial"))
        raw_extras = weapons_raw.get("extras") or []
        if isinstance(raw_extras, (list, tuple)):
            for item in raw_extras:
                _push_extra(str(item))
    elif isinstance(weapons_raw, (list, tuple)):
        for item in weapons_raw:
            token = str(item).strip().lower().replace("-", "_").replace(" ", "_")
            if token in {"simple", "all"}:
                simple = True
            elif token == "martial":
                martial = True
            elif token:
                _push_extra(token)
    return {"simple": simple, "martial": martial, "extras": extras}


def _ability_mod(score: int) -> int:
    return (int(score) - 10) // 2


def _require_mapping(value: Mapping[str, Any] | None, label: str) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise Create2024Error(f"{label} обязателен", code="create_2024_missing")
    return dict(value)


def _ru_plural(n: int, one: str, few: str, many: str) -> str:
    """Russian noun form after a number: 1 заговор / 2–4 заговора / 5+ заговоров."""
    n = abs(int(n))
    if 11 <= n % 100 <= 14:
        return many
    last = n % 10
    if last == 1:
        return one
    if 2 <= last <= 4:
        return few
    return many


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
        spellbook_spell_ids=[str(x) for x in (raw.get("spellbook_spell_ids") or [])],
        class_option_picks=dict(raw.get("class_option_picks") or {}),
        gender=str(raw.get("gender")).strip() if raw.get("gender") else None,
        is_draft=bool(raw.get("is_draft") or False),
        is_preview=bool(raw.get("is_preview") or False),
        subclass_slug=(
            _normalize_slug(str(raw.get("subclass_slug")))
            if raw.get("subclass_slug")
            else None
        ),
        class_levels=(
            [dict(x) for x in raw.get("class_levels") if isinstance(x, Mapping)]
            if isinstance(raw.get("class_levels"), list)
            else None
        ),
        hp_choices=(
            [dict(x) for x in raw.get("hp_choices") if isinstance(x, Mapping)]
            if isinstance(raw.get("hp_choices"), list)
            else []
        ),
        asi_choices=(
            [dict(x) for x in raw.get("asi_choices") if isinstance(x, Mapping)]
            if isinstance(raw.get("asi_choices"), list)
            else []
        ),
        level_gains=(
            [dict(x) for x in raw.get("level_gains") if isinstance(x, Mapping)]
            if isinstance(raw.get("level_gains"), list)
            else []
        ),
        spells_by_class=(
            dict(raw.get("spells_by_class") or {})
            if isinstance(raw.get("spells_by_class"), Mapping)
            else {}
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
    class_level = _planned_class_level(payload, slug)
    known = fighting_style_feat_slugs()

    def _accept(style: str) -> str:
        norm = style.strip().lower().replace("_", "-")
        if norm == BLESSED_WARRIOR_STYLE_SLUG:
            if slug != "paladin":
                raise Create2024Error(
                    "«Благословенный воин» доступен только паладину",
                    code="create_2024_fighting_style",
                )
            return BLESSED_WARRIOR_STYLE_SLUG
        if norm == DRUIDIC_WARRIOR_STYLE_SLUG:
            if slug != "ranger":
                raise Create2024Error(
                    "«Воин-друид» доступен только следопыту",
                    code="create_2024_fighting_style",
                )
            return DRUIDIC_WARRIOR_STYLE_SLUG
        if style not in known:
            raise Create2024Error(
                f"Неизвестный боевой стиль: {style}",
                code="create_2024_fighting_style",
            )
        return style

    if slug in FIGHTING_STYLE_AT_L1:
        if not payload.fighting_style_slug:
            raise Create2024Error(
                "На 1 уровне воину нужен боевой стиль",
                code="create_2024_fighting_style",
            )
        return _accept(payload.fighting_style_slug)
    if slug in FIGHTING_STYLE_AT_L2:
        if class_level >= 2:
            if not payload.fighting_style_slug:
                raise Create2024Error(
                    "С 2 уровня нужен боевой стиль",
                    code="create_2024_fighting_style",
                )
            return _accept(payload.fighting_style_slug)
        if payload.fighting_style_slug:
            # Optional pre-pick at L1 create; still validate the slug.
            return _accept(payload.fighting_style_slug)
        return None
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


@lru_cache(maxsize=1)
def cleric_cantrip_slugs_2024() -> frozenset[str]:
    """PHB/SRD 2024 Cleric cantrips (level 0 on the cleric list)."""
    out: set[str] = set()
    for slug in _class_spell_list_slugs("cleric"):
        row = load_spell_catalog().get(slug) or {}
        if _spell_level(row) == 0:
            out.add(slug)
    return frozenset(out)


@lru_cache(maxsize=1)
def druid_cantrip_slugs_2024() -> frozenset[str]:
    """PHB/SRD 2024 Druid cantrips (level 0 on the druid list)."""
    out: set[str] = set()
    for slug in _class_spell_list_slugs("druid"):
        row = load_spell_catalog().get(slug) or {}
        if _spell_level(row) == 0:
            out.add(slug)
    return frozenset(out)


def _validate_blessed_warrior_cantrips(raw: Any) -> list[str]:
    """Exactly two distinct Cleric cantrip slugs for Blessed Warrior."""
    if not isinstance(raw, list):
        raise Create2024Error(
            f"{BLESSED_WARRIOR_NAME_RU}: выберите {BLESSED_WARRIOR_CANTRIP_COUNT} заговора жреца",
            code="create_2024_class_options",
        )
    picks = [_normalize_slug(str(x)) for x in raw if str(x).strip()]
    if len(picks) != BLESSED_WARRIOR_CANTRIP_COUNT or len(set(picks)) != BLESSED_WARRIOR_CANTRIP_COUNT:
        raise Create2024Error(
            f"{BLESSED_WARRIOR_NAME_RU}: выберите ровно {BLESSED_WARRIOR_CANTRIP_COUNT} разных заговора жреца",
            code="create_2024_class_options",
        )
    allowed = cleric_cantrip_slugs_2024()
    for slug in picks:
        if slug not in allowed:
            raise Create2024Error(
                f"{BLESSED_WARRIOR_NAME_RU}: «{slug}» не заговор жреца 2024",
                code="create_2024_class_options",
            )
    return picks


def _validate_druidic_warrior_cantrips(raw: Any) -> list[str]:
    """Exactly two distinct Druid cantrip slugs for Druidic Warrior."""
    if not isinstance(raw, list):
        raise Create2024Error(
            f"{DRUIDIC_WARRIOR_NAME_RU}: выберите {DRUIDIC_WARRIOR_CANTRIP_COUNT} заговора друида",
            code="create_2024_class_options",
        )
    picks = [_normalize_slug(str(x)) for x in raw if str(x).strip()]
    if len(picks) != DRUIDIC_WARRIOR_CANTRIP_COUNT or len(set(picks)) != DRUIDIC_WARRIOR_CANTRIP_COUNT:
        raise Create2024Error(
            f"{DRUIDIC_WARRIOR_NAME_RU}: выберите ровно {DRUIDIC_WARRIOR_CANTRIP_COUNT} "
            "разных заговора друида",
            code="create_2024_class_options",
        )
    allowed = druid_cantrip_slugs_2024()
    for slug in picks:
        if slug not in allowed:
            raise Create2024Error(
                f"{DRUIDIC_WARRIOR_NAME_RU}: «{slug}» не заговор друида 2024",
                code="create_2024_class_options",
            )
    return picks


def _validate_paladin_options_2024(
    payload: Create2024Payload,
    picks: Mapping[str, Any],
    *,
    fighting_style: str | None,
) -> dict[str, Any]:
    """Keep Blessed Warrior cantrips when the style is chosen; drop them otherwise."""
    out: dict[str, Any] = {}
    style = (fighting_style or payload.fighting_style_slug or "").strip().lower().replace("_", "-")
    raw_cantrips = picks.get(BLESSED_WARRIOR_CANTRIPS_KEY) or picks.get("blessed-warrior-cantrips")
    if style == BLESSED_WARRIOR_STYLE_SLUG:
        out[BLESSED_WARRIOR_CANTRIPS_KEY] = _validate_blessed_warrior_cantrips(raw_cantrips)
    elif raw_cantrips:
        # Stale picks from a previous UI choice — ignore rather than fail.
        pass
    return out


STUDENT_OF_ARCANA_SKILLS_2024 = {
    "history",
    "insight",
    "medicine",
    "persuasion",
    "religion",
    "arcana",
}
STUDENT_OF_ARCANA_CANTRIPS_2024 = {
    "mage-hand",
    "prestidigitation",
    "light",
    "minor-illusion",
    "ray-of-frost",
    "fire-bolt",
    "shocking-grasp",
    "blade-ward",
    "friends",
    "message",
    "mending",
    "dancing-lights",
    "acid-splash",
    "poison-spray",
    "true-strike",
}
BLESSINGS_OF_KNOWLEDGE_SKILLS_2024 = {"history", "nature", "religion", "arcana"}
BLESSINGS_OF_KNOWLEDGE_TOOLS_2024 = {
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
}
MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024 = {
    6: {"disintegrate", "globe-of-invulnerability", "mass-suggestion", "true-seeing", "chain-lightning"},
    7: {"teleport", "finger-of-death", "forcecage", "plane-shift", "etherealness"},
    8: {"dominate-monster", "maze", "mind-blank", "power-word-stun", "sunburst"},
    9: {"wish", "foresight", "time-stop", "true-polymorph", "power-word-kill"},
}
UNFETTERED_SAVE_OPTIONS_2024 = {"str", "dex", "con", "cha", "int"}


def _validate_cleric_book_options_2024(
    payload: Create2024Payload,
    picks: Mapping[str, Any],
) -> dict[str, Any]:
    """P24-M02B-cleric book-path picks: Student / Blessings / Mastery / Unfettered."""
    out: dict[str, Any] = {}
    cleric_level = _planned_class_level(payload, "cleric")
    subclass = _planned_primary_subclass(payload)
    if subclass == "cleric__arcana-domain" and cleric_level >= 3:
        skill = str(picks.get("student_of_arcana_skill") or "").lower()
        if skill not in STUDENT_OF_ARCANA_SKILLS_2024:
            raise Create2024Error(
                "Домен магии 3+: выберите навык «Изучающего магию»",
                code="create_2024_class_options",
            )
        raw = picks.get("student_of_arcana_cantrips") or []
        cantrips = [_normalize_slug(str(x)) for x in raw]
        if (
            len(cantrips) != 2
            or len(set(cantrips)) != 2
            or any(c not in STUDENT_OF_ARCANA_CANTRIPS_2024 for c in cantrips)
        ):
            raise Create2024Error(
                "Домен магии 3+: выберите два заговора волшебника",
                code="create_2024_class_options",
            )
        out["student_of_arcana_skill"] = skill
        out["student_of_arcana_cantrips"] = cantrips
    if subclass == "cleric__arcana-domain" and cleric_level >= 17:
        for circle, allowed in MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024.items():
            key = f"magical_mastery_{circle}"
            spell = _normalize_slug(str(picks.get(key) or ""))
            if spell not in allowed:
                raise Create2024Error(
                    f"Домен магии 17+: выберите заклинание волшебника {circle}-го круга",
                    code="create_2024_class_options",
                )
            out[key] = spell
    if subclass == "cleric__knowledge-domain" and cleric_level >= 3:
        tool = _normalize_slug(str(picks.get("blessings_of_knowledge_tool") or ""))
        if tool not in BLESSINGS_OF_KNOWLEDGE_TOOLS_2024:
            raise Create2024Error(
                "Домен знаний 3+: выберите ремесленный инструмент",
                code="create_2024_class_options",
            )
        raw = picks.get("blessings_of_knowledge_skills") or []
        skills = [str(x).lower() for x in raw]
        if (
            len(skills) != 2
            or len(set(skills)) != 2
            or any(s not in BLESSINGS_OF_KNOWLEDGE_SKILLS_2024 for s in skills)
        ):
            raise Create2024Error(
                "Домен знаний 3+: выберите два навыка с экспертностью",
                code="create_2024_class_options",
            )
        out["blessings_of_knowledge_tool"] = tool
        out["blessings_of_knowledge_skills"] = skills
    if subclass == "cleric__knowledge-domain" and cleric_level >= 6:
        save = str(picks.get("unfettered_mind_save") or "").lower()
        if save and save in UNFETTERED_SAVE_OPTIONS_2024:
            out["unfettered_mind_save"] = save
    return out


def _validate_wizard_book_options_2024(
    payload: Create2024Payload,
    picks: Mapping[str, Any],
) -> dict[str, Any]:
    """P24-M02B book-path picks: orator / war-song skill / transmuter stone."""
    out: dict[str, Any] = {}
    wizard_level = _planned_class_level(payload, "wizard")
    subclass = _planned_primary_subclass(payload)
    if subclass == "wizard__enchanter" and wizard_level >= 3:
        skill = str(picks.get("enchanting_conversationalist") or "").lower()
        if skill not in ENCHANTER_ORATOR_SKILLS_2024:
            raise Create2024Error(
                "Очарователь 3+: выберите навык «Чарующего оратора»",
                code="create_2024_class_options",
            )
        out["enchanting_conversationalist"] = skill
    if subclass == "wizard__bladesinger" and wizard_level >= 3:
        skill = str(picks.get("training_in_war_and_song") or "").lower()
        if skill not in BLADESINGER_WAR_SONG_SKILLS_2024:
            raise Create2024Error(
                "Певец клинка 3+: выберите навык «Учения песни и войны»",
                code="create_2024_class_options",
            )
        out["training_in_war_and_song"] = skill
    if subclass == "wizard__transmuter" and wizard_level >= 3:
        benefit = str(picks.get("transmuter_stone_benefit") or "").lower()
        if benefit not in TRANSMUTER_STONE_BENEFITS_2024:
            raise Create2024Error(
                "Преобразователь 3+: выберите свойство «Камня преобразования»",
                code="create_2024_class_options",
            )
        out["transmuter_stone_benefit"] = benefit
    if subclass == "wizard__transmuter" and wizard_level >= 10:
        benefit2 = str(picks.get("transmuter_stone_benefit_2") or "").lower()
        if benefit2 not in TRANSMUTER_STONE_BENEFITS_2_2024:
            raise Create2024Error(
                "Преобразователь 10+: выберите второе свойство «Могущественного камня»",
                code="create_2024_class_options",
            )
        out["transmuter_stone_benefit_2"] = benefit2
    return out


def _validate_ranger_options_2024(
    payload: Create2024Payload,
    picks: Mapping[str, Any],
    *,
    fighting_style: str | None,
) -> dict[str, Any]:
    """Druidic Warrior cantrips + conclave feature picks (PHB 2024)."""
    out: dict[str, Any] = {}
    style = (fighting_style or payload.fighting_style_slug or "").strip().lower().replace("_", "-")
    raw_cantrips = picks.get(DRUIDIC_WARRIOR_CANTRIPS_KEY) or picks.get("druidic-warrior-cantrips")
    if style == DRUIDIC_WARRIOR_STYLE_SLUG:
        out[DRUIDIC_WARRIOR_CANTRIPS_KEY] = _validate_druidic_warrior_cantrips(raw_cantrips)
    elif raw_cantrips:
        pass

    ranger_level = _planned_class_level(payload, "ranger")
    subclass = _planned_primary_subclass(payload)
    if subclass == e24opt.RANGER_SUBCLASS_HUNTER_2024 and ranger_level >= e24opt.RANGER_CONCLAVE_PICK_MIN_LEVEL_2024:
        prey = str(picks.get("hunters_prey") or "").lower()
        if prey not in e24opt.HUNTERS_PREY_OPTIONS_2024:
            raise Create2024Error(
                "Следопыт 3+: выберите Добычу охотника (colossus_slayer/horde_breaker)",
                code="create_2024_class_options",
            )
        out["hunters_prey"] = prey
    if subclass == e24opt.RANGER_SUBCLASS_HUNTER_2024 and ranger_level >= e24opt.RANGER_DEFENSIVE_TACTICS_MIN_LEVEL_2024:
        tactics = str(picks.get("defensive_tactics") or "").lower()
        if tactics not in e24opt.DEFENSIVE_TACTICS_OPTIONS_2024:
            raise Create2024Error(
                "Следопыт 7+: выберите Оборонительную тактику",
                code="create_2024_class_options",
            )
        out["defensive_tactics"] = tactics
    if subclass == e24opt.RANGER_SUBCLASS_BEASTMASTER_2024 and ranger_level >= e24opt.RANGER_CONCLAVE_PICK_MIN_LEVEL_2024:
        companion = str(picks.get("primal_companion") or "").lower()
        if companion not in e24opt.PRIMAL_COMPANION_TYPES_2024:
            raise Create2024Error(
                "Повелитель зверей 3+: выберите Первичного спутника (land/sea/sky)",
                code="create_2024_class_options",
            )
        out["primal_companion"] = companion
    if subclass == e24opt.RANGER_SUBCLASS_FEY_2024 and ranger_level >= e24opt.RANGER_CONCLAVE_PICK_MIN_LEVEL_2024:
        glamour = str(picks.get("otherworldly_glamour") or "").lower()
        if glamour not in e24opt.OTHERWORLDLY_GLAMOUR_SKILLS_2024:
            raise Create2024Error(
                "Странник фей 3+: выберите навык Иного блеска",
                code="create_2024_class_options",
            )
        out["otherworldly_glamour"] = glamour
    return out


def _validate_barbarian_options_2024(
    payload: Create2024Payload,
    picks: Mapping[str, Any],
) -> dict[str, Any]:
    """Wild Heart conclave picks → class_options_2024 defaults."""
    out: dict[str, Any] = {}
    barbarian_level = _planned_class_level(payload, "barbarian")
    subclass = _planned_primary_subclass(payload)
    if subclass == e24opt.BARBARIAN_SUBCLASS_WILD_HEART_2024 and barbarian_level >= 3:
        rage = str(picks.get("wild_heart_rage") or "").lower()
        if rage not in e24opt.WILD_HEART_RAGE_OPTIONS_2024:
            raise Create2024Error(
                "Путь дикого сердца 3+: выберите форму ярости (wolf/bear/eagle)",
                code="create_2024_class_options",
            )
        out["wild_heart_rage"] = rage
    if subclass == e24opt.BARBARIAN_SUBCLASS_WILD_HEART_2024 and barbarian_level >= 6:
        aspect = str(picks.get("wild_heart_aspect") or "").lower()
        if aspect not in e24opt.WILD_HEART_ASPECT_OPTIONS_2024:
            raise Create2024Error(
                "Путь дикого сердца 6+: выберите аспект (salmon/panther/owl)",
                code="create_2024_class_options",
            )
        out["wild_heart_aspect"] = aspect
    if subclass == e24opt.BARBARIAN_SUBCLASS_WILD_HEART_2024 and barbarian_level >= 14:
        power = str(picks.get("wild_heart_power") or "").lower()
        if power not in e24opt.WILD_HEART_POWER_OPTIONS_2024:
            raise Create2024Error(
                "Путь дикого сердца 14+: выберите силу (falcon/lion/ram)",
                code="create_2024_class_options",
            )
        out["wild_heart_power"] = power
    return out


def _validate_artificer_options_2024(
    payload: Create2024Payload,
    picks: Mapping[str, Any],
) -> dict[str, Any]:
    """Armor model, replicate plans (exact N), spell-storing spell @11+."""
    out: dict[str, Any] = {}
    artificer_level = _planned_class_level(payload, "artificer")
    subclass = _planned_primary_subclass(payload)

    if (
        subclass == "artificer__armorer"
        and artificer_level >= 3
    ):
        model = str(picks.get("armor_model") or "").strip().lower().replace("_", "-")
        if model not in {"dreadnaught", "infiltrator", "guardian"}:
            raise Create2024Error(
                "Бронник 3+: выберите модель доспеха (dreadnaught/infiltrator/guardian)",
                code="create_2024_class_options",
            )
        out["armor_model"] = model

    plans_limit = 0
    if artificer_level >= 2:
        row = e24.class_level_row("artificer", artificer_level)
        plans_limit = int((row or {}).get("resources", {}).get("replicate_plans_known") or 0)
    if plans_limit > 0:
        raw_plans = picks.get("replicate_plans") or []
        if not isinstance(raw_plans, (list, tuple)):
            raise Create2024Error(
                "Артефактор: передайте список известных схем",
                code="create_2024_class_options",
            )
        try:
            plans = e24opt.validate_replicate_plans(
                list(raw_plans),
                artificer_level=artificer_level,
                plans_known_limit=plans_limit,
            )
        except e24opt.Edition2024ClassError as exc:
            raise Create2024Error(str(exc), code="create_2024_class_options") from exc
        if len(plans) != plans_limit:
            raise Create2024Error(
                f"Известные схемы: выбрано {len(plans)} из {plans_limit}",
                code="create_2024_class_options",
            )
        out["replicate_plans"] = plans

    if artificer_level >= 11:
        spell = str(picks.get("spell_storing_spell") or "").strip().lower().replace("_", "-")
        if not spell:
            raise Create2024Error(
                "Артефактор 11+: выберите заклинание для «Предмет, хранящий заклинание»",
                code="create_2024_class_options",
            )
        out["spell_storing_spell"] = spell

    return out


def _validate_spells(payload: Create2024Payload) -> dict[str, Any]:
    snap = e24.compute_progression(
        [{"slug": payload.class_slug, "level": 1}],
        abilities=payload.base_abilities,
    )
    blocks = list(snap.spellcasting or [])
    if not blocks:
        if payload.cantrip_ids or payload.prepared_spell_ids or payload.spellbook_spell_ids:
            raise Create2024Error(
                "Этот класс не выбирает заклинания на 1 уровне",
                code="create_2024_spells",
            )
        return {
            "cantrips": [],
            "prepared": [],
            "spellbook": [],
            "slots": {},
            "pact_slots": None,
            "ability": None,
        }

    block = blocks[0]
    cantrip_need = int(block.cantrips or 0)
    # Thaumaturge Divine Order: +1 Cleric cantrip beyond the table column.
    if payload.class_slug == "cleric":
        order_raw = (payload.class_option_picks or {}).get("divine_order")
        if str(order_raw or "").lower() == "thaumaturge":
            cantrip_need += 1
    # Magician Primal Order: +1 Druid cantrip beyond the table column.
    if payload.class_slug == "druid":
        order_raw = (payload.class_option_picks or {}).get("primal_order")
        if str(order_raw or "").lower() == "magician":
            cantrip_need += 1
    prep_need = int(block.prepared_spells or 0)
    cantrips = [_normalize_slug(x) for x in payload.cantrip_ids]
    prepared = [_normalize_slug(x) for x in payload.prepared_spell_ids]
    spellbook = [_normalize_slug(x) for x in payload.spellbook_spell_ids]
    is_wizard = payload.class_slug == WIZARD_CLASS_SLUG
    if spellbook and not is_wizard:
        raise Create2024Error(
            "Книга заклинаний есть только у волшебника",
            code="create_2024_spells",
        )
    if len(cantrips) != cantrip_need or len(set(cantrips)) != len(cantrips):
        raise Create2024Error(
            f"Нужно {cantrip_need} {_ru_plural(cantrip_need, 'заговор', 'заговора', 'заговоров')}, "
            f"выбрано {len(cantrips)}",
            code="create_2024_spells",
        )
    # Always-prepared (e.g. hunter's mark) do not consume the prepared budget.
    always = {_normalize_slug(x) for x in (block.always_prepared or ())}
    prepared_budget = [p for p in prepared if p not in always]
    if len(prepared_budget) != prep_need or len(set(prepared)) != len(prepared):
        raise Create2024Error(
            f"Нужно {prep_need} "
            f"{_ru_plural(prep_need, 'подготовленное заклинание', 'подготовленных заклинания', 'подготовленных заклинаний')} "
            f"1 круга, выбрано {len(prepared_budget)}",
            code="create_2024_spells",
        )

    if is_wizard:
        if len(spellbook) != WIZARD_BOOK_SPELLS_AT_L1 or len(set(spellbook)) != len(spellbook):
            raise Create2024Error(
                f"Волшебник вписывает в книгу ровно {WIZARD_BOOK_SPELLS_AT_L1} заклинаний 1 круга "
                f"(выбрано {len(spellbook)})",
                code="create_2024_spells",
            )
        outside_book = [p for p in prepared_budget if p not in set(spellbook)]
        if outside_book:
            raise Create2024Error(
                "Подготовить можно только заклинания из книги",
                code="create_2024_spells",
            )

    spell_list = _class_spell_list_slugs(payload.class_slug)
    spells = load_spell_catalog()
    for bid in spellbook:
        row = spells.get(bid)
        if row is None:
            raise Create2024Error(f"Неизвестное заклинание: {bid}", code="create_2024_spells")
        if _spell_level(row) != 1:
            raise Create2024Error(
                f"{bid} должно быть 1 круга",
                code="create_2024_spells",
            )
        if spell_list and bid not in spell_list:
            raise Create2024Error(
                f"Заклинание {bid} не из списка класса",
                code="create_2024_spells",
            )
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
        "spellbook": spellbook,
        "always_prepared": sorted(always),
        "slots": dict(block.slots or {}),
        "pact_slots": dict(block.pact_slots) if block.pact_slots else None,
        "ability": ability,
    }


def _planned_class_level(payload: Create2024Payload, class_slug: str) -> int:
    """Final level of `class_slug` in the create plan (1 when no class_levels)."""
    for row in payload.class_levels or []:
        if not isinstance(row, Mapping):
            continue
        slug = e24.normalize_class_slug(str(row.get("slug") or row.get("class_slug") or ""))
        if slug == class_slug:
            try:
                return max(1, int(row.get("level") or 1))
            except (TypeError, ValueError):
                return 1
    return 1


BARD_LORE_SUBCLASS_2024 = "bard__lore"
BARD_VALOR_SUBCLASS_2024 = "bard__valor"
BARD_MOON_SUBCLASS_2024 = "bard__college-of-the-moon"
BARD_SPIRITS_SUBCLASS_2024 = "bard__college-of-the-spirits"
BARD_SUBCLASS_LEVEL_2024 = 3
BARD_LORE_SKILL_PICKS_2024 = 3
PRIMAL_LORE_SKILLS_2024 = frozenset(
    {
        "perception",
        "survival",
        "medicine",
        "animal_handling",
        "nature",
        "insight",
    }
)
PRIMAL_LORE_CANTRIPS_2024 = frozenset(
    {
        "druidcraft",
        "guidance",
        "mending",
        "message",
        "poison-spray",
        "produce-flame",
        "resistance",
        "shillelagh",
        "spare-the-dying",
        "starry-wisp",
        "elementalism",
    }
)
CHANNELER_GUIDANCE_SLUG = "guidance"
CHANNELER_PLAYING_CARDS_TOOL = "playing-card-set"
PRIMAL_LORE_CANTRIP_KEY = "primal_lore_cantrip"
PRIMAL_LORE_SKILL_KEY = "primal_lore_skill"
BARD_LORE_DISCOVERIES_LEVEL_2024 = 6
BARD_LORE_DISCOVERIES_PICKS_2024 = 2
BARD_LORE_DISCOVERY_LISTS_2024 = ("wizard", "druid", "cleric")
BARD_MAGICAL_SECRETS_LEVEL_2024 = 10
BARD_MAGICAL_SECRETS_LISTS_2024 = ("bard", "wizard", "druid", "cleric")


ARCANE_TRICKSTER_LOCKED_CANTRIP_2024 = "mage-hand"


def _validate_third_caster_spells_2024(
    payload: Create2024Payload,
    *,
    subclass_slug: str,
    class_level: int,
) -> None:
    """Enforce AT/EK/Mystic Arts 2024 create budgets (prepared list, no 2014 school lock)."""
    block = e24sub.third_caster_block(subclass_slug, class_level)
    if not block:
        return
    cantrips = [_normalize_slug(x) for x in payload.cantrip_ids]
    prepared = [_normalize_slug(x) for x in payload.prepared_spell_ids]
    locked: list[str] = []
    if subclass_slug == "rogue__arcane-trickster":
        locked = [ARCANE_TRICKSTER_LOCKED_CANTRIP_2024]
        if ARCANE_TRICKSTER_LOCKED_CANTRIP_2024 not in cantrips:
            raise Create2024Error(
                "Мистический ловкач: «Волшебная рука» обязательна",
                code="create_2024_spells",
            )
    cantrip_need = int(block.get("cantrips") or 0) + len(locked)
    prep_need = int(block.get("prepared_spells") or 0)
    if len(cantrips) != cantrip_need or len(set(cantrips)) != len(cantrips):
        raise Create2024Error(
            f"Нужно {cantrip_need} {_ru_plural(cantrip_need, 'заговор', 'заговора', 'заговоров')}, "
            f"выбрано {len(cantrips)}",
            code="create_2024_spells",
        )
    if len(prepared) != prep_need or len(set(prepared)) != len(prepared):
        raise Create2024Error(
            f"Нужно {prep_need} "
            f"{_ru_plural(prep_need, 'подготовленное заклинание', 'подготовленных заклинания', 'подготовленных заклинаний')}, "
            f"выбрано {len(prepared)}",
            code="create_2024_spells",
        )
    spell_list_slug = str(block.get("spell_list") or "wizard")
    list_label = {
        "wizard": "волшебника",
        "sorcerer": "чародея",
    }.get(spell_list_slug, spell_list_slug)
    spell_list = _class_spell_list_slugs(spell_list_slug)
    spells = load_spell_catalog()
    slots = block.get("slots") or {}
    max_circle = max(
        (int(k) for k, n in slots.items() if int(n or 0) > 0),
        default=1,
    )
    for cid in cantrips:
        row = spells.get(cid)
        if row is None:
            raise Create2024Error(f"Неизвестный заговор: {cid}", code="create_2024_spells")
        if _spell_level(row) != 0:
            raise Create2024Error(f"{cid} не заговор", code="create_2024_spells")
        if spell_list and cid not in spell_list:
            raise Create2024Error(
                f"Заговор {cid} не из списка {list_label}",
                code="create_2024_spells",
            )
    for sid in prepared:
        row = spells.get(sid)
        if row is None:
            raise Create2024Error(f"Неизвестное заклинание: {sid}", code="create_2024_spells")
        circle = _spell_level(row)
        if circle < 1 or circle > max_circle:
            raise Create2024Error(
                f"{sid}: на ур. {class_level} доступны круги 1–{max_circle}",
                code="create_2024_spells",
            )
        if spell_list and sid not in spell_list:
            raise Create2024Error(
                f"Заклинание {sid} не из списка {list_label}",
                code="create_2024_spells",
            )


def _bard_prepared_column_2024(bard_level: int) -> int:
    """Prepared-spells column for a single-class bard (table, no subclass free spells)."""
    level = max(1, min(20, int(bard_level or 1)))
    snap = e24.compute_progression([{"slug": "bard", "level": level}])
    blocks = list(snap.spellcasting or [])
    return int(blocks[0].prepared_spells or 0) if blocks else 0


def _bard_prepared_column_grows_2024(bard_level: int) -> bool:
    level = max(1, min(20, int(bard_level or 1)))
    if level < 2:
        return False
    return _bard_prepared_column_2024(level) > _bard_prepared_column_2024(level - 1)


def magical_secrets_off_list_cap_2024(bard_level: int) -> int:
    """Off-Bard-list prepared slots Magical Secrets opens (mirror frontend)."""
    level = max(0, min(20, int(bard_level or 0)))
    cap = 0
    for at in range(BARD_MAGICAL_SECRETS_LEVEL_2024, level + 1):
        cap += 1 + (1 if _bard_prepared_column_grows_2024(at) else 0)
    return cap


def _validate_bard_magical_secrets_prepared_2024(payload: Create2024Payload) -> None:
    """Create-at-N: Magical Secrets four lists from 10; below 10 reject off-list."""
    if payload.class_slug != "bard":
        return
    bard_level = _planned_class_level(payload, "bard")
    prepared = [_normalize_slug(x) for x in payload.prepared_spell_ids]
    if not prepared:
        return
    subclass = _planned_primary_subclass(payload) or None
    row: dict[str, Any] = {"slug": "bard", "level": max(1, bard_level)}
    if subclass:
        row["subclass_slug"] = subclass
    snap = e24.compute_progression([row], abilities=payload.base_abilities)
    always: set[str] = set()
    for block in snap.spellcasting or []:
        always |= {_normalize_slug(x) for x in (block.always_prepared or ())}
    bard_list = _class_spell_list_slugs("bard")
    extra_lists = (
        BARD_LORE_DISCOVERY_LISTS_2024 if bard_level >= BARD_MAGICAL_SECRETS_LEVEL_2024 else ()
    )
    extra_slugs: set[str] = set()
    for cls in extra_lists:
        extra_slugs |= _class_spell_list_slugs(cls)
    catalog = load_spell_catalog()
    off: list[str] = []
    for sid in prepared:
        if sid in always:
            continue
        spell_row = catalog.get(sid)
        if spell_row is None:
            raise Create2024Error(f"Неизвестное заклинание: {sid}", code="create_2024_spells")
        if _spell_level(spell_row) < 1:
            raise Create2024Error(
                f"{sid} не подготовленное заклинание (заговоры выбираются отдельно)",
                code="create_2024_spells",
            )
        if bard_list and sid in bard_list:
            continue
        if bard_level >= BARD_MAGICAL_SECRETS_LEVEL_2024 and sid in extra_slugs:
            off.append(sid)
            continue
        raise Create2024Error(
            f"Заклинание {sid} не из списка класса",
            code="create_2024_spells",
        )
    cap = magical_secrets_off_list_cap_2024(bard_level)
    if len(off) > cap:
        raise Create2024Error(
            f"Магические тайны: вне списка Барда {len(off)}/{cap}",
            code="create_2024_spells",
        )


def _bard_expertise_need_2024(bard_level: int) -> int:
    """Skills a bard must hold in Expertise: 2 from level 2, 4 from level 9."""
    if bard_level >= 9:
        return 4
    if bard_level >= 2:
        return 2
    return 0


def _rogue_expertise_need_2024(rogue_level: int) -> int:
    """Rogue Expertise picks: 2 @1, 4 @6+."""
    if rogue_level >= 6:
        return 4
    if rogue_level >= 1:
        return 2
    return 0


def _validate_rogue_options_2024(payload: Create2024Payload, picks: Mapping[str, Any]) -> dict[str, Any]:
    """Rogue 2024 create picks: Expertise 2 @ L1, 4 @ L6+ (skills or thieves' tools)."""
    out: dict[str, Any] = {}
    rogue_level = _planned_class_level(payload, "rogue")
    need = _rogue_expertise_need_2024(rogue_level)
    expertise = [str(x) for x in (picks.get("expertise") or [])]
    if need:
        if len(expertise) != need or len(set(expertise)) != need:
            raise Create2024Error(
                f"Плут {rogue_level}: выберите {need} различных навыка/инструмента для Компетентности",
                code="create_2024_class_options",
            )
        out["expertise"] = expertise
    elif expertise:
        raise Create2024Error(
            "Плут: Компетентность на 1+ уровне",
            code="create_2024_class_options",
        )
    return out


def _sync_rogue_picks(sheet: dict[str, Any], class_options: Mapping[str, Any]) -> None:
    """Mirror Expertise picks into feature_picks (expertise + expertise_6)."""
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "rogue":
            continue
        class_entry = str(row.get("id") or "class-rogue")
        expertise = [str(x) for x in (class_options.get("expertise") or [])]
        if expertise:
            picks = sheet.get("feature_picks")
            values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
            values[f"{class_entry}:expertise"] = ",".join(expertise[:2])
            if len(expertise) > 2:
                values[f"{class_entry}:expertise_6"] = ",".join(expertise[2:4])
            sheet["feature_picks"] = {"values": values}


def _planned_primary_subclass(payload: Create2024Payload) -> str:
    """Subclass slug of the primary class in the create plan (empty when none)."""
    for row in payload.class_levels or []:
        if not isinstance(row, Mapping):
            continue
        slug = e24.normalize_class_slug(str(row.get("slug") or row.get("class_slug") or ""))
        if slug == payload.class_slug:
            sub = row.get("subclass_slug") or row.get("subclass")
            if sub:
                return _normalize_slug(str(sub))
    return _normalize_slug(str(payload.subclass_slug or ""))


def _validate_bard_options_2024(payload: Create2024Payload, picks: Mapping[str, Any]) -> dict[str, Any]:
    """Bard 2024 create picks: Expertise (2 / 9) and College of Lore bonus proficiencies."""
    out: dict[str, Any] = {}
    bard_level = _planned_class_level(payload, "bard")
    need = _bard_expertise_need_2024(bard_level)
    expertise = [str(x) for x in (picks.get("expertise") or [])]
    if need:
        if len(expertise) != need or len(set(expertise)) != need:
            raise Create2024Error(
                f"Бард {bard_level}: выберите {need} различных навыка для Компетентности",
                code="create_2024_class_options",
            )
        unknown = [x for x in expertise if x not in SKILL_IDS]
        if unknown:
            raise Create2024Error(
                f"Компетентность: неизвестный навык {unknown[0]}",
                code="create_2024_class_options",
            )
        out["expertise"] = expertise
    elif expertise:
        raise Create2024Error(
            "Бард: Компетентность открывается со 2 уровня",
            code="create_2024_class_options",
        )
    subclass = _planned_primary_subclass(payload)
    if subclass == BARD_LORE_SUBCLASS_2024 and bard_level >= BARD_SUBCLASS_LEVEL_2024:
        lore = [str(x) for x in (picks.get("lore_skills") or [])]
        if (
            len(lore) != BARD_LORE_SKILL_PICKS_2024
            or len(set(lore)) != BARD_LORE_SKILL_PICKS_2024
            or any(x not in SKILL_IDS for x in lore)
        ):
            raise Create2024Error(
                "Коллегия знаний: выберите 3 различных навыка (Доп. владения)",
                code="create_2024_class_options",
            )
        out["lore_skills"] = lore
    discoveries = [_normalize_slug(str(x)) for x in (picks.get("magical_discoveries") or [])]
    if subclass == BARD_LORE_SUBCLASS_2024 and bard_level >= BARD_LORE_DISCOVERIES_LEVEL_2024:
        out["magical_discoveries"] = _validate_lore_discoveries_2024(bard_level, discoveries)
    elif discoveries:
        raise Create2024Error(
            "Доп. магические тайны: Коллегия знаний, с 6 уровня барда",
            code="create_2024_class_options",
        )
    out.update(_validate_bard_book_options_2024(payload, picks))
    return out


def _validate_bard_book_options_2024(
    payload: Create2024Payload,
    picks: Mapping[str, Any],
) -> dict[str, Any]:
    """P24-M02B-bard book-path picks: Primal Lore cantrip + skill (Moon only)."""
    out: dict[str, Any] = {}
    bard_level = _planned_class_level(payload, "bard")
    subclass = _planned_primary_subclass(payload)
    if subclass == BARD_MOON_SUBCLASS_2024 and bard_level >= BARD_SUBCLASS_LEVEL_2024:
        skill = str(picks.get(PRIMAL_LORE_SKILL_KEY) or "").lower().replace("-", "_")
        if skill not in PRIMAL_LORE_SKILLS_2024:
            raise Create2024Error(
                "Коллегия луны 3+: выберите навык «Древних знаний»",
                code="create_2024_class_options",
            )
        cantrip_raw = picks.get(PRIMAL_LORE_CANTRIP_KEY)
        if isinstance(cantrip_raw, (list, tuple)):
            cantrip = _normalize_slug(str(cantrip_raw[0] if cantrip_raw else ""))
        else:
            cantrip = _normalize_slug(str(cantrip_raw or ""))
        if cantrip not in PRIMAL_LORE_CANTRIPS_2024:
            # Also accept any live Druid cantrip (catalog may grow).
            allowed = set(PRIMAL_LORE_CANTRIPS_2024) | set(druid_cantrip_slugs_2024())
            if cantrip not in allowed:
                raise Create2024Error(
                    "Коллегия луны 3+: выберите заговор друида «Древних знаний»",
                    code="create_2024_class_options",
                )
        out[PRIMAL_LORE_SKILL_KEY] = skill
        out[PRIMAL_LORE_CANTRIP_KEY] = cantrip
    return out


def _validate_lore_discoveries_2024(bard_level: int, picks: Sequence[str]) -> list[str]:
    """Two distinct Wizard/Druid/Cleric spells: a cantrip or a circle the bard can cast."""
    need = BARD_LORE_DISCOVERIES_PICKS_2024
    if len(picks) != need or len(set(picks)) != need:
        raise Create2024Error(
            f"Коллегия знаний: выберите {need} различных заклинания (Доп. магические тайны)",
            code="create_2024_class_options",
        )
    max_circle = min(9, (min(20, bard_level) + 1) // 2)
    catalog = load_spell_catalog()
    for slug in picks:
        row = catalog.get(slug)
        if row is None:
            raise Create2024Error(
                f"Доп. магические тайны: неизвестное заклинание {slug}",
                code="create_2024_class_options",
            )
        if not any(slug in _class_spell_list_slugs(cls) for cls in BARD_LORE_DISCOVERY_LISTS_2024):
            raise Create2024Error(
                f"Доп. магические тайны: {slug} нет в списках Волшебника, Друида и Жреца",
                code="create_2024_class_options",
            )
        if _spell_level(row) > max_circle:
            raise Create2024Error(
                f"Доп. магические тайны: {slug} выше доступного круга ({max_circle})",
                code="create_2024_class_options",
            )
    return list(picks)


def _sync_bard_picks(sheet: dict[str, Any], class_options: Mapping[str, Any]) -> None:
    """Mirror Expertise picks into feature_picks and record the College grants ledger."""
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "bard":
            continue
        class_entry = str(row.get("id") or "class-bard")
        expertise = [str(x) for x in (class_options.get("expertise") or [])]
        if expertise:
            picks = sheet.get("feature_picks")
            values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
            values[f"{class_entry}:expertise"] = ",".join(expertise[:2])
            if len(expertise) > 2:
                values[f"{class_entry}:expertise_9"] = ",".join(expertise[2:4])
            sheet["feature_picks"] = {"values": values}
        discoveries = [str(x) for x in (class_options.get("magical_discoveries") or [])]
        if discoveries:
            picks = sheet.get("feature_picks")
            values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
            values[f"{class_entry}:magical_discoveries"] = ",".join(discoveries)
            sheet["feature_picks"] = {"values": values}
        subclass = _normalize_slug(str(row.get("subclass_slug") or row.get("subclass_catalog_id") or ""))
        level = int(row.get("level") or 0)
        grant: dict[str, Any] | None = None
        if subclass == BARD_LORE_SUBCLASS_2024 and level >= BARD_SUBCLASS_LEVEL_2024:
            lore = [str(x) for x in (class_options.get("lore_skills") or [])]
            if lore:
                grant = {"skills": lore, "armorKeys": [], "weaponKeys": [], "picks": {"bonus_skills": lore}}
        elif subclass == BARD_VALOR_SUBCLASS_2024 and level >= BARD_SUBCLASS_LEVEL_2024:
            grant = {"skills": [], "armorKeys": ["medium", "shields"], "weaponKeys": ["martial"], "picks": {}}
        if grant is not None:
            ledger = [
                dict(item)
                for item in (sheet.get("subclass_grants") or [])
                if isinstance(item, dict) and item.get("classEntryId") != class_entry
            ]
            ledger.append(
                {
                    "classEntryId": class_entry,
                    "catalogId": subclass,
                    "slug": subclass,
                    "parentSlug": "bard",
                    "weaponExtras": [],
                    "tools": [],
                    "languages": [],
                    "caster": None,
                    "grantedSpellIds": [],
                    **grant,
                }
            )
            sheet["subclass_grants"] = ledger
        return


def _append_bard_book_cantrip_to_known(
    sheet: dict[str, Any],
    *,
    slug: str,
    class_entry_id: str,
    label: str,
    pick_key: str,
) -> None:
    """Always-known cantrip outside bard cantrip budget (Primal Lore / Channeler)."""
    spells = sheet.get("spells")
    if not isinstance(spells, dict):
        spells = {"known": [], "slots": {}, "casting_ability": "cha"}
        sheet["spells"] = spells
    known = list(spells.get("known") or [])
    prefix = f"feature-spell:{pick_key}:"
    known = [row for row in known if not str((row or {}).get("id") or "").startswith(prefix)]
    row = _spell_sheet_row(
        slug,
        prepared=True,
        class_slug="bard",
        locked_label=label,
        source_kind="feature",
        id_prefix=f"feature-spell:{pick_key}:{class_entry_id}",
    )
    row["class_entry_id"] = class_entry_id
    row["always_prepared"] = True
    if slug == CHANNELER_GUIDANCE_SLUG:
        row["range_override_ft"] = 60
        row["notes_ru"] = "Дистанция 60 фт. (Проводник)"
    known.append(row)
    spells["known"] = known


def _sync_bard_book_picks(sheet: dict[str, Any], class_options: Mapping[str, Any]) -> None:
    """Mirror P24-M02B-bard Moon/Spirits picks and auto-grants into the sheet."""
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "bard":
            continue
        entry_id = str(row.get("id") or "class-bard")
        level = int(row.get("level") or 0)
        subclass = _normalize_slug(
            str(row.get("subclass_slug") or row.get("subclass_catalog_id") or "")
        )
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
        skills = sheet.get("skills") if isinstance(sheet.get("skills"), dict) else {}
        prof = sheet.get("proficiency") if isinstance(sheet.get("proficiency"), dict) else {}

        if subclass == BARD_MOON_SUBCLASS_2024 and level >= BARD_SUBCLASS_LEVEL_2024:
            skill = str(class_options.get(PRIMAL_LORE_SKILL_KEY) or "").lower().replace("-", "_")
            cantrip_raw = class_options.get(PRIMAL_LORE_CANTRIP_KEY)
            if isinstance(cantrip_raw, (list, tuple)):
                cantrip = _normalize_slug(str(cantrip_raw[0] if cantrip_raw else ""))
            else:
                cantrip = _normalize_slug(str(cantrip_raw or ""))
            if skill in PRIMAL_LORE_SKILLS_2024:
                values[f"{entry_id}:{PRIMAL_LORE_SKILL_KEY}"] = skill
                if isinstance(skills.get(skill), dict):
                    skills[skill]["is_proficient"] = True
                if isinstance(prof.get("skills"), list) and skill not in prof["skills"]:
                    prof["skills"] = sorted([*prof["skills"], skill])
            if cantrip:
                values[f"{entry_id}:{PRIMAL_LORE_CANTRIP_KEY}"] = cantrip
                _append_bard_book_cantrip_to_known(
                    sheet,
                    slug=cantrip,
                    class_entry_id=entry_id,
                    label="Древние знания",
                    pick_key=PRIMAL_LORE_CANTRIP_KEY,
                )
            langs = list(prof.get("languages") or []) if isinstance(prof, dict) else []
            dru = language_name_ru("druidic")
            if dru and dru not in langs:
                langs.append(dru)
                prof["languages"] = langs
            ledger = [
                dict(item)
                for item in (sheet.get("subclass_grants") or [])
                if isinstance(item, dict) and item.get("classEntryId") != entry_id
            ]
            ledger.append(
                {
                    "classEntryId": entry_id,
                    "catalogId": subclass,
                    "slug": subclass,
                    "parentSlug": "bard",
                    "skills": [skill] if skill in PRIMAL_LORE_SKILLS_2024 else [],
                    "armorKeys": [],
                    "weaponKeys": [],
                    "weaponExtras": [],
                    "tools": [],
                    "languages": ["druidic"],
                    "caster": None,
                    "grantedSpellIds": [cantrip] if cantrip else [],
                    "picks": {
                        PRIMAL_LORE_SKILL_KEY: skill,
                        PRIMAL_LORE_CANTRIP_KEY: cantrip,
                    },
                }
            )
            sheet["subclass_grants"] = ledger

        if subclass == BARD_SPIRITS_SUBCLASS_2024 and level >= BARD_SUBCLASS_LEVEL_2024:
            _append_bard_book_cantrip_to_known(
                sheet,
                slug=CHANNELER_GUIDANCE_SLUG,
                class_entry_id=entry_id,
                label="Проводник",
                pick_key="channeler_guidance",
            )
            values[f"{entry_id}:channeler_guidance"] = CHANNELER_GUIDANCE_SLUG
            values[f"{entry_id}:channeler_focus"] = CHANNELER_PLAYING_CARDS_TOOL
            tools = list(prof.get("tools") or []) if isinstance(prof, dict) else []
            card_name = tool_name_ru(CHANNELER_PLAYING_CARDS_TOOL)
            if card_name and card_name not in tools:
                tools.append(card_name)
                prof["tools"] = tools
            ledger = [
                dict(item)
                for item in (sheet.get("subclass_grants") or [])
                if isinstance(item, dict) and item.get("classEntryId") != entry_id
            ]
            ledger.append(
                {
                    "classEntryId": entry_id,
                    "catalogId": subclass,
                    "slug": subclass,
                    "parentSlug": "bard",
                    "skills": [],
                    "armorKeys": [],
                    "weaponKeys": [],
                    "weaponExtras": [],
                    "tools": [CHANNELER_PLAYING_CARDS_TOOL],
                    "languages": [],
                    "caster": None,
                    "grantedSpellIds": [CHANNELER_GUIDANCE_SLUG],
                    "picks": {"channeler_guidance": CHANNELER_GUIDANCE_SLUG},
                }
            )
            sheet["subclass_grants"] = ledger

        sheet["feature_picks"] = {"values": values}
        if isinstance(prof, dict):
            sheet["proficiency"] = prof
        return


def _sync_blessed_strikes_pick(sheet: dict[str, Any]) -> None:
    """Mirror class_options_2024.blessed_strikes into feature_picks for the cleric row."""
    options = sheet.get("class_options_2024")
    pick = str((options or {}).get("blessed_strikes") or "").strip().lower()
    if pick not in e24opt.BLESSED_STRIKES_OPTIONS_2024:
        return
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "cleric":
            continue
        if int(row.get("level") or 0) < e24opt.BLESSED_STRIKES_MIN_LEVEL_2024:
            return
        entry_id = str(row.get("id") or "class-cleric")
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
        values[f"{entry_id}:blessed_strikes"] = pick
        values[f"{entry_id}:blessed-strikes"] = pick
        sheet["feature_picks"] = {"values": values}
        return


def _sync_elemental_fury_pick(sheet: dict[str, Any]) -> None:
    """Mirror class_options_2024.elemental_fury into feature_picks for the druid row."""
    options = sheet.get("class_options_2024")
    pick = str((options or {}).get("elemental_fury") or "").strip().lower()
    if pick not in e24opt.ELEMENTAL_FURY_OPTIONS_2024:
        return
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "druid":
            continue
        if int(row.get("level") or 0) < e24opt.ELEMENTAL_FURY_MIN_LEVEL_2024:
            return
        entry_id = str(row.get("id") or "class-druid")
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
        values[f"{entry_id}:elemental_fury"] = pick
        values[f"{entry_id}:elemental-fury"] = pick
        sheet["feature_picks"] = {"values": values}
        return


def _sync_wizard_book_picks(sheet: dict[str, Any], class_options: Mapping[str, Any]) -> None:
    """Mirror P24-M02B book-path picks into feature_picks for the wizard class row."""
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "wizard":
            continue
        entry_id = str(row.get("id") or "class-wizard")
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}

        orator = str(class_options.get("enchanting_conversationalist") or "").lower()
        if orator in ENCHANTER_ORATOR_SKILLS_2024:
            values[f"{entry_id}:enchanting_conversationalist"] = orator
            values[f"{entry_id}:enchanting-conversationalist"] = orator

        war_song = str(class_options.get("training_in_war_and_song") or "").lower()
        if war_song in BLADESINGER_WAR_SONG_SKILLS_2024:
            values[f"{entry_id}:training_in_war_and_song"] = war_song
            values[f"{entry_id}:training-in-war-and-song"] = war_song

        stone = str(class_options.get("transmuter_stone_benefit") or "").lower()
        if stone in TRANSMUTER_STONE_BENEFITS_2024:
            values[f"{entry_id}:transmuter_stone_benefit"] = stone
            values[f"{entry_id}:transmuter-s-stone"] = stone

        stone2 = str(class_options.get("transmuter_stone_benefit_2") or "").lower()
        if stone2 in TRANSMUTER_STONE_BENEFITS_2_2024:
            values[f"{entry_id}:transmuter_stone_benefit_2"] = stone2

        sheet["feature_picks"] = {"values": values}
        return


def _sync_cleric_book_picks(sheet: dict[str, Any], class_options: Mapping[str, Any]) -> None:
    """Mirror P24-M02B-cleric book picks into feature_picks for the cleric class row."""
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "cleric":
            continue
        entry_id = str(row.get("id") or "class-cleric")
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}

        skill = str(class_options.get("student_of_arcana_skill") or "").lower()
        if skill in STUDENT_OF_ARCANA_SKILLS_2024:
            values[f"{entry_id}:student_of_arcana_skill"] = skill

        cantrips = [
            _normalize_slug(str(x))
            for x in (class_options.get("student_of_arcana_cantrips") or [])
        ]
        if cantrips:
            values[f"{entry_id}:student_of_arcana_cantrips"] = ",".join(cantrips)

        tool = _normalize_slug(str(class_options.get("blessings_of_knowledge_tool") or ""))
        if tool in BLESSINGS_OF_KNOWLEDGE_TOOLS_2024:
            values[f"{entry_id}:blessings_of_knowledge_tool"] = tool

        skills = [str(x).lower() for x in (class_options.get("blessings_of_knowledge_skills") or [])]
        if skills:
            values[f"{entry_id}:blessings_of_knowledge_skills"] = ",".join(skills)

        save = str(class_options.get("unfettered_mind_save") or "").lower()
        if save in UNFETTERED_SAVE_OPTIONS_2024:
            values[f"{entry_id}:unfettered_mind_save"] = save

        for circle in (6, 7, 8, 9):
            key = f"magical_mastery_{circle}"
            spell = _normalize_slug(str(class_options.get(key) or ""))
            if spell in MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024[circle]:
                values[f"{entry_id}:{key}"] = spell

        sheet["feature_picks"] = {"values": values}
        return


def _sync_ranger_subclass_picks(sheet: dict[str, Any], class_options: Mapping[str, Any]) -> None:
    """Mirror ranger conclave picks into feature_picks for the ranger class row."""
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "ranger":
            continue
        entry_id = str(row.get("id") or "class-ranger")
        level = int(row.get("level") or 1)
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}

        prey = str(class_options.get("hunters_prey") or "").lower()
        if prey in e24opt.HUNTERS_PREY_OPTIONS_2024:
            values[f"{entry_id}:hunters_prey"] = prey

        tactics = str(class_options.get("defensive_tactics") or "").lower()
        if tactics in e24opt.DEFENSIVE_TACTICS_OPTIONS_2024 and level >= e24opt.RANGER_DEFENSIVE_TACTICS_MIN_LEVEL_2024:
            values[f"{entry_id}:defensive_tactics"] = tactics

        companion = str(class_options.get("primal_companion") or "").lower()
        if companion in e24opt.PRIMAL_COMPANION_TYPES_2024 and level >= e24opt.RANGER_CONCLAVE_PICK_MIN_LEVEL_2024:
            values[f"{entry_id}:primal_companion"] = companion
            values[f"{entry_id}:primal-companion"] = companion

        glamour = str(class_options.get("otherworldly_glamour") or "").lower()
        if glamour in e24opt.OTHERWORLDLY_GLAMOUR_SKILLS_2024:
            values[f"{entry_id}:otherworldly_glamour"] = glamour

        sheet["feature_picks"] = {"values": values}
        return


def _sync_artificer_subclass_picks(sheet: dict[str, Any], class_options: Mapping[str, Any]) -> None:
    """Mirror armor model + spell-storing spell into feature_picks; stamp plans onto options."""
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "artificer":
            continue
        entry_id = str(row.get("id") or "class-artificer")
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}

        model = str(class_options.get("armor_model") or "").lower().replace("_", "-")
        if model in {"dreadnaught", "infiltrator", "guardian"}:
            values[f"{entry_id}:armor_model"] = model
            values[f"{entry_id}:armor-model"] = model

        spell = str(class_options.get("spell_storing_spell") or "").strip().lower().replace("_", "-")
        if spell:
            values[f"{entry_id}:spell_storing_spell"] = spell
            values[f"{entry_id}:spell-storing-item"] = spell

        sheet["feature_picks"] = {"values": values}

        options = sheet.get("class_options_2024")
        if isinstance(options, dict):
            plans = class_options.get("replicate_plans")
            if isinstance(plans, list):
                options["replicate_plans"] = list(plans)
            if spell:
                options["spell_storing_spell"] = spell
            sheet["class_options_2024"] = options
        return


def _sync_primal_order_pick(sheet: dict[str, Any]) -> None:
    """Mirror class_options_2024.primal_order into feature_picks so the Primal Order card shows it."""
    options = sheet.get("class_options_2024")
    pick = str((options or {}).get("primal_order") or "").strip().lower()
    if pick not in PRIMAL_ORDER_OPTIONS:
        return
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "druid":
            continue
        entry_id = str(row.get("id") or "class-druid")
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
        values[f"{entry_id}:primal_order"] = pick
        sheet["feature_picks"] = {"values": values}
        return


def _sync_land_choice_pick(sheet: dict[str, Any]) -> None:
    """Mirror class_options_2024.land_choice into feature_picks (circle_spells_land)."""
    options = sheet.get("class_options_2024")
    land = str((options or {}).get("land_choice") or "").strip().lower()
    if land not in e24opt.LAND_TERRAINS_2024:
        return
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "druid":
            continue
        if int(row.get("level") or 0) < e24opt.LAND_CHOICE_MIN_LEVEL_2024:
            return
        entry_id = str(row.get("id") or "class-druid")
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
        values[f"{entry_id}:circle_spells_land"] = land
        sheet["feature_picks"] = {"values": values}
        return


def _blessed_warrior_cantrip_slugs_from_sheet(
    sheet: Mapping[str, Any],
    class_options: Mapping[str, Any],
) -> list[str]:
    """Resolve Blessed Warrior cantrip slugs from create picks or class_options."""
    create = sheet.get("create_2024") if isinstance(sheet.get("create_2024"), dict) else {}
    create_picks = create.get("class_option_picks") if isinstance(create, dict) else {}
    raw = (
        class_options.get(BLESSED_WARRIOR_CANTRIPS_KEY)
        or (create_picks or {}).get(BLESSED_WARRIOR_CANTRIPS_KEY)
        or (create_picks or {}).get("blessed-warrior-cantrips")
        or []
    )
    if not isinstance(raw, list):
        return []
    return [_normalize_slug(str(x)) for x in raw if str(x).strip()]


def _append_blessed_warrior_cantrips_to_known(
    sheet: dict[str, Any],
    cantrips: Sequence[str],
    *,
    class_entry_id: str,
) -> None:
    """Always-prepared CHA cantrips for Blessed Warrior (do not spend paladin budget)."""
    spells = sheet.get("spells")
    if not isinstance(spells, dict):
        spells = {"known": [], "slots": {}, "casting_ability": "cha"}
        sheet["spells"] = spells
    known = list(spells.get("known") or [])
    # Drop previous Blessed Warrior rows so re-sync is idempotent.
    prefix = f"feature-spell:{BLESSED_WARRIOR_CANTRIPS_KEY}:"
    known = [row for row in known if not str((row or {}).get("id") or "").startswith(prefix)]
    for slug in cantrips[:BLESSED_WARRIOR_CANTRIP_COUNT]:
        row = _spell_sheet_row(
            slug,
            prepared=True,
            class_slug="paladin",
            locked_label=BLESSED_WARRIOR_NAME_RU,
            source_kind="feature",
            id_prefix=f"feature-spell:{BLESSED_WARRIOR_CANTRIPS_KEY}:{class_entry_id}",
        )
        row["class_entry_id"] = class_entry_id
        row["always_prepared"] = True
        known.append(row)
    spells["known"] = known
    # Blessed Warrior cantrips are paladin spells — Charisma, even if the L1
    # sheet fragment briefly carried a wrong ability before materialize.
    spells["casting_ability"] = "cha"


def _sync_blessed_warrior_picks(
    sheet: dict[str, Any],
    class_options: Mapping[str, Any],
    *,
    fighting_style: str | None,
) -> None:
    """Mirror Blessed Warrior style + cantrips into feature_picks (both id spellings)."""
    style = (fighting_style or "").strip().lower()
    create = sheet.get("create_2024") if isinstance(sheet.get("create_2024"), dict) else {}
    if not style and isinstance(create, dict):
        style = _normalize_slug(str(create.get("fighting_style") or ""))
    if style != BLESSED_WARRIOR_STYLE_SLUG:
        return
    cantrips = _blessed_warrior_cantrip_slugs_from_sheet(sheet, class_options)
    if len(cantrips) != BLESSED_WARRIOR_CANTRIP_COUNT:
        return
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "paladin":
            continue
        if int(row.get("level") or 0) < 2:
            return
        entry_id = str(row.get("id") or "class-paladin")
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
        # Sheet sync expects underscore id; create/catalog use kebab. Mirror both.
        values[f"{entry_id}:fighting_style_paladin"] = "blessed_warrior"
        values[f"{entry_id}:fighting-style-paladin"] = BLESSED_WARRIOR_STYLE_SLUG
        joined = ",".join(cantrips)
        values[f"{entry_id}:{BLESSED_WARRIOR_CANTRIPS_KEY}"] = joined
        values[f"{entry_id}:blessed-warrior-cantrips"] = joined
        sheet["feature_picks"] = {"values": values}
        _append_blessed_warrior_cantrips_to_known(
            sheet,
            cantrips,
            class_entry_id=entry_id,
        )
        return


def _druidic_warrior_cantrip_slugs_from_sheet(
    sheet: Mapping[str, Any],
    class_options: Mapping[str, Any],
) -> list[str]:
    """Resolve Druidic Warrior cantrip slugs from create picks or class_options."""
    create = sheet.get("create_2024") if isinstance(sheet.get("create_2024"), dict) else {}
    create_picks = create.get("class_option_picks") if isinstance(create, dict) else {}
    raw = (
        class_options.get(DRUIDIC_WARRIOR_CANTRIPS_KEY)
        or (create_picks or {}).get(DRUIDIC_WARRIOR_CANTRIPS_KEY)
        or (create_picks or {}).get("druidic-warrior-cantrips")
        or []
    )
    if not isinstance(raw, list):
        return []
    return [_normalize_slug(str(x)) for x in raw if str(x).strip()]


def _append_druidic_warrior_cantrips_to_known(
    sheet: dict[str, Any],
    cantrips: Sequence[str],
    *,
    class_entry_id: str,
) -> None:
    """Always-prepared WIS cantrips for Druidic Warrior (do not spend ranger budget)."""
    spells = sheet.get("spells")
    if not isinstance(spells, dict):
        spells = {"known": [], "slots": {}, "casting_ability": "wis"}
        sheet["spells"] = spells
    known = list(spells.get("known") or [])
    prefix = f"feature-spell:{DRUIDIC_WARRIOR_CANTRIPS_KEY}:"
    known = [row for row in known if not str((row or {}).get("id") or "").startswith(prefix)]
    for slug in cantrips[:DRUIDIC_WARRIOR_CANTRIP_COUNT]:
        row = _spell_sheet_row(
            slug,
            prepared=True,
            class_slug="ranger",
            locked_label=DRUIDIC_WARRIOR_NAME_RU,
            source_kind="feature",
            id_prefix=f"feature-spell:{DRUIDIC_WARRIOR_CANTRIPS_KEY}:{class_entry_id}",
        )
        row["class_entry_id"] = class_entry_id
        row["always_prepared"] = True
        known.append(row)
    spells["known"] = known
    # Druidic Warrior cantrips are ranger spells — Wisdom (same pattern as Blessed Warrior / CHA).
    spells["casting_ability"] = "wis"


def _sync_druidic_warrior_picks(
    sheet: dict[str, Any],
    class_options: Mapping[str, Any],
    *,
    fighting_style: str | None,
) -> None:
    """Mirror Druidic Warrior style + cantrips into feature_picks (both id spellings)."""
    style = (fighting_style or "").strip().lower().replace("_", "-")
    create = sheet.get("create_2024") if isinstance(sheet.get("create_2024"), dict) else {}
    if not style and isinstance(create, dict):
        style = _normalize_slug(str(create.get("fighting_style") or "")).replace("_", "-")
    if style != DRUIDIC_WARRIOR_STYLE_SLUG:
        return
    cantrips = _druidic_warrior_cantrip_slugs_from_sheet(sheet, class_options)
    if len(cantrips) != DRUIDIC_WARRIOR_CANTRIP_COUNT:
        return
    for row in sheet.get("classes") or []:
        if not isinstance(row, dict):
            continue
        if e24.normalize_class_slug(str(row.get("slug") or "")) != "ranger":
            continue
        if int(row.get("level") or 0) < 2:
            return
        entry_id = str(row.get("id") or "class-ranger")
        picks = sheet.get("feature_picks")
        values = dict(picks.get("values") or {}) if isinstance(picks, dict) else {}
        values[f"{entry_id}:fighting_style_ranger"] = "druidic_warrior"
        values[f"{entry_id}:fighting-style-ranger"] = DRUIDIC_WARRIOR_STYLE_SLUG
        joined = ",".join(cantrips)
        values[f"{entry_id}:{DRUIDIC_WARRIOR_CANTRIPS_KEY}"] = joined
        values[f"{entry_id}:druidic-warrior-cantrips"] = joined
        sheet["feature_picks"] = {"values": values}
        _append_druidic_warrior_cantrips_to_known(
            sheet,
            cantrips,
            class_entry_id=entry_id,
        )
        return


_KNOWN_FORM_TAGS = frozenset({"swim", "fly", "elemental", "custom"})


def known_forms_budget_2024(druid_level: int) -> int:
    """Wild Shape known forms: 4 at L2, 6 at L4, 8 at L8."""
    if druid_level >= 8:
        return 8
    if druid_level >= 4:
        return 6
    if druid_level >= 2:
        return 4
    return 0


def _parse_cr(raw: Any) -> float | None:
    text = str(raw if raw is not None else "").strip()
    if not text:
        return None
    try:
        if "/" in text:
            num, den = text.split("/", 1)
            return float(num) / float(den)
        return float(text)
    except (ValueError, ZeroDivisionError):
        return None


def _validate_known_forms(raw: Any, druid_level: int) -> list[dict[str, Any]]:
    """Druid Wild Shape known forms picked at create (stored as `sheet.known_forms`)."""
    if raw in (None, [], ()):
        return []
    budget = known_forms_budget_2024(druid_level)
    if not isinstance(raw, list):
        raise Create2024Error(
            "Друид: известные облики должны быть списком",
            code="create_2024_class_options",
        )
    if budget <= 0:
        raise Create2024Error(
            "Друид: известные облики доступны со 2 уровня",
            code="create_2024_class_options",
        )
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    max_cr = max(1.0, float(druid_level // 3))
    for item in raw:
        if not isinstance(item, Mapping):
            raise Create2024Error(
                "Друид: некорректная запись известного облика",
                code="create_2024_class_options",
            )
        slug = str(item.get("bestiary_slug") or "").strip()
        name = str(item.get("name_ru") or "").strip()
        if not slug or not name:
            raise Create2024Error(
                "Друид: у известного облика нужны bestiary_slug и name_ru",
                code="create_2024_class_options",
            )
        if slug in seen:
            raise Create2024Error(
                f"Друид: облик «{name}» выбран дважды",
                code="create_2024_class_options",
            )
        seen.add(slug)
        cr_text = str(item.get("cr") if item.get("cr") is not None else "0").strip() or "0"
        cr_value = _parse_cr(cr_text)
        if cr_value is None or cr_value > max_cr:
            raise Create2024Error(
                f"Друид: облик «{name}» превышает лимит опасности",
                code="create_2024_class_options",
            )
        tags = [
            str(tag)
            for tag in (item.get("tags") or [])
            if isinstance(tag, str) and tag in _KNOWN_FORM_TAGS
        ]
        row: dict[str, Any] = {
            "id": str(item.get("id") or "").strip() or f"known-form-{slug}",
            "bestiary_ref": (
                str(item["bestiary_ref"]) if isinstance(item.get("bestiary_ref"), str) else None
            ),
            "bestiary_slug": slug,
            "name_ru": name,
            "cr": cr_text,
            "tags": tags,
        }
        stats = item.get("stats_override")
        if isinstance(stats, Mapping):
            try:
                row["stats_override"] = {
                    "hp": int(stats.get("hp") or 0),
                    "ac": int(stats.get("ac") or 0),
                    "speed": int(stats.get("speed") or 0),
                    "actions": str(stats.get("actions") or ""),
                }
            except (TypeError, ValueError):
                pass
        out.append(row)
    if len(out) > budget:
        raise Create2024Error(
            f"Друид: известных обликов не больше {budget} (выбрано {len(out)})",
            code="create_2024_class_options",
        )
    return out


def _sync_known_forms(sheet: dict[str, Any], class_options: Mapping[str, Any]) -> None:
    """Druid create: mirror the validated Wild Shape known forms onto the sheet."""
    forms = class_options.get("known_forms")
    if isinstance(forms, list) and forms:
        sheet["known_forms"] = [dict(row) for row in forms if isinstance(row, Mapping)]


def _validate_class_options(
    payload: Create2024Payload,
    *,
    fighting_style: str | None = None,
) -> dict[str, Any]:
    picks = dict(payload.class_option_picks or {})
    out: dict[str, Any] = {}
    if payload.class_slug == "paladin":
        out.update(
            _validate_paladin_options_2024(
                payload,
                picks,
                fighting_style=fighting_style,
            )
        )
    if payload.class_slug == "ranger":
        out.update(
            _validate_ranger_options_2024(
                payload,
                picks,
                fighting_style=fighting_style,
            )
        )
    if payload.class_slug == "barbarian":
        out.update(_validate_barbarian_options_2024(payload, picks))
    if payload.class_slug == "artificer":
        out.update(_validate_artificer_options_2024(payload, picks))
    if payload.class_slug == "cleric":
        order = str(picks.get("divine_order") or "").lower()
        if order not in DIVINE_ORDER_OPTIONS:
            raise Create2024Error(
                "Жрец: выберите Божественный орден (protector/thaumaturge)",
                code="create_2024_class_options",
            )
        out["divine_order"] = order
        cleric_level = _planned_class_level(payload, "cleric")
        strikes = str(picks.get("blessed_strikes") or "").lower()
        if cleric_level >= e24opt.BLESSED_STRIKES_MIN_LEVEL_2024:
            if strikes not in e24opt.BLESSED_STRIKES_OPTIONS_2024:
                raise Create2024Error(
                    "Жрец 7+: выберите Благословленные удары "
                    "(divine_strike/potent_spellcasting)",
                    code="create_2024_class_options",
                )
            out["blessed_strikes"] = strikes
        out.update(_validate_cleric_book_options_2024(payload, picks))
    if payload.class_slug == "druid":
        order = str(picks.get("primal_order") or "").lower()
        if order not in PRIMAL_ORDER_OPTIONS:
            raise Create2024Error(
                "Друид: выберите Природный орден (magician/warden)",
                code="create_2024_class_options",
            )
        out["primal_order"] = order
        druid_level = _planned_class_level(payload, "druid")
        fury = str(picks.get("elemental_fury") or "").lower()
        if druid_level >= e24opt.ELEMENTAL_FURY_MIN_LEVEL_2024:
            if fury not in e24opt.ELEMENTAL_FURY_OPTIONS_2024:
                raise Create2024Error(
                    "Друид 7+: выберите Ярость стихий "
                    "(potent_spellcasting/primal_strike)",
                    code="create_2024_class_options",
                )
            out["elemental_fury"] = fury
        land = str(picks.get("land_choice") or "").lower()
        if (
            druid_level >= e24opt.LAND_CHOICE_MIN_LEVEL_2024
            and land in e24opt.LAND_TERRAINS_2024
        ):
            out["land_choice"] = land
        known_forms = _validate_known_forms(picks.get("known_forms"), druid_level)
        if known_forms:
            out["known_forms"] = known_forms
    if payload.class_slug == "bard":
        out.update(_validate_bard_options_2024(payload, picks))
    if payload.class_slug == "rogue":
        out.update(_validate_rogue_options_2024(payload, picks))
    if payload.class_slug == "wizard":
        out.update(_validate_wizard_book_options_2024(payload, picks))
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
        warlock_level = _planned_class_level(payload, "warlock")
        subclass = _planned_primary_subclass(payload)
        if (
            subclass == e24opt.WARLOCK_SUBCLASS_VESTIGE_2024
            and warlock_level >= e24opt.WARLOCK_BOOK_SUBCLASS_LEVEL_2024
        ):
            domain = str(picks.get("vestige_domain") or "").lower()
            if domain not in e24opt.VESTIGE_DOMAIN_OPTIONS_2024:
                raise Create2024Error(
                    "Предтеча 3+: выберите домен (war/life/trickery/light)",
                    code="create_2024_class_options",
                )
            companion_type = str(picks.get("vestige_companion_type") or "").lower()
            if companion_type not in e24opt.VESTIGE_COMPANION_TYPES_2024:
                raise Create2024Error(
                    "Предтеча 3+: выберите тип спутника (fiend/celestial/undead)",
                    code="create_2024_class_options",
                )
            out["vestige_domain"] = domain
            out["vestige_companion_type"] = companion_type
    return out


def validate_create_2024(payload: Create2024Payload) -> Create2024Result:
    from app.dnd import edition_2024_create_levels as create_levels

    class_slug = e24.normalize_class_slug(payload.class_slug) or payload.class_slug
    payload.class_slug = class_slug
    class_catalog = e24.load_class_catalog()
    class_row = class_catalog.get(class_slug)
    if class_row is None:
        raise Create2024Error(f"Неизвестный класс: {class_slug}", code="create_2024_class")
    class_data = class_row.get("data") if isinstance(class_row.get("data"), dict) else {}

    levels_plan = None
    if payload.class_levels:
        levels_plan = create_levels.parse_create_levels_plan(
            {
                "class_levels": payload.class_levels,
                "hp_choices": payload.hp_choices,
                "asi_choices": payload.asi_choices,
                "level_gains": payload.level_gains,
                "spells_by_class": payload.spells_by_class,
            }
        )
        if levels_plan and levels_plan.class_levels:
            if levels_plan.class_levels[0].slug != class_slug:
                raise Create2024Error(
                    "Первый класс в class_levels должен совпадать с class_slug",
                    code="create_2024_levels",
                )

    total_planned = (
        sum(r.level for r in levels_plan.class_levels) if levels_plan else 1
    )
    # Top-level subclass_slug only valid when creating above subclass gate (or via class_levels).
    if payload.subclass_slug and total_planned < int(class_data.get("subclass_level") or 3):
        raise Create2024Error(
            "Подкласс на 1 уровне недоступен (с 3 уровня)",
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
    # Weapon mastery / spells / options: validate against L1 for the base sheet;
    # higher-level budgets are enforced after materialize_levels_on_sheet.
    l1_payload = payload
    if total_planned > 1:
        # Soften L1 mastery count: keep picks, validate limit after leveling.
        mastery = [_normalize_slug(x) for x in payload.weapon_mastery_ids]
        if mastery:
            # Still reject duplicates / unknown weapons via L1 path when limit matches.
            l1_limit = _weapon_mastery_limit(payload.class_slug)
            if l1_limit > 0 and len(mastery) == l1_limit:
                mastery = _validate_weapon_mastery(payload)
            elif l1_limit > 0 and len(set(mastery)) != len(mastery):
                raise Create2024Error(
                    "Виды оружия с мастерством не должны повторяться",
                    code="create_2024_weapon_mastery",
                )
        else:
            mastery = []
        # Spells: validate L1 budget using a trimmed payload; extras overlay after levels.
        wizard_lv = 1
        if levels_plan:
            for row in levels_plan.class_levels:
                if row.slug == WIZARD_CLASS_SLUG:
                    wizard_lv = row.level
                    break
        # For wizard create-at-N the book mixes 1st-circle starters with higher circles.
        # Trimmed L1 validation needs six 1st-circle rows (not «first six ids in payload order»).
        if payload.class_slug == WIZARD_CLASS_SLUG:
            _spells_cat = load_spell_catalog()
            _l1_ids = [
                _normalize_slug(x)
                for x in payload.spellbook_spell_ids
                if _spell_level(_spells_cat.get(_normalize_slug(x))) == 1
            ][:WIZARD_BOOK_SPELLS_AT_L1]
            trimmed_book = _l1_ids
        else:
            trimmed_book = list(payload.spellbook_spell_ids)
        trimmed = Create2024Payload(
            **{
                **payload.__dict__,
                "spellbook_spell_ids": trimmed_book,
                "prepared_spell_ids": list(payload.prepared_spell_ids),
                "cantrip_ids": list(payload.cantrip_ids),
                "subclass_slug": None,
            }
        )
        # Cap prepared to L1 need for the L1 sheet build.
        try:
            spell_info = _validate_spells(trimmed)
        except Create2024Error:
            if trimmed.cantrip_ids or trimmed.prepared_spell_ids or trimmed.spellbook_spell_ids:
                # Fall back: keep cantrips/prepared; L1 book starters only (higher overlay later).
                spell_info = {
                    "cantrips": [_normalize_slug(x) for x in payload.cantrip_ids],
                    "prepared": [_normalize_slug(x) for x in payload.prepared_spell_ids],
                    "spellbook": list(trimmed_book) if payload.class_slug == WIZARD_CLASS_SLUG else [],
                    "slots": {},
                    "pact_slots": None,
                    "ability": None,
                }
            else:
                spell_info = {
                    "cantrips": [],
                    "prepared": [],
                    "spellbook": [],
                    "slots": {},
                    "pact_slots": None,
                    "ability": None,
                }
        # Stash remaining wizard book spells for post-level overlay.
        if payload.class_slug == WIZARD_CLASS_SLUG and wizard_lv > 1:
            subclass_for_book = _planned_primary_subclass(payload)
            book_need = wizard_create_book_need_2024(wizard_lv, subclass_for_book)
            savant_extra = _savant_free_book_total_through_level(wizard_lv, subclass_for_book)
            all_book = [_normalize_slug(x) for x in payload.spellbook_spell_ids]
            if len(all_book) != book_need or len(set(all_book)) != len(all_book):
                detail = f"6 на 1 ур. + 2×{wizard_lv - 1}"
                if savant_extra:
                    detail += f" + {savant_extra} савант"
                raise Create2024Error(
                    f"Волшебник {wizard_lv} ур.: в книге ровно {book_need} заклинаний "
                    f"({detail}), выбрано {len(all_book)}",
                    code="create_2024_spells",
                )
            slots = e24.slots_for_caster_level(wizard_lv)
            max_circle = max((int(k) for k, n in slots.items() if int(n) > 0), default=1)
            spell_list = _class_spell_list_slugs(WIZARD_CLASS_SLUG)
            spells = load_spell_catalog()
            l1_count = 0
            for bid in all_book:
                row = spells.get(bid)
                if row is None:
                    raise Create2024Error(f"Неизвестное заклинание: {bid}", code="create_2024_spells")
                circle = _spell_level(row)
                if circle < 1 or circle > max_circle:
                    raise Create2024Error(
                        f"{bid}: в книгу на ур. {wizard_lv} доступны круги 1–{max_circle}",
                        code="create_2024_spells",
                    )
                if circle == 1:
                    l1_count += 1
                if spell_list and bid not in spell_list:
                    raise Create2024Error(
                        f"Заклинание {bid} не из списка класса",
                        code="create_2024_spells",
                    )
            if l1_count < WIZARD_BOOK_SPELLS_AT_L1:
                raise Create2024Error(
                    f"Стартовая книга: нужно минимум {WIZARD_BOOK_SPELLS_AT_L1} заклинаний 1 круга "
                    f"(сейчас {l1_count})",
                    code="create_2024_spells",
                )
            # Prefer L1 rows for the trimmed L1 sheet; remainder overlays after levels.
            l1_book = [bid for bid in all_book if _spell_level(spells.get(bid)) == 1][
                :WIZARD_BOOK_SPELLS_AT_L1
            ]
            extra_book = [bid for bid in all_book if bid not in set(l1_book)]
            spell_info = {
                **spell_info,
                "spellbook": l1_book,
            }
            if extra_book:
                if levels_plan and not levels_plan.spells_by_class.get(WIZARD_CLASS_SLUG):
                    levels_plan.spells_by_class[WIZARD_CLASS_SLUG] = {
                        "cantrips": [],
                        "prepared": [],
                        "spellbook": extra_book,
                    }
                elif levels_plan:
                    levels_plan.spells_by_class[WIZARD_CLASS_SLUG]["spellbook"] = list(
                        dict.fromkeys(
                            list(levels_plan.spells_by_class[WIZARD_CLASS_SLUG].get("spellbook") or [])
                            + extra_book
                        )
                    )
        class_options = _validate_class_options(payload, fighting_style=fighting_style)
    else:
        if payload.subclass_slug:
            raise Create2024Error(
                "Подкласс на 1 уровне недоступен (с 3 уровня)",
                code="create_2024_subclass",
            )
        mastery = _validate_weapon_mastery(payload)
        spell_info = _validate_spells(payload)
        class_options = _validate_class_options(payload, fighting_style=fighting_style)

    tool_id = _validate_background_tool(payload, bg_data)
    origin_picks = _validate_origin_feat(payload, bg_data)
    species_info = _validate_species(payload)
    try:
        language_picks = validate_language_picks(payload.language_ids)
    except ValueError as exc:
        raise Create2024Error(str(exc), code="create_2024_languages") from exc
    gear = _validate_equipment(payload, class_data)

    sheet = _build_sheet(
        payload=l1_payload,
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

    warnings: list[str] = []
    final_level = 1
    if levels_plan and total_planned > 1:
        # Stamp primary subclass onto plan if only top-level subclass_slug given.
        if payload.subclass_slug and levels_plan.class_levels:
            primary = levels_plan.class_levels[0]
            if not primary.subclass_slug:
                primary.subclass_slug = payload.subclass_slug
        warnings.extend(
            create_levels.materialize_levels_on_sheet(
                sheet,
                levels_plan,
                primary_slug=class_slug,
            )
        )
        final_level = sum(r.level for r in levels_plan.class_levels)
    _sync_blessed_strikes_pick(sheet)
    _sync_primal_order_pick(sheet)
    _sync_elemental_fury_pick(sheet)
    _sync_land_choice_pick(sheet)
    _sync_known_forms(sheet, class_options)
    _sync_bard_picks(sheet, class_options)
    _sync_bard_book_picks(sheet, class_options)
    _sync_rogue_picks(sheet, class_options)
    _sync_blessed_warrior_picks(sheet, class_options, fighting_style=fighting_style)
    _sync_druidic_warrior_picks(sheet, class_options, fighting_style=fighting_style)
    _sync_ranger_subclass_picks(sheet, class_options)
    _sync_artificer_subclass_picks(sheet, class_options)
    _sync_wizard_book_picks(sheet, class_options)
    _sync_cleric_book_picks(sheet, class_options)
    # Magical Secrets: create-at-N prepared may use Wizard/Druid/Cleric lists from bard 10+.
    _validate_bard_magical_secrets_prepared_2024(payload)

    # Third-caster subclass (AT/EK): require wizard-list cantrips/prepared by final level.
    third_sub = ""
    third_lv = 0
    if levels_plan and levels_plan.class_levels:
        for row in levels_plan.class_levels:
            sub = _normalize_slug(str(row.subclass_slug or ""))
            if sub in e24sub.THIRD_CASTER_SUBCLASSES:
                third_sub = sub
                third_lv = max(third_lv, int(row.level or 0))
    if not third_sub:
        top_sub = _normalize_slug(str(payload.subclass_slug or ""))
        if top_sub in e24sub.THIRD_CASTER_SUBCLASSES:
            third_sub = top_sub
            third_lv = final_level if final_level > 1 else _planned_class_level(payload, payload.class_slug)
    if third_sub and third_lv >= 3:
        _validate_third_caster_spells_2024(
            payload,
            subclass_slug=third_sub,
            class_level=third_lv,
        )
        # Stamp INT casting + third-caster slots onto the sheet (rogue/fighter L1 has no caster).
        block = e24sub.third_caster_block(third_sub, third_lv) or {}
        meta = e24sub.THIRD_CASTER_SUBCLASSES.get(third_sub) or {}
        spells_sheet = sheet.get("spells")
        if isinstance(spells_sheet, dict):
            ability = str(meta.get("ability") or block.get("ability") or "int")
            spells_sheet["casting_ability"] = ability
            slots = block.get("slots") or {}
            if slots:
                # Sheet slots are {circle: {max, used}} or bare counts depending on path;
                # normalize to max/used objects when values are ints.
                normalized: dict[str, Any] = {}
                for key, raw in dict(slots).items():
                    if isinstance(raw, Mapping):
                        normalized[str(key)] = {
                            "max": int(raw.get("max") or raw.get("count") or 0),
                            "used": int(raw.get("used") or 0),
                        }
                    else:
                        normalized[str(key)] = {"max": int(raw or 0), "used": 0}
                spells_sheet["slots"] = normalized
            # AT: cantrips already include Mage Hand from payload; keep known rows.
            sheet["spells"] = spells_sheet

    # Class name line: primary + multiclass summary.
    class_name = str(class_row.get("name_ru") or class_slug)
    if final_level > 1:
        parts = []
        for row in sheet.get("classes") or []:
            if isinstance(row, dict):
                parts.append(f"{row.get('name_ru') or row.get('name')} {row.get('level')}")
        if parts:
            class_name = " / ".join(parts)

    hp_max = int(sheet["combat"]["hp_max"])
    return Create2024Result(
        sheet=sheet,
        name=payload.name,
        level=final_level,
        class_name=class_name,
        race_name=str(species_info.get("name_ru") or payload.species_slug),
        hp_max=hp_max,
        hp_current=hp_max,
        warnings=warnings,
    )


def _normalize_tool_key(value: str) -> str:
    key = value.strip().lower().replace("_", "-").replace(" ", "-")
    return key.replace("-s-", "s-")


def tool_name_ru(tool_id: str) -> str:
    """Russian tool name: item catalog first, then the fallback map; never a Latin id."""
    raw = (tool_id or "").strip()
    if not raw:
        return ""
    if any("а" <= ch.lower() <= "я" or ch.lower() == "ё" for ch in raw):
        return raw
    key = _normalize_tool_key(raw)
    catalog = load_item_catalog()
    for candidate in (key, key.replace("-s-", "s-")):
        row = catalog.get(candidate)
        if row and row.get("name_ru"):
            return str(row["name_ru"])
        if candidate in TOOL_NAME_FALLBACK_RU:
            return TOOL_NAME_FALLBACK_RU[candidate]
    return "Инструмент"


_CASTING_UNIT_LABEL_RU = {
    "action": "действие",
    "bonus_action": "бонусное действие",
    "bonus": "бонусное действие",
    "reaction": "реакция",
    "magic": "действие «Магия»",
}


def _casting_time_label_ru(raw: Any) -> str:
    if not isinstance(raw, Mapping):
        return ""
    unit = str(raw.get("unit") or "")
    amount = int(raw.get("amount") or 1)
    if unit == "minute":
        return f"{amount} мин."
    if unit == "hour":
        return f"{amount} ч."
    label = _CASTING_UNIT_LABEL_RU.get(unit)
    if label is None:
        return "особое"
    return f"{amount} {label}" if amount > 1 else f"1 {label}"


def _spell_sheet_row(
    slug: str,
    *,
    prepared: bool,
    class_slug: str | None = None,
    in_spellbook: bool | None = None,
    spellbook_acquisition: str | None = None,
    locked_label: str | None = None,
    source_kind: str | None = None,
    id_prefix: str = "spell",
) -> dict[str, Any]:
    """SheetSpell-shaped row (same shape the 2014 sheet editor reads), Russian names only."""
    from app.services.edition_2024_catalog_seed import entry_id

    cat = load_spell_catalog().get(slug) or {}
    data = cat.get("data") if isinstance(cat.get("data"), dict) else {}
    level = max(0, _spell_level(cat))
    comps = data.get("components") if isinstance(data.get("components"), dict) else {}
    components: dict[str, Any] = {"v": bool(comps.get("v")), "s": bool(comps.get("s"))}
    if comps.get("m"):
        components["m"] = comps["m"] if isinstance(comps["m"], str) else "Материальный компонент"
    row: dict[str, Any] = {
        "id": f"{id_prefix}:{slug}",
        "name": str(cat.get("name_ru") or "Заклинание"),
        "catalog_id": entry_id(kind="spell", slug=slug),
        "level": level,
        "prepared": True if level == 0 else bool(prepared),
        "notes": "",
        "casting_time": _casting_time_label_ru(data.get("casting_time")),
        "range": str(data.get("range") or ""),
        "attack_or_save": str(data.get("attack_or_save") or ""),
        "damage": str(data.get("damage") or ""),
        "concentration": bool(data.get("concentration")),
        "components": components,
    }
    if data.get("duration"):
        row["duration"] = str(data["duration"])
    if data.get("ritual"):
        row["ritual"] = True
    if data.get("school"):
        row["school"] = str(data["school"])
    if data.get("source_book"):
        row["source_book"] = str(data["source_book"])
    if data.get("higher_levels"):
        row["higher_levels"] = str(data["higher_levels"])
    if data.get("description"):
        row["description"] = str(data["description"])
    if isinstance(data.get("damage_at_character_level"), dict):
        row["damage_at_character_level"] = dict(data["damage_at_character_level"])
    if class_slug:
        row["class_slug"] = class_slug
    if level > 0 and in_spellbook is not None:
        row["in_spellbook"] = in_spellbook
    if level > 0 and spellbook_acquisition:
        row["spellbook_acquisition"] = spellbook_acquisition
    if source_kind:
        row["source_kind"] = source_kind
    if locked_label:
        row["prepared"] = True
        row["prepared_locked"] = True
        row["prepare_source_label"] = locked_label
        row["notes"] = f"Всегда подготовлено · {locked_label}"
    return row


def _build_known_spells(
    *,
    class_slug: str,
    spell_info: Mapping[str, Any],
    origin_picks: Mapping[str, Any],
    species_feat: Mapping[str, Any],
) -> list[dict[str, Any]]:
    """Class spells (wizard book first) then always-prepared and feat grants, de-duplicated."""
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()

    def push(row: dict[str, Any], slug: str) -> None:
        if slug in seen:
            return
        seen.add(slug)
        rows.append(row)

    for slug in spell_info.get("cantrips") or []:
        push(_spell_sheet_row(slug, prepared=True, class_slug=class_slug), slug)

    prepared = set(spell_info.get("prepared") or [])
    always = set(spell_info.get("always_prepared") or [])
    book = list(spell_info.get("spellbook") or [])
    if book:
        for slug in book:
            push(
                _spell_sheet_row(
                    slug,
                    prepared=slug in prepared,
                    class_slug=class_slug,
                    in_spellbook=True,
                    spellbook_acquisition="starting",
                ),
                slug,
            )
    for slug in spell_info.get("prepared") or []:
        if slug in always:
            continue
        push(_spell_sheet_row(slug, prepared=True, class_slug=class_slug), slug)
    for slug in sorted(always):
        push(
            _spell_sheet_row(
                slug,
                prepared=True,
                class_slug=class_slug,
                locked_label="Особенность класса",
                source_kind="feature",
                id_prefix="feature-spell",
            ),
            slug,
        )

    for feat_picks in (origin_picks, species_feat):
        if not isinstance(feat_picks, Mapping):
            continue
        feat_slug = _normalize_slug(str(feat_picks.get("slug") or "")) or "origin"
        feat_spells: list[str] = []
        feat_spells.extend(str(x) for x in (feat_picks.get("cantrips") or []))
        if feat_picks.get("cantrip"):
            feat_spells.append(str(feat_picks["cantrip"]))
        if feat_picks.get("spell_id"):
            feat_spells.append(str(feat_picks["spell_id"]))
        for slug in feat_spells:
            push(
                _spell_sheet_row(
                    slug,
                    prepared=True,
                    locked_label="Черта",
                    source_kind="feat",
                    id_prefix=f"feat-spell:{feat_slug}",
                ),
                slug,
            )
    return rows


def _ensure_wizard_spellbook_item(items: list[dict[str, Any]]) -> str:
    """Tag the pack's «Книга заклинаний» (or add a blank one) and return its inventory id."""
    for item in items:
        name = str(item.get("name_ru") or item.get("name") or "").strip().lower().replace("ё", "е")
        if str(item.get("catalog_slug") or "") == "spellbook" or "книга заклинаний" in name:
            item["catalog_slug"] = "spellbook"
            return str(item["id"])
    item_id = f"start-spellbook-{len(items)}"
    items.append(
        {
            "id": item_id,
            "slug": None,
            "catalog_slug": "spellbook",
            "name": SPELLBOOK_ITEM_NAME_RU,
            "name_ru": SPELLBOOK_ITEM_NAME_RU,
            "qty": 1,
            "weight_lb": 3.0,
            "notes": "Книга заклинаний волшебника (создана при сборке персонажа)",
            "equipped": False,
        }
    )
    return item_id


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
    # PHB 2024 Dwarven Toughness: +1 max HP at character level 1 (species dwarf).
    # Kept local to 2024 create — do not share with 2014 hill-dwarf passive ledger (#498).
    if str(payload.species_slug or "").strip().lower() == "dwarf":
        hp_max += 1

    # Abilities
    sheet["abilities"] = {k: {"score": int(final_abilities[k])} for k in ABILITY_KEYS}

    # Saves
    save_prof = {str(x).lower() for x in (class_data.get("saving_throws") or [])}
    # Slippery Mind 2024 (L15+): Wis AND Cha (2014 path is Wis-only via 2014 pack).
    planned_rogue = _planned_class_level(payload, "rogue") if payload.class_slug == "rogue" else 0
    if payload.class_slug == "rogue" and planned_rogue >= 15:
        save_prof |= {"wis", "cha"}
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
    if payload.class_slug == "bard":
        lore_skills = {str(x) for x in (class_options.get("lore_skills") or []) if x in SKILL_IDS}
        already = sorted(lore_skills & proficient)
        if already:
            raise Create2024Error(
                f"Коллегия знаний: навык {already[0]} уже есть — выберите другой",
                code="create_2024_class_options",
            )
        proficient |= lore_skills
        moon_skill = str(class_options.get(PRIMAL_LORE_SKILL_KEY) or "").lower().replace("-", "_")
        if moon_skill in PRIMAL_LORE_SKILLS_2024:
            proficient.add(moon_skill)
    expertise = {str(x) for x in (class_options.get("expertise") or []) if x in SKILL_IDS}
    if payload.class_slug == "bard":
        untrained = sorted(expertise - proficient)
        if untrained:
            raise Create2024Error(
                f"Компетентность только в навыках с владением: {untrained[0]}",
                code="create_2024_class_options",
            )
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

    # Race grant baseline (speed) so the desk can add Unarmored Movement live
    # without double-counting. combat.speed stays species-only.
    sheet["race_grant"] = {
        "raceCatalogId": str(payload.species_slug),
        "slug": str(payload.species_slug),
        "parentSlug": None,
        "speed": speed,
        "size": species_info.get("size") or "medium",
        "darkvision": int(species_info.get("darkvision") or 0),
        "abilityBonuses": {},
        "languages": [],
        "skills": [],
        "tools": [],
        "armorKeys": [],
        "weaponNames": [],
        "traitsText": "",
        "traitCards": [],
        "ancestryId": species_info.get("ancestry_id"),
        "featNoteRu": None,
        "naturalArmor": None,
        "naturalWeapons": [],
        "movement": {"walk": speed},
        "activatedMovement": [],
        "damageResistances": [],
        "combatBonuses": {},
        "racialSpells": [],
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
    weapons_prof = _weapons_proficiency_from_class_data(class_data.get("weapons"))
    # Divine Order (Cleric 2024): Protector adds martial weapons + heavy armor.
    # Never grant weapon mastery from this order.
    divine_order = str((class_options or {}).get("divine_order") or "").lower()
    if payload.class_slug == "cleric" and divine_order == "protector":
        weapons_prof = {**weapons_prof, "martial": True}
        armor = list(armor) + (["heavy"] if "heavy" not in armor and "all" not in armor else [])
    # Primal Order (Druid 2024): Warden adds martial weapons + medium armor.
    # Never grant weapon mastery or heavy armor from this order.
    primal_order = str((class_options or {}).get("primal_order") or "").lower()
    if payload.class_slug == "druid" and primal_order == "warden":
        weapons_prof = {**weapons_prof, "martial": True}
        armor = list(armor) + (
            ["medium"] if "medium" not in armor and "all" not in armor else []
        )
    # College of Valor (2024) Martial Training: martial weapons, medium armor, shields.
    # Never grants weapon mastery.
    if (
        payload.class_slug == "bard"
        and _planned_primary_subclass(payload) == BARD_VALOR_SUBCLASS_2024
        and _planned_class_level(payload, "bard") >= BARD_SUBCLASS_LEVEL_2024
    ):
        weapons_prof = {**weapons_prof, "martial": True}
        armor = list(armor) + [x for x in ("medium", "shields") if x not in armor and "all" not in armor]
    # Bladesinger (2024) Training in War and Song: martial melee without Two-Handed/Heavy.
    # Do NOT set martial: True (that would include heavy / two-handed).
    if (
        payload.class_slug == "wizard"
        and _planned_primary_subclass(payload) == "wizard__bladesinger"
        and _planned_class_level(payload, "wizard") >= 3
    ):
        extras = list(weapons_prof.get("extras") or [])
        if BLADESINGER_MARTIAL_MELEE_RU not in extras:
            extras.append(BLADESINGER_MARTIAL_MELEE_RU)
        weapons_prof = {**weapons_prof, "extras": extras}
    sheet["proficiency"] = {
        "bonus": 2,
        "armor": {
            "light": "light" in armor or "all" in armor,
            "medium": "medium" in armor or "all" in armor,
            "heavy": "heavy" in armor or "all" in armor,
            "shields": "shields" in armor or "shield" in armor,
        },
        "weapons": weapons_prof,
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
        "languages": [
            language_name_ru(COMMON_LANGUAGE_ID),
            *[language_name_ru(x) for x in language_picks],
        ],
        "skills": sorted(proficient),
    }
    # Russian names only; deduplicate while preserving order.
    raw_tools = [str(t) for t in sheet["proficiency"]["tools"] if t]
    if skill_or_tool and skill_or_tool not in SKILL_IDS:
        raw_tools.append(skill_or_tool)
    seen_tools: set[str] = set()
    deduped_tools: list[str] = []
    for raw_tool in raw_tools:
        name = tool_name_ru(raw_tool)
        if name and name not in seen_tools:
            seen_tools.add(name)
            deduped_tools.append(name)
    sheet["proficiency"]["tools"] = deduped_tools
    sheet["proficiency"]["skills"] = sorted(proficient)
    if payload.class_slug == "druid":
        sheet["proficiency"]["languages"].append(language_name_ru("druidic"))
    if payload.class_slug == "rogue":
        sheet["proficiency"]["languages"].append(language_name_ru("thieves-cant"))

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
        # Copy armor fields so the sheet AC formula sees real gear (2024 create only).
        armor_kind = cat_data.get("armor_kind")
        base_ac = cat_data.get("base_ac")
        row: dict[str, Any] = {
            "id": f"start-{item_id or 'item'}-{len(items)}",
            "slug": item_id or None,
            "name": name_ru,
            "name_ru": name_ru,
            "qty": max(1, int(qty or 1)),
            "weight_lb": float(weight) if weight is not None else None,
            "notes": notes,
            "equipped": False,
        }
        if armor_kind:
            row["armor_kind"] = str(armor_kind)
        if base_ac is not None:
            try:
                row["base_ac"] = int(base_ac)
            except (TypeError, ValueError):
                pass
        # Weapon damage for attack cards (sickle etc.).
        damage = cat_data.get("damage")
        damage_type = cat_data.get("damage_type")
        if damage:
            row["damage"] = damage
        if damage_type:
            row["damage_type"] = damage_type
        if str(cat.get("kind") or "") == "weapon":
            props = [str(p).lower() for p in (cat_data.get("properties") or [])]
            row["weapon_grip"] = "two_hand" if "two_handed" in props else "one_hand"
        items.append(row)

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
        kind = str(item.get("armor_kind") or "").lower()
        if slug in armor_slug_bonus or kind in {"light", "medium", "heavy"}:
            base = int(item.get("base_ac") or armor_slug_bonus.get(slug) or 10)
            if kind == "light" or slug in {
                "padded",
                "leather",
                "leather-armor",
                "studded-leather",
                "studded-leather-armor",
            }:
                ac = base + dex_mod
            elif kind == "medium" or slug in {
                "hide",
                "chain-shirt",
                "scale-mail",
                "breastplate",
                "half-plate",
            }:
                ac = base + min(dex_mod, 2)
            else:
                ac = base
            item["equipped"] = True
            break
    for item in items:
        if str(item.get("slug")) == "shield" or str(item.get("armor_kind") or "") == "shield":
            item["equipped"] = True
            ac += int(item.get("base_ac") or 2)
            break
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

    # Spells: SheetSpell-shaped rows (same shape as 2014) with Russian names from the catalog.
    known = _build_known_spells(
        class_slug=payload.class_slug,
        spell_info=spell_info,
        origin_picks=origin_picks,
        species_feat=species_feat,
    )
    sheet["spells"] = {
        "casting_ability": spell_info.get("ability"),
        "slots": spell_info.get("slots") or {},
        "pact_slots": (
            {
                **dict(spell_info["pact_slots"]),
                "max": int(spell_info["pact_slots"].get("count") or 0),
                "used": 0,
            }
            if spell_info.get("pact_slots")
            else {}
        ),
        "known": known,
    }
    # Wizard (and other prepared casters later): never leave max_prepared null —
    # classic SpellsPanel would otherwise flip to «Известно N/…» and count the book.
    if payload.class_slug == WIZARD_CLASS_SLUG:
        wizard_lv = _planned_class_level(payload, WIZARD_CLASS_SLUG)
        row = e24.class_level_row("wizard", wizard_lv) or e24.class_level_row("wizard", 1) or {}
        sc = row.get("spellcasting") if isinstance(row, Mapping) else None
        sheet["spells"]["max_prepared"] = int(
            (sc or {}).get("prepared_spells") if isinstance(sc, Mapping) else 4
        ) or 4
    if payload.class_slug == WIZARD_CLASS_SLUG:
        book_item_id = _ensure_wizard_spellbook_item(items)
        sheet["spells"]["wizard_spellbook"] = {
            "primaryBookItemId": book_item_id,
            "bookLost": False,
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
        "replicate_plans": list(class_options.get("replicate_plans") or []),
        "replicate_active": [],
        "spell_storing_spell": class_options.get("spell_storing_spell") or None,
        "rage": {"active": False, "rounds_extended": 0, "max_minutes": 10},
    }
    if class_options.get("divine_order"):
        options_sheet["divine_order"] = str(class_options["divine_order"])
    if class_options.get("blessed_strikes"):
        options_sheet["blessed_strikes"] = str(class_options["blessed_strikes"])
    if class_options.get("primal_order"):
        options_sheet["primal_order"] = str(class_options["primal_order"])
    if class_options.get("elemental_fury"):
        options_sheet["elemental_fury"] = str(class_options["elemental_fury"])
    if class_options.get("land_choice"):
        options_sheet["land_choice"] = str(class_options["land_choice"])
    if class_options.get("hunters_prey"):
        options_sheet["hunters_prey"] = str(class_options["hunters_prey"])
    if class_options.get("defensive_tactics"):
        options_sheet["defensive_tactics"] = str(class_options["defensive_tactics"])
    if class_options.get("primal_companion"):
        options_sheet["primal_companion"] = str(class_options["primal_companion"])
    if class_options.get("otherworldly_glamour"):
        options_sheet["otherworldly_glamour"] = str(class_options["otherworldly_glamour"])
    if class_options.get("vestige_domain"):
        options_sheet["vestige_domain"] = str(class_options["vestige_domain"])
    if class_options.get("vestige_companion_type"):
        options_sheet["vestige_companion_type"] = str(class_options["vestige_companion_type"])
    aspect = str(class_options.get("wild_heart_aspect") or "").lower()
    if aspect in e24opt.WILD_HEART_ASPECT_OPTIONS_2024:
        options_sheet["wild_heart_aspect"] = aspect
    rage_animal = str(class_options.get("wild_heart_rage") or "").lower()
    if rage_animal in e24opt.WILD_HEART_RAGE_OPTIONS_2024:
        options_sheet["rage"]["wild_heart"] = rage_animal
    rage_power = str(class_options.get("wild_heart_power") or "").lower()
    if rage_power in e24opt.WILD_HEART_POWER_OPTIONS_2024:
        options_sheet["rage"]["wild_heart_power"] = rage_power
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
        "cantrip_ids": list(spell_info.get("cantrips") or []),
        "prepared_spell_ids": list(spell_info.get("prepared") or []),
        "spellbook_spell_ids": list(spell_info.get("spellbook") or []),
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
