"""P24-M02b: subclass feature/resource/always-prepared automation for rules_edition=2024.

Loads all accepted subclass packs (SRD, PH24, EFA, FRHoF, RTW, AU).
Spendable pools and shared-pool options get sheet buttons; permanent formula
bonuses land in sheet/desk calculations; narrative/DM-judgment stays as text.
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
    0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
]

THIRD_CASTER_SPELLS_KNOWN: list[int] = [
    0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13,
]

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
        "oath-of-devotion-spells",
        "oath-of-the-ancients-spells",
        "oath-of-vengeance-spells",
        "oath-of-glory-spells",
        "circle-of-the-moon-spells",
        "circle-of-the-sea-spells",
        "circle-of-the-land-spells",
    }
)


# Features whose id ends with "-spells" but are not an always-prepared list.
NOT_ALWAYS_PREPARED_FEATURE_IDS: frozenset[str] = frozenset({"sculpt-spells"})


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


@dataclass(frozen=True)
class SharedPoolOption:
    """Subclass feature that spends a class shared pool (channel / BI / focus / …)."""

    feature_id: str
    name_ru: str
    spend_pool: str
    cost: int = 1
    cost_max: int | None = None
    kind: str = "action"  # action | bonus | reaction | passive
    min_level: int = 3


@dataclass(frozen=True)
class PermanentBonus:
    """Formula applied in sheet/desk calculations (not a spend button)."""

    feature_id: str
    name_ru: str
    kind: str  # crit_threshold | ac_formula | hp_per_level | initiative_mod | damage_rider | aura_radius | speed | other_calc
    value: Any
    min_level: int = 3
    note_ru: str = ""


def _pool_id(class_slug: str, pool_key: str, entry_id: str) -> str:
    return f"feat:{class_slug}:{pool_key}:{entry_id}"


def _scale_uses(level: int, table: Mapping[int, int]) -> int:
    best = 0
    for lv, val in sorted(table.items()):
        if level >= lv:
            best = val
    return best


def _psi_energy_table(level: int) -> tuple[int, str]:
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


def _mod_min1(abilities: Mapping[str, int], key: str) -> int:
    return max(1, ability_mod(int(abilities.get(key) or 10)))


# ---------------------------------------------------------------------------
# Shared-pool options (button spends class pool, no separate max)
# ---------------------------------------------------------------------------

SHARED_OPTIONS: dict[str, list[SharedPoolOption]] = {
    # Cleric domains — Channel Divinity options
    "cleric__light-domain": [
        SharedPoolOption("radiance-of-the-dawn", "Сияние рассвета", "channel_divinity", kind="action"),
    ],
    "cleric__life-domain": [
        SharedPoolOption("preserve-life", "Сохранение жизни", "channel_divinity", kind="action"),
    ],
    "cleric__war-domain": [
        SharedPoolOption("guided-strike", "Направленный удар", "channel_divinity", kind="reaction"),
        SharedPoolOption(
            "war-gods-blessing", "Благословение бога войны", "channel_divinity", kind="action", min_level=6
        ),
    ],
    "cleric__trickery-domain": [
        SharedPoolOption("invoke-duplicity", "Двуличность", "channel_divinity", kind="bonus"),
    ],
    "cleric__knowledge-domain": [
        SharedPoolOption("mind-magic", "Магия разума", "channel_divinity", kind="action"),
    ],
    "cleric__arcana-domain": [
        SharedPoolOption("modify-magic", "Изменение магии", "channel_divinity", kind="action"),
    ],
    "cleric__grave-domain": [
        SharedPoolOption("path-to-the-grave", "Путь в могилу", "channel_divinity", kind="action"),
    ],
    # Paladin oaths — Channel Divinity (+ class divine_sense already on pool)
    "paladin__oath-of-devotion": [
        SharedPoolOption("sacred-weapon", "Священное оружие", "channel_divinity", kind="attack"),
    ],
    "paladin__oath-of-the-ancients": [
        SharedPoolOption("natures-wrath", "Гнев природы", "channel_divinity", kind="action"),
    ],
    "paladin__oath-of-vengeance": [
        # PHB 2024: when you take the Attack action (not a bonus action).
        SharedPoolOption("vow-of-enmity", "Обет вражды", "channel_divinity", kind="attack"),
    ],
    "paladin__oath-of-glory": [
        SharedPoolOption("inspiring-smite", "Воодушевляющая кара", "channel_divinity", kind="bonus"),
        SharedPoolOption("peerless-athlete", "Непревзойдённый атлет", "channel_divinity", kind="bonus"),
    ],
    "paladin__oath-of-the-noble-genies": [
        SharedPoolOption("elemental-smite", "Стихийная кара", "channel_divinity", kind="bonus"),
    ],
    # Bard colleges — spend Bardic Inspiration
    "bard__lore": [
        SharedPoolOption("cutting-words", "Острые слова", "bardic_inspiration", kind="reaction"),
        SharedPoolOption(
            "peerless-skill", "Бесподобный навык", "bardic_inspiration", kind="passive", min_level=14
        ),
    ],
    "bard__glamour": [
        SharedPoolOption("mantle-of-inspiration", "Мантия вдохновения", "bardic_inspiration", kind="bonus"),
    ],
    "bard__valor": [
        SharedPoolOption("combat-inspiration", "Боевое вдохновение", "bardic_inspiration", kind="passive"),
    ],
    "bard__dance": [
        SharedPoolOption(
            "inspiring-movement", "Вдохновляющие движения", "bardic_inspiration", kind="reaction", min_level=6
        ),
        SharedPoolOption(
            "tandem-footwork", "Совместный танец", "bardic_inspiration", kind="reaction", min_level=6
        ),
    ],
    "bard__college-of-the-moon": [
        SharedPoolOption("moons-inspiration", "Вдохновение луны", "bardic_inspiration", kind="bonus"),
    ],
    "bard__college-of-the-spirits": [
        SharedPoolOption("spirits-from-beyond", "Духи извне", "bardic_inspiration", kind="bonus"),
    ],
    # Monk traditions — spend Focus Points
    "monk__warrior-of-the-hand": [
        SharedPoolOption(
            "open-hand-technique", "Техники открытой ладони", "focus_points", cost=0, kind="passive"
        ),
        SharedPoolOption(
            "fleet-step", "Быстрые ноги", "focus_points", cost=0, kind="bonus", min_level=11
        ),
        SharedPoolOption(
            "quivering-palm", "Дрожащая ладонь", "focus_points", cost=4, kind="action", min_level=17
        ),
    ],
    "monk__warrior-of-mercy": [
        SharedPoolOption("hand-of-healing", "Исцеляющая рука", "focus_points", kind="action"),
        SharedPoolOption("hand-of-harm", "Повреждающая рука", "focus_points", kind="passive"),
        SharedPoolOption(
            "flurry-of-healing-and-harm",
            "Шквал исцеления и повреждения",
            "flurry_of_healing_and_harm",
            kind="passive",
            min_level=11,
        ),
        SharedPoolOption(
            "hand-of-ultimate-mercy",
            "Рука абсолютного милосердия",
            "focus_points",
            cost=5,
            kind="action",
            min_level=17,
        ),
    ],
    "monk__warrior-of-shadow": [
        SharedPoolOption("shadow-arts", "Тёмные искусства", "focus_points", kind="action"),
        SharedPoolOption("shadow-step", "Шаг в тень", "focus_points", cost=0, kind="bonus", min_level=6),
        SharedPoolOption(
            "improved-shadow-step",
            "Улучшенный шаг в тень",
            "focus_points",
            cost=1,
            kind="bonus",
            min_level=11,
        ),
        SharedPoolOption(
            "cloak-of-shadows",
            "Покров теней",
            "focus_points",
            cost=3,
            kind="bonus",
            min_level=17,
        ),
    ],
    "monk__warrior-of-the-elements": [
        SharedPoolOption("elemental-attunement", "Сродство со стихиями", "focus_points", kind="bonus"),
        SharedPoolOption(
            "elemental-burst",
            "Стихийный выброс",
            "focus_points",
            cost=2,
            kind="action",
            min_level=6,
        ),
        SharedPoolOption(
            "elemental-epitome",
            "Воплощение стихий",
            "focus_points",
            cost=0,
            kind="passive",
            min_level=17,
        ),
    ],
    "monk__warrior-of-the-mystic-arts": [
        SharedPoolOption("mystic-focus", "Мистический фокус", "focus_points", kind="bonus", min_level=6),
        SharedPoolOption(
            "focused-strike", "Сосредоточенный удар", "focus_points", kind="passive", min_level=11
        ),
    ],
    # Druid — Wild Shape spends
    "druid__land": [
        SharedPoolOption("lands-aid", "Помощь земли", "wild_shape", kind="action"),
        SharedPoolOption(
            "natures-sanctuary", "Природное убежище", "wild_shape", kind="action", min_level=14
        ),
    ],
    "druid__stars": [
        SharedPoolOption("starry-form", "Звёздный облик", "wild_shape", kind="bonus"),
    ],
    "druid__sea": [
        SharedPoolOption("wrath-of-the-sea", "Гнев моря", "wild_shape", kind="bonus"),
    ],
    # Sorcerer — Sorcery Points
    "sorcerer__wild-magic-sorcery": [
        SharedPoolOption("bend-luck", "Искривление удачи", "sorcery_points", cost=1, kind="reaction", min_level=6),
    ],
    "sorcerer__clockwork-sorcery": [
        SharedPoolOption(
            "bastion-of-law",
            "Бастион закона",
            "sorcery_points",
            cost=1,
            cost_max=5,
            kind="action",
            min_level=6,
        ),
    ],
    "sorcerer__aberrant-sorcery": [
        SharedPoolOption(
            "psionic-sorcery", "Псионическое чародейство", "sorcery_points", kind="passive", min_level=6
        ),
        SharedPoolOption(
            "revelation-in-flesh",
            "Откровение во плоти",
            "sorcery_points",
            cost=1,
            cost_max=4,
            kind="bonus",
            min_level=14,
        ),
    ],
    "sorcerer__spellfire-sorcery": [
        SharedPoolOption("spellfire-burst", "Вспышка огня заклинаний", "sorcery_points", kind="bonus"),
    ],
    "sorcerer__shadow-sorcery": [
        SharedPoolOption(
            "beasts-of-ill-omen", "Звери дурного знамения", "sorcery_points", kind="action", min_level=6
        ),
    ],
    # Fighter Banneret — rides Second Wind
    "fighter__banneret": [
        SharedPoolOption("group-recovery", "Групповое оздоровление", "second_wind", kind="passive"),
    ],
}


def shared_options_for_subclass(
    subclass_slug: str,
    class_level: int,
) -> list[SharedPoolOption]:
    rows = SHARED_OPTIONS.get(subclass_slug) or []
    return [r for r in rows if class_level >= r.min_level]


def channel_option_ids_for_subclass(subclass_slug: str, class_level: int) -> list[str]:
    return [
        r.feature_id.replace("-", "_")
        for r in shared_options_for_subclass(subclass_slug, class_level)
        if r.spend_pool == "channel_divinity"
    ]


# ---------------------------------------------------------------------------
# Permanent bonuses (applied in calculations)
# ---------------------------------------------------------------------------

def build_permanent_bonuses(
    subclass_slug: str,
    class_level: int,
    *,
    abilities: Mapping[str, int] | None = None,
) -> list[PermanentBonus]:
    abilities = abilities or {}
    out: list[PermanentBonus] = []

    def add(
        feature_id: str,
        name_ru: str,
        kind: str,
        value: Any,
        *,
        min_level: int = 3,
        note_ru: str = "",
    ) -> None:
        if class_level < min_level:
            return
        out.append(
            PermanentBonus(
                feature_id=feature_id,
                name_ru=name_ru,
                kind=kind,
                value=value,
                min_level=min_level,
                note_ru=note_ru,
            )
        )

    # Fighter Champion (PHB 2024 names — Игорь 18.11.2026)
    if subclass_slug == "fighter__champion":
        add(
            "improved-critical",
            "Улучшенный критический удар",
            "crit_threshold",
            19,
            note_ru="Крит на 19–20 (оружие и безоружные)",
        )
        if class_level >= 15:
            add(
                "superior-critical",
                "Превосходный критический удар",
                "crit_threshold",
                18,
                min_level=15,
                note_ru="Крит на 18–20 (оружие и безоружные)",
            )
        add(
            "remarkable-athlete",
            "Выдающийся атлет",
            "initiative_advantage",
            True,
            note_ru="Преимущество к инициативе и Атлетике; после крита — ½ скорости без провокации",
        )
        if class_level >= 10:
            add(
                "heroic-warrior",
                "Героический воин",
                "other_calc",
                {"grant_heroic_inspiration_start_of_turn": True},
                min_level=10,
                note_ru="В начале хода в бою, если нет Героического вдохновения — получаете его",
            )
        if class_level >= 18:
            add(
                "survivor",
                "Вызов смерти",
                "other_calc",
                {
                    "death_save_advantage": True,
                    "death_save_18_plus_is_20": True,
                    "regen_bloodied": True,
                    "regen_formula": "5+con",
                },
                min_level=18,
                note_ru="Отрицание смерти + Героическая крепость (5+ТЕЛ при окровавленности)",
            )

    # Bard College of Dance (2024): unarmored AC 10 + Dex + Cha (no armor, no shield).
    if subclass_slug == "bard__dance":
        add(
            "dazzling-footwork",
            "Ослепительные фуэте: Защита без доспехов",
            "ac_formula",
            {"base": 10, "mods": ["dex", "cha"], "allows_shield": False, "requires_no_armor": True},
            note_ru="КД 10+Лов+Хар без доспеха и щита",
        )

    # Sorcerer Draconic
    if subclass_slug == "sorcerer__draconic-sorcery":
        add(
            "draconic-resilience",
            "Драконья устойчивость",
            "ac_formula",
            {"base": 10, "mods": ["dex", "cha"], "allows_shield": True, "requires_no_armor": True},
            note_ru="КД 10+Лов+Хар без доспеха",
        )
        add(
            "draconic-resilience",
            "Драконья устойчивость (хиты)",
            "hp_per_level",
            1,
            note_ru="+3 на 3 ур. чародея, затем +1 за уровень (на N сумма +N; next.dnd.su)",
        )
        add(
            "elemental-affinity",
            "Родство со стихией",
            "other_calc",
            {"resistance_chosen": True, "damage_bonus_cha_once": True},
            min_level=6,
            note_ru="Сопротивление выбранному типу постоянно; +Хар к одному броску урона этого типа",
        )

    if subclass_slug == "sorcerer__aberrant-sorcery":
        add(
            "psychic-defenses",
            "Психическая защита",
            "other_calc",
            {"psychic_resistance": True, "adv_vs_charmed_frightened": True},
            min_level=6,
            note_ru="Сопротивление психическому; преимущество против Очарованный/Испуганный",
        )

    # Wizard subclasses (PHB 2024)
    if subclass_slug == "wizard__evoker":
        add(
            "potent-cantrip",
            "Мощные заговоры",
            "other_calc",
            {"half_damage_on_miss_or_save": True, "cantrips_only": True},
            min_level=3,
            note_ru="Промах или успех спасброска по заговору: цель получает половину урона, без доп. эффектов",
        )
        add(
            "sculpt-spells",
            "Построение заклинаний",
            "other_calc",
            {"school": "evocation", "protected_creatures": "1+spell_level", "auto_save": True},
            min_level=6,
            note_ru="Воплощение: 1 + круг существ автоматически преуспевают в спасброске и не получают урона",
        )
        add(
            "empowered-evocation",
            "Усиленное воплощение",
            "damage_rider",
            {"add_ability": "int", "school": "evocation", "once_per_spell": True},
            min_level=10,
            note_ru="+мод. Инт к одному броску урона воплощения",
        )
    if subclass_slug == "wizard__abjurer":
        int_m = ability_mod(int(abilities.get("int") or 10))
        add(
            "arcane-ward",
            "Волшебный щит (формула)",
            "other_calc",
            {"ward_max": class_level * 2 + int_m},
            note_ru="Макс. хитов щита = 2×ур.+мод. Инт",
        )
        add(
            "projected-ward",
            "Проецированный щит",
            "other_calc",
            {"reaction": True, "range_ft": 30, "needs_active_ward": True},
            min_level=6,
            note_ru="Реакция: щит поглощает урон существа в 30 фт",
        )
        add(
            "spell-breaker",
            "Разрушитель заклинаний",
            "other_calc",
            {
                "always_prepared": ["counterspell", "dispel-magic"],
                "dispel_bonus_action": True,
                "add_proficiency_to_check": True,
                "refund_slot_if_not_stopped": True,
            },
            min_level=10,
            note_ru="Рассеивание — бонусным; +Бонус мастерства к проверке; не остановили — ячейка не тратится",
        )
        add(
            "spell-resistance",
            "Сопротивление заклинаниям",
            "other_calc",
            {"save_advantage_vs_spells": True, "damage_resistance_from_spells": True},
            min_level=14,
            note_ru="Преимущество на спасброски от заклинаний и сопротивление их урону",
        )
    if subclass_slug == "wizard__diviner":
        add(
            "expert-divination",
            "Эксперт прорицания",
            "other_calc",
            {"school": "divination", "min_slot": 2, "restore_below_slot": True, "restore_max_level": 5},
            min_level=6,
            note_ru="Прорицание 2+ круга: вернуть ячейку ниже (не выше 5 круга)",
        )
        add(
            "greater-portent",
            "Великое знамение",
            "other_calc",
            {"portent_dice": 3},
            min_level=14,
            note_ru="Три кости Знамения",
        )
    if subclass_slug == "wizard__illusionist":
        add(
            "improved-illusions",
            "Улучшенные иллюзии",
            "other_calc",
            {
                "school": "illusion",
                "no_verbal": True,
                "range_bonus_ft": 60,
                "range_min_ft": 10,
                "grant_cantrip": "minor-illusion",
                "minor_illusion_bonus_action": True,
                "minor_illusion_sound_and_image": True,
            },
            min_level=3,
            note_ru="Иллюзии без Вербального; дальность +60 фт (от 10 фт); Малая иллюзия бонусным, звук и образ вместе",
        )
        add(
            "phantasmal-creatures",
            "Призрачные существа",
            "other_calc",
            {
                "always_prepared": ["summon-beast", "summon-fey"],
                "free_illusion_cast_each": "long",
                "creature_hp_factor": 0.5,
            },
            min_level=6,
            note_ru="Вызов зверя и Вызов феи: по разу без ячейки (версия иллюзии), хиты существа вдвое меньше",
        )
        add(
            "illusory-reality",
            "Иллюзорная реальность",
            "other_calc",
            {"bonus_action": True, "duration_min": 1, "requires": "illusion_spell_with_slot"},
            min_level=14,
            note_ru="Бонусным: неживой предмет иллюзии становится реальным на 1 мин",
        )

    # Ranger Gloom Stalker
    if subclass_slug == "ranger__gloom-stalker":
        add(
            "dread-ambusher",
            "Угроза из засады (инициатива)",
            "initiative_mod",
            "wis",
            note_ru="+мод. Мудр к инициативе",
        )
        add(
            "dread-ambusher",
            "Угроза из засады (скорость)",
            "speed",
            {"first_turn_bonus_ft": 10},
            note_ru="+10 фт скорости в первом ходу боя",
        )

    # Ranger Fey Wanderer
    if subclass_slug == "ranger__fey-wanderer":
        die = "d6" if class_level >= 11 else "d4"
        add(
            "dreadful-strikes",
            "Ужасающие удары",
            "damage_rider",
            {"dice": f"1{die}", "type": "psychic", "once_per_turn_per_target": True},
            note_ru=f"Доп. психический урон 1{die} раз за ход на цель",
        )
        add(
            "otherworldly-glamour",
            "Иной блеск",
            "other_calc",
            {"cha_check_bonus": "wis"},
            note_ru="+мод. Мудр к проверкам Харизмы (мин. +1)",
        )

    # Barbarian Berserker — 2024: dice count = Rage Damage bonus (not PB).
    if subclass_slug == "barbarian__berserker":
        add(
            "frenzy",
            "Безумие",
            "damage_rider",
            {
                "while_raging": True,
                "requires_reckless_attack": True,
                "dice_count_from": "rage_damage",
                "die": "d6",
                "first_str_hit": True,
                "not_proficiency_bonus": True,
            },
            note_ru="В ярости + Безрассудная атака: число к6 = бонус Урона ярости (не БМ)",
        )

    # Barbarian Zealot
    if subclass_slug == "barbarian__zealot":
        add(
            "divine-fury",
            "Божественная ярость",
            "damage_rider",
            {"while_raging": True, "dice": "1d6", "plus_half_level": True, "once_per_turn": True},
            note_ru="В ярости: +1к6 + пол-уровня к первой попавшей атаке за ход",
        )

    # Barbarian Wild Heart / World Tree — rage options are calc toggles
    if subclass_slug == "barbarian__wild-heart":
        add(
            "rage-of-the-wilds",
            "Ярость дикой природы",
            "other_calc",
            {"rage_options": True},
            note_ru="Опции ярости (Волк / Медведь / Орёл) — в расчётах стола",
        )
    if subclass_slug == "barbarian__world-tree":
        add(
            "vitality-of-the-tree",
            "Жизненная сила Древа",
            "other_calc",
            {"temp_hp_on_rage": True},
            note_ru="Временные хиты при входе в ярость = уровень варвара",
        )

    # Rogue Assassin — 2024 Assassinate (NOT 2014 auto-crit on surprised).
    if subclass_slug == "rogue__assassin":
        add(
            "assassinate",
            "Убийство",
            "other_calc",
            {
                "initiative_advantage": True,
                "advantage_vs_not_yet_acted_round_1": True,
                "sneak_attack_extra_damage_equals_rogue_level_round_1": True,
                "crit_vs_surprised": False,
            },
            note_ru="2024: преим. к инициативе; преим. vs ещё не ходивших в 1-м раунде; доп. урон Скрытой = ур. плута. Без авто-крита по surprised (это 2014).",
        )
        if class_level >= 9:
            add(
                "infiltration-expertise",
                "Мастерство внедрения",
                "other_calc",
                {
                    "steady_aim_allows_moved": True,
                    "steady_aim_no_speed_0": True,
                },
                min_level=9,
                note_ru="Точное прицеливание: можно после движения; скорость не становится 0",
            )
        if class_level >= 13:
            add(
                "envenom-weapon",
                "Покрытое ядом оружие",
                "damage_rider",
                {
                    "enhances_cunning_poison": True,
                    "poison_damage_on_failed_save": "2d6",
                    "ignore_poison_resistance": True,
                    "once_per_turn": True,
                },
                min_level=13,
                note_ru=(
                    "Усиливает «Отравление» хитрого удара: при провале спаса — 2к6 яда; "
                    "игнор сопротивления к яду"
                ),
            )
        if class_level >= 17:
            add(
                "death-strike",
                "Смертельный удар",
                "other_calc",
                {
                    "on_sneak_attack_round_1": True,
                    "con_save_or_double_damage": True,
                    "not_2014_surprised": True,
                    "partial": True,
                },
                min_level=17,
                note_ru=(
                    "При Скрытой атаке в первом раунде: спас Тел. или удвоенный урон "
                    "(не «захваченный врасплох» 2014)"
                ),
            )

    # Rogue Thief
    if subclass_slug == "rogue__thief":
        add(
            "fast-hands",
            "Быстрые руки",
            "other_calc",
            {
                "bonus_action_use_object": True,
                "bonus_sleight": True,
                "bonus_magic_item_action": True,
                "via_cunning_action": True,
            },
            note_ru="Хитрое действие: Ловкость рук, Использование предмета, действие магического предмета",
        )
        add(
            "second-story-work",
            "Работа на высоте",
            "speed",
            {"climb_equals_speed": True, "jump_distance_bonus_dex": True},
            note_ru="Лазание = скорость; прыжок + мод. Ловкости",
        )
        if class_level >= 9:
            add(
                "supreme-sneak",
                "Превосходная скрытность",
                "other_calc",
                {"cunning_strike_option": "supreme-sneak", "cost_dice": 1},
                min_level=9,
                note_ru="Опция Хитрого удара «Скрытная атака» (1 кость): преим. к Скрытности",
            )
        if class_level >= 13:
            add(
                "use-magic-device",
                "Использование магических устройств",
                "other_calc",
                {
                    "attunement_slots": 4,
                    "charge_save_die": "1d6",
                    "charge_save_on": 6,
                    "scroll_ability": "int",
                    "ignore_class_spell_lists": True,
                },
                min_level=13,
                note_ru=(
                    "Настройка на четыре предмета; при трате заряда — 1к6, на 6 заряд не тратится; "
                    "свитки через Интеллект (заговор/1-й без проверки; выше 1-го — проверка "
                    "Интеллекта Сл 10 + уровень заклинания)"
                ),
            )
        if class_level >= 17:
            add(
                "thiefs-reflexes",
                "Рефлексы вора",
                "other_calc",
                {"two_turns_round_1": True},
                min_level=17,
                note_ru="В первом раунде боя — два хода (инициатива и инициатива −10)",
            )

    # Druid Moon — circle forms CR / AC
    if subclass_slug == "druid__moon":
        add(
            "circle-forms",
            "Облики Круга",
            "other_calc",
            {
                "wild_shape_cr_div": 3,
                "ac": {"base": 13, "mods": ["wis"]},
            },
            note_ru="ПО облика ≤ ур./3; КД max(зверь, 13+Мудр)",
        )

    # Ranger Beast Master companion scales with level/PB
    if subclass_slug == "ranger__beastmaster":
        add(
            "primal-companion",
            "Первичный спутник",
            "other_calc",
            {"companion_scales_with_level": True, "companion_scales_with_pb": True},
            note_ru="Статблок спутника по уровню и БМ",
        )

    # Ranger Hunter — choice features (tracked as calc picks)
    if subclass_slug == "ranger__hunter-ranger":
        add(
            "hunters-prey",
            "Добыча охотника",
            "other_calc",
            {"choice": True},
            note_ru="Выбор опции добычи/защиты — в расчётах",
        )
        if class_level >= 7:
            add(
                "defensive-tactics",
                "Оборонительная тактика",
                "other_calc",
                {"choice": True},
                min_level=7,
            )

    # Paladin Aura of Protection (class L6) — oath auras share this radius; L18 expands to 30 ft.
    if subclass_slug.startswith("paladin__") and class_level >= 18:
        add(
            "aura-expansion",
            "Расширение ауры",
            "aura_radius",
            {"ft": 30},
            min_level=18,
            note_ru="Аура защиты и ауры клятвы: 30 фт",
        )
    elif subclass_slug.startswith("paladin__") and class_level >= 6:
        add(
            "aura-of-protection",
            "Аура защиты",
            "aura_radius",
            {"ft": 10},
            min_level=6,
            note_ru="Радиус ауры 10 фт (30 с 18 ур.)",
        )

    # Warlock Fiend — Dark One's Blessing temp HP formula (trigger, not pool)
    if subclass_slug == "warlock__fiend-patron":
        cha_m = ability_mod(int(abilities.get("cha") or 10))
        add(
            "dark-ones-blessing",
            "Благословение темнейшего",
            "other_calc",
            {
                "temp_hp": max(1, cha_m + class_level),
                "on_reduce_enemy_to_0": True,
                "ally_kill_within_ft": 10,
            },
            note_ru=(
                "Врем. хиты = Хар + ур. колдуна (мин. 1), когда ты или союзник "
                "в пределах 10 фт. опускаете врага до 0 хитов"
            ),
        )

    # Light domain improved flare is a calc rider on the warding_flare pool
    if subclass_slug == "cleric__light-domain" and class_level >= 6:
        add(
            "improved-warding-flare",
            "Улучшенная ограждающая вспышка",
            "other_calc",
            {"reset_short": True, "temp_hp": "2d6+wis"},
            min_level=6,
            note_ru="Сброс вспышки на коротком; врем. хиты союзнику",
        )

    # Wizard Necromancer — thrall HP/damage scale with wizard level
    if subclass_slug == "wizard__necromancer" and class_level >= 6:
        add(
            "undead-thralls",
            "Неживые слуги",
            "other_calc",
            {"thrall_bonus_hp_per_wizard_level": True, "thrall_damage_bonus": True},
            min_level=6,
            note_ru="Бонус хитов/урона слуг по уровню волшебника",
        )

    return out


# ---------------------------------------------------------------------------
# Own spend pools
# ---------------------------------------------------------------------------

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
    str_m = ability_mod(int(abilities.get("str") or 10))
    dex_m = ability_mod(int(abilities.get("dex") or 10))
    con_m = ability_mod(int(abilities.get("con") or 10))
    int_m = ability_mod(int(abilities.get("int") or 10))
    wis_m = ability_mod(int(abilities.get("wis") or 10))
    cha_m = ability_mod(int(abilities.get("cha") or 10))
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
        track: str = "spend",
        extra_meta: dict[str, Any] | None = None,
        min_level: int = 3,
    ) -> None:
        if class_level < min_level or max_uses <= 0:
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
                track=track,
                short_rest_regain=short_rest_regain,
                on_hot=on_hot,
                meta=meta,
            )
        )

    # --- Fighter ---
    if subclass_slug == "fighter__battlemaster":
        add(
            "superiority_dice",
            name_ru="Кости превосходства",
            max_uses=_scale_uses(class_level, {3: 4, 7: 5, 15: 6}),
            reset="short",
            feature_id="combat-superiority",
            extra_meta={"die": _superiority_die(class_level)},
        )
        if class_level >= 7:
            add(
                "know_your_enemy",
                name_ru="Знай своего врага",
                max_uses=1,
                reset="long",
                feature_id="know-your-enemy",
                min_level=7,
                extra_meta={
                    "note_ru": "Бонусным: иммунитеты/сопротивления/уязвимости в 30 фт.; "
                    "можно восстановить, потратив кость превосходства",
                    "refund_with_pool": "superiority_dice",
                },
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
        if subclass_slug == "fighter__psi-warrior":
            if class_level >= 3:
                add(
                    "telekinetic_movement",
                    name_ru="Телекинетическое передвижение",
                    max_uses=1,
                    reset="short",
                    feature_id="psionic-power",
                    min_level=3,
                    extra_meta={"refund_with_pool": "psionic_energy_dice"},
                )
            if class_level >= 7:
                add(
                    "psi_powered_leap",
                    name_ru="Усиленный пси прыжок",
                    max_uses=1,
                    reset="short",
                    feature_id="telekinetic-adept",
                    min_level=7,
                    extra_meta={"refund_with_pool": "psionic_energy_dice"},
                )
            if class_level >= 15:
                add(
                    "bulwark_of_force",
                    name_ru="Оплот силы",
                    max_uses=1,
                    reset="long",
                    feature_id="bulwark-of-force",
                    min_level=15,
                    extra_meta={
                        "effect": "half_cover",
                        "note_ru": "Укрытие наполовину (не временные хиты)",
                        "refund_with_pool": "psionic_energy_dice",
                    },
                )
            if class_level >= 18:
                add(
                    "telekinetic_master",
                    name_ru="Мастер телекинеза",
                    max_uses=1,
                    reset="long",
                    feature_id="telekinetic-master",
                    min_level=18,
                    extra_meta={"refund_with_pool": "psionic_energy_dice", "spell": "telekinesis"},
                )
        if subclass_slug == "rogue__soulknife":
            if class_level >= 13:
                add(
                    "psychic_veil",
                    name_ru="Психическая завеса",
                    max_uses=1,
                    reset="long",
                    feature_id="psychic-veil",
                    min_level=13,
                    extra_meta={
                        "refund_with_pool": "psionic_energy_dice",
                        "refund_cost": 1,
                        "note_ru": "Невидимость 1 ч.; можно восстановить, потратив кость пси-энергии",
                    },
                )
            if class_level >= 17:
                add(
                    "rend_mind",
                    name_ru="Разрыв разума",
                    max_uses=1,
                    reset="long",
                    feature_id="rend-mind",
                    min_level=17,
                    extra_meta={
                        "refund_with_pool": "psionic_energy_dice",
                        "refund_cost": 3,
                        "note_ru": "При попадании психическим клинком: спас Муд. или Ошеломлён; восстановить за 3 кости",
                    },
                )
    elif subclass_slug == "rogue__arcane-trickster" and class_level >= 17:
        add(
            "spell_thief",
            name_ru="Похититель заклинаний",
            max_uses=1,
            reset="long",
            feature_id="spell-thief",
            min_level=17,
            extra_meta={
                "note_ru": "Реакция: украсть заклинание, нацеленное на вас (1 / долгий)",
            },
        )
    elif subclass_slug == "fighter__arcane-archer":
        add(
            "arcane_shot",
            name_ru="Чародейный выстрел",
            max_uses=max(1, int_m),
            reset="long",
            feature_id="arcane-shot",
        )

    # --- Artificer ---
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
                name_ru="Восстанавливающие реагенты",
                max_uses=max(1, int_m),
                reset="long",
                feature_id="restorative-reagents",
                min_level=9,
            )
    elif subclass_slug == "artificer__artillerist":
        add(
            "eldritch_cannon",
            name_ru="Мистическая пушка",
            max_uses=1,
            reset="long",
            feature_id="eldritch-cannon",
        )
    elif subclass_slug == "artificer__battle-smith":
        add(
            "steel_defender",
            name_ru="Стальной защитник",
            max_uses=1,
            reset="long",
            feature_id="steel-defender",
            on_hot=False,
        )
        if class_level >= 9:
            add(
                "arcane_jolt",
                name_ru="Магический импульс",
                max_uses=max(1, int_m),
                reset="long",
                feature_id="arcane-jolt",
                min_level=9,
            )
    elif subclass_slug == "artificer__armorer":
        pass  # armor model is choice/calc, not a spend pool
    elif subclass_slug == "artificer__cartographer":
        add(
            "adventure_atlas",
            name_ru="Атлас приключений",
            max_uses=max(1, int_m),
            reset="long",
            feature_id="adventure-atlas",
        )
    elif subclass_slug == "artificer__reanimator":
        add(
            "reanimated_companion",
            name_ru="Оживлённый спутник",
            max_uses=1,
            reset="long",
            feature_id="reanimated-companion",
            on_hot=False,
        )

    # --- Cleric own pools ---
    elif subclass_slug == "cleric__light-domain":
        reset = "short" if class_level >= 6 else "long"
        add(
            "warding_flare",
            name_ru="Ограждающая вспышка",
            max_uses=max(1, wis_m),
            reset=reset,
            feature_id="warding-flare",
            extra_meta={"improved_from_level": 6, "temp_hp_on_use_from_level": 6},
        )
        if class_level >= 17:
            add(
                "corona_of_light",
                name_ru="Корона света",
                max_uses=max(1, wis_m),
                reset="long",
                feature_id="corona-of-light",
                min_level=17,
            )
    elif subclass_slug == "cleric__war-domain":
        add(
            "war_priest",
            name_ru="Боевой священник",
            max_uses=max(1, wis_m),
            reset="short",
            feature_id="war-priest",
        )

    # --- Warlock ---
    elif subclass_slug == "warlock__celestial-patron":
        add(
            "healing_light",
            name_ru="Лечащий свет",
            max_uses=1 + class_level,
            reset="long",
            feature_id="healing-light",
            extra_meta={
                "die": "d6",
                "per_use_cap_ability": "cha",
                "per_use_cap_min": 1,
            },
        )
        if class_level >= 14:
            add(
                "searing_vengeance",
                name_ru="Опаляющее возмездие",
                max_uses=1,
                reset="long",
                feature_id="searing-vengeance",
                min_level=14,
            )
    elif subclass_slug == "warlock__archfey":
        add(
            "steps_of_the_fey",
            name_ru="Шаг феи",
            max_uses=max(1, cha_m),
            reset="long",
            feature_id="steps-of-the-fey",
        )
        if class_level >= 10:
            add(
                "beguiling_defenses",
                name_ru="Чарующая защита",
                max_uses=1,
                reset="long",
                feature_id="beguiling-defenses",
                min_level=10,
            )
    elif subclass_slug == "warlock__fiend-patron":
        if class_level >= 6:
            add(
                "dark_ones_own_luck",
                name_ru="Удача темнейшего",
                max_uses=max(1, cha_m),
                reset="long",
                feature_id="dark-ones-own-luck",
                min_level=6,
            )
        if class_level >= 14:
            add(
                "hurl_through_hell",
                name_ru="Бросок через преисподнюю",
                max_uses=1,
                reset="long",
                feature_id="hurl-through-hell",
                min_level=14,
            )
    elif subclass_slug == "warlock__greate-old-one-patron":
        if class_level >= 6:
            add(
                "clairvoyant_combatant",
                name_ru="Провидящий боец",
                max_uses=1,
                reset="short",
                feature_id="clairvoyant-combatant",
                min_level=6,
            )
    elif subclass_slug == "warlock__undead":
        add(
            "form_of_dread",
            name_ru="Аватар ужаса",
            max_uses=max(1, cha_m),
            reset="long",
            feature_id="form-of-dread",
        )
    elif subclass_slug == "warlock__vestige-patron":
        add(
            "vestige_companion",
            name_ru="Спутник-отголосок",
            max_uses=1,
            reset="long",
            feature_id="vestige-companion",
            on_hot=False,
        )

    # --- Wizard ---
    elif subclass_slug == "wizard__abjurer":
        add(
            "arcane_ward",
            name_ru="Волшебный щит",
            max_uses=class_level * 2 + int_m,
            reset="long",
            feature_id="arcane-ward",
            track="stock",
            on_hot=True,
            extra_meta={
                # 2024: max = Int mod + (wizard level × 2); create/restore on Abjuration slot cast.
                "ward_formula": "int + 2*level",
                "create_on": "abjuration_spell_with_slot",
                "restore_on_abjuration_slot": "2*slot_level",
                "ends_on": "long_rest",
                "starts_uncreated": True,
                "repair_bonus_action_slot": "2*slot_level",
            },
        )
    elif subclass_slug == "wizard__diviner":
        add(
            "portent",
            name_ru="Знамение",
            max_uses=3 if class_level >= 14 else 2,
            reset="long",
            feature_id="portent",
            track="stock",
            extra_meta={"die": "d20", "decide_before_roll": True, "once_per_turn": True},
        )
        add(
            "the_third_eye",
            name_ru="Третий глаз",
            max_uses=1,
            reset="short",
            feature_id="the-third-eye",
            min_level=10,
            extra_meta={"modes": ["darkvision_120", "greater_comprehension", "see_invisibility"]},
        )
    elif subclass_slug == "wizard__evoker" and class_level >= 14:
        add(
            "overchannel",
            name_ru="Перегрузка",
            max_uses=1,
            reset="long",
            feature_id="overchannel",
            min_level=14,
            on_hot=False,
            extra_meta={
                "first_use_free": True,
                "repeat_necrotic_die": "d12",
                "repeat_dice_per_slot_level_start": 2,
                "repeat_dice_step": 1,
                "max_slot_level": 5,
            },
        )
    elif subclass_slug == "wizard__illusionist" and class_level >= 10:
        add(
            "illusory_self",
            name_ru="Собственная иллюзорность",
            max_uses=1,
            reset="short",
            feature_id="illusory-self",
            min_level=10,
        )
    elif subclass_slug == "wizard__conjurer":
        add(
            "benign_transposition",
            name_ru="Безопасный перенос",
            max_uses=1,
            reset="long",
            feature_id="benign-transposition",
        )
    elif subclass_slug == "wizard__enchanter":
        add(
            "hypnotic_presence",
            name_ru="Гипнотическое присутствие",
            max_uses=1,
            reset="long",
            feature_id="hypnotic-presence",
        )
    elif subclass_slug == "wizard__bladesinger":
        add(
            "bladesong",
            name_ru="Песнь клинка",
            max_uses=max(1, int_m),
            reset="long",
            feature_id="bladesong",
        )
    elif subclass_slug == "wizard__transmuter":
        add(
            "transmuters_stone",
            name_ru="Камень преобразителя",
            max_uses=1,
            reset="long",
            feature_id="transmuter-s-stone",
            on_hot=False,
        )

    # --- Sorcerer ---
    elif subclass_slug == "sorcerer__wild-magic-sorcery":
        add(
            "tides_of_chaos",
            name_ru="Волны хаоса",
            max_uses=1,
            reset="long",
            feature_id="tides-of-chaos",
        )
        if class_level >= 18:
            add(
                "tamed_wild_surge",
                name_ru="Укрощённый всплеск дикой магии",
                max_uses=1,
                reset="long",
                feature_id="tamed-surge",
                min_level=18,
                on_hot=False,
            )
    elif subclass_slug == "sorcerer__clockwork-sorcery":
        add(
            "restore_balance",
            name_ru="Восстановление баланса",
            max_uses=max(1, cha_m),
            reset="long",
            feature_id="restore-balance",
        )
        if class_level >= 14:
            add(
                "trance_of_order",
                name_ru="Транс упорядоченности",
                max_uses=1,
                reset="long",
                feature_id="trance-of-order",
                min_level=14,
                extra_meta={"restore_sp_cost": 5},
            )
        if class_level >= 18:
            add(
                "clockwork_cavalcade",
                name_ru="Заводная кавалькада",
                max_uses=1,
                reset="long",
                feature_id="clockwork-cavalcade",
                min_level=18,
                on_hot=False,
                extra_meta={"restore_sp_cost": 7},
            )
    elif subclass_slug == "sorcerer__shadow-sorcery":
        add(
            "power_of_shadow",
            name_ru="Сила тени",
            max_uses=max(1, cha_m),
            reset="long",
            feature_id="power-of-shadow",
        )
    elif subclass_slug == "sorcerer__aberrant-sorcery":
        add(
            "telepathic_speech",
            name_ru="Телепатическая речь",
            max_uses=1,
            reset="long",
            feature_id="telepathic-speech",
            on_hot=False,
            extra_meta={"duration_minutes_eq_level": True, "range_miles_eq_cha_mod": True},
        )
        if class_level >= 18:
            add(
                "warping_explosion",
                name_ru="Искажающий взрыв",
                max_uses=1,
                reset="long",
                feature_id="warping-explosion",
                min_level=18,
                on_hot=False,
                extra_meta={"restore_sp_cost": 5},
            )
    elif subclass_slug == "sorcerer__draconic-sorcery":
        if class_level >= 14:
            add(
                "dragon_wings",
                name_ru="Крылья дракона",
                max_uses=1,
                reset="long",
                feature_id="dragon-wings",
                min_level=14,
                extra_meta={"restore_sp_cost": 3, "fly_speed_ft": 60, "duration_hours": 1},
            )
        if class_level >= 18:
            add(
                "dragon_companion",
                name_ru="Дракон-спутник",
                max_uses=1,
                reset="long",
                feature_id="dragon-companion",
                min_level=18,
                on_hot=False,
                extra_meta={"free_summon_dragon": True},
            )

    # --- Druid ---
    elif subclass_slug == "druid__stars":
        add(
            "star_map_guiding_bolt",
            name_ru="Звёздная карта (Направляющий снаряд)",
            max_uses=max(1, wis_m),
            reset="long",
            feature_id="star-map",
        )
        if class_level >= 6:
            add(
                "cosmic_omen",
                name_ru="Космическое знамение",
                max_uses=max(1, wis_m),
                reset="long",
                feature_id="cosmic-omen",
                min_level=6,
            )
    elif subclass_slug == "druid__land" and class_level >= 6:
        add(
            "natural_recovery",
            name_ru="Естественное восстановление",
            max_uses=1,
            reset="long",
            feature_id="natural-recovery",
            min_level=6,
            on_hot=False,
            extra_meta={"also_short_rest_slot_recovery": True},
        )
    elif subclass_slug == "druid__moon" and class_level >= 10:
        add(
            "moonlight_step",
            name_ru="Шаг в лунный свет",
            max_uses=max(1, wis_m),
            reset="long",
            feature_id="moonlight-step",
            min_level=10,
        )

    # --- Monk ---
    elif subclass_slug == "monk__warrior-of-the-hand" and class_level >= 6:
        add(
            "wholeness_of_body",
            name_ru="Целостность тела",
            max_uses=max(1, wis_m),
            reset="long",
            feature_id="wholeness-of-body",
            min_level=6,
        )
    elif subclass_slug == "monk__warrior-of-mercy":
        if class_level >= 11:
            add(
                "flurry_of_healing_and_harm",
                name_ru="Шквал исцеления и повреждения",
                max_uses=max(1, wis_m),
                reset="long",
                feature_id="flurry-of-healing-and-harm",
                min_level=11,
            )
        if class_level >= 17:
            add(
                "hand_of_ultimate_mercy",
                name_ru="Рука абсолютного милосердия",
                max_uses=1,
                reset="long",
                feature_id="hand-of-ultimate-mercy",
                min_level=17,
            )

    # --- Ranger ---
    elif subclass_slug == "ranger__gloom-stalker":
        add(
            "dread_ambusher_strike",
            name_ru="Ужасающий удар",
            max_uses=max(1, wis_m),
            reset="long",
            feature_id="dread-ambusher",
            extra_meta={"damage": "2d6", "type": "psychic", "once_per_turn": True},
        )
    elif subclass_slug == "ranger__winter-walker":
        add(
            "hunters_rime",
            name_ru="Иней охотника",
            max_uses=max(1, wis_m),
            reset="long",
            feature_id="hunters-rime",
        )
    elif subclass_slug == "ranger__hollow-warden":
        add(
            "wrath_of_the_wild",
            name_ru="Гнев дикой природы",
            max_uses=max(1, wis_m),
            reset="long",
            feature_id="wrath-of-the-wild",
        )

    # --- Rogue ---
    elif subclass_slug == "rogue__phantom":
        add(
            "wails_from_the_grave",
            name_ru="Вопли из могилы",
            max_uses=pb,
            reset="long",
            feature_id="wails-from-the-grave",
        )
        if class_level >= 9:
            add(
                "tokens_of_the_departed",
                name_ru="Знаки ушедших",
                max_uses=pb,
                reset="long",
                feature_id="tokens-of-the-departed",
                track="stock",
                min_level=9,
            )
    elif subclass_slug == "rogue__scion-of-the-three":
        add(
            "bloodthirst",
            name_ru="Кровожадность",
            max_uses=max(1, cha_m),
            reset="long",
            feature_id="bloodthirst",
        )

    # --- Barbarian ---
    elif subclass_slug == "barbarian__zealot":
        # 2024 Warrior of the Gods: stock of d12 self-heal dice (not 2014 material-free raise).
        if class_level >= 3:
            wog = 7 if class_level >= 17 else 6 if class_level >= 12 else 5 if class_level >= 6 else 4
            add(
                "warrior_of_the_gods",
                name_ru="Воин богов",
                max_uses=wog,
                reset="long",
                feature_id="warrior-of-the-gods",
                min_level=3,
                extra_meta={"die": "d12", "track": "stock", "note": "Бонусным: потратить любые кости, хиты = сумма"},
            )
        if class_level >= 6:
            add(
                "fanatical_focus",
                name_ru="Фанатичный фокус",
                max_uses=1,
                reset="long",
                feature_id="fanatical-focus",
                min_level=6,
                extra_meta={"per_rage": True, "note": "1 раз за ярость; пул отражает доступность вне ярости"},
            )
        if class_level >= 10:
            add(
                "zealous_presence",
                name_ru="Ревностное присутствие",
                max_uses=1,
                reset="long",
                feature_id="zealous-presence",
                min_level=10,
            )
        if class_level >= 14:
            add(
                "rage_of_the_gods",
                name_ru="Ярость богов",
                max_uses=1,
                reset="long",
                feature_id="rage-of-the-gods",
                min_level=14,
            )

    # --- Bard extras ---
    elif subclass_slug == "bard__glamour":
        add(
            "beguiling_magic",
            name_ru="Чарующая магия",
            max_uses=1,
            reset="long",
            feature_id="beguiling-magic",
            min_level=3,
            extra_meta={"regain_by": "bardic_inspiration_use"},
        )
        add(
            "mantle_of_majesty",
            name_ru="Мантия величия",
            max_uses=1,
            reset="long",
            feature_id="mantle-of-majesty",
            min_level=6,
            extra_meta={"regain_by": "slot_3_plus"},
        )
        add(
            "unbreakable_majesty",
            name_ru="Несокрушимое величие",
            max_uses=1,
            reset="short",
            feature_id="unbreakable-majesty",
            min_level=14,
        )

    # --- Paladin oath spend pools ---
    if subclass_slug == "paladin__oath-of-glory" and class_level >= 15:
        cha_m = ability_mod(int(abilities.get("cha") or 10))
        add(
            "glorious_defense",
            name_ru="Славная оборона",
            max_uses=max(1, cha_m),
            reset="long",
            feature_id="glorious-defense",
            min_level=15,
            on_hot=True,
        )
    if subclass_slug == "paladin__oath-of-the-ancients" and class_level >= 15:
        add(
            "undying_sentinel",
            name_ru="Бессмертный страж",
            max_uses=1,
            reset="long",
            feature_id="undying-sentinel",
            min_level=15,
            on_hot=False,
        )

    # --- Paladin L20 capstones often 1/long (regain via 5th-circle slot) ---
    if subclass_slug.startswith("paladin__") and class_level >= 20:
        for block in sub["data"].get("features") or []:
            if int(block.get("level") or 0) != 20:
                continue
            for feat in block.get("features") or []:
                fid = str(feat.get("id") or "")
                if not fid:
                    continue
                add(
                    fid.replace("-", "_"),
                    name_ru=str(feat.get("name_ru") or fid),
                    max_uses=1,
                    reset="long",
                    feature_id=fid,
                    min_level=20,
                    on_hot=False,
                    extra_meta={"regain_by": "slot_5"},
                )

    _ = (str_m, dex_m, con_m, pb)  # available for future PB/ability pools
    return out


def always_prepared_for_subclass(
    subclass_slug: str | None,
    class_level: int,
    *,
    land_choice: str | None = None,
) -> list[str]:
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
    budget = THIRD_CASTER_SPELLS_KNOWN[lv - 1]
    # EK + Arcane Trickster 2024: prepare wizard spells (no enchantment/illusion-only lock).
    # Mystic Arts (monk) stays known-style.
    wizard_prepared = subclass_slug in {
        "fighter__eldritch-knight",
        "rogue__arcane-trickster",
    }
    return {
        "class_slug": subclass_parent(subclass_slug) or "class",
        "subclass_slug": subclass_slug,
        "progression": "third",
        "ability": meta["ability"],
        "name_ru": meta["name_ru"],
        "cantrips": THIRD_CASTER_CANTRIPS[lv - 1],
        "prepared_spells": budget if wizard_prepared else 0,
        "spells_known": 0 if wizard_prepared else budget,
        "slots": slots,
        "pact_slots": None,
        "always_prepared": [],
        "spell_list": "wizard" if wizard_prepared else None,
        "prepare_mode": "prepared" if wizard_prepared else "known",
        "replace_one_on_level": wizard_prepared,
        "school_restriction": None if wizard_prepared else "2014_known",
    }


def feature_automation_mode(
    *,
    feature_id: str,
    subclass_slug: str | None,
    has_resource: bool,
    has_shared_option: bool = False,
    has_calc: bool = False,
) -> str:
    """resource | shared_option | always_prepared | third_caster | calc | text"""
    fid = feature_id.replace("_", "-")
    if has_resource:
        return "resource"
    if has_shared_option:
        return "shared_option"
    if has_calc:
        return "calc"
    if fid in NOT_ALWAYS_PREPARED_FEATURE_IDS:
        return "text"
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
    """Report helper: button / calc / text for one subclass."""
    sub = load_subclass_catalog().get(subclass_slug)
    if not sub:
        return {"slug": subclass_slug, "error": "missing"}
    if subclass_slug == "druid__land" and not land_choice:
        land_choice = "arid"
    abilities = {"str": 16, "dex": 14, "con": 14, "int": 14, "wis": 14, "cha": 14}
    resources = build_subclass_resources(
        subclass_slug,
        level,
        total_level=level,
        abilities=abilities,
    )
    shared = shared_options_for_subclass(subclass_slug, level)
    bonuses = build_permanent_bonuses(subclass_slug, level, abilities=abilities)
    always = always_prepared_for_subclass(
        subclass_slug,
        level,
        land_choice=land_choice,
    )
    third = third_caster_block(subclass_slug, level)
    resource_fids = {
        str(r.meta.get("feature_id") or "").replace("_", "-") for r in resources
    }
    shared_fids = {r.feature_id.replace("_", "-") for r in shared}
    calc_fids = {b.feature_id.replace("_", "-") for b in bonuses}

    buttons: list[str] = []
    calcs: list[str] = []
    texts: list[str] = []
    for block in sub["data"].get("features") or []:
        blv = int(block.get("level") or 0)
        if blv > level:
            continue
        for feat in block.get("features") or []:
            fid = str(feat.get("id") or "")
            fid_n = fid.replace("_", "-")
            name = str(feat.get("name_ru") or fid)
            mode = feature_automation_mode(
                feature_id=fid,
                subclass_slug=subclass_slug,
                has_resource=fid_n in resource_fids,
                has_shared_option=fid_n in shared_fids,
                has_calc=fid_n in calc_fids,
            )
            line = f"L{blv} {name}"
            if mode in {"resource", "shared_option"}:
                spend = ""
                for s in shared:
                    if s.feature_id.replace("_", "-") == fid_n:
                        spend = f" →{s.spend_pool}"
                        break
                pool = ""
                for r in resources:
                    if str(r.meta.get("feature_id") or "").replace("_", "-") == fid_n:
                        pool = f" [{r.pool_id}×{r.max}/{r.reset}]"
                        break
                buttons.append(f"{line} [{mode}]{pool}{spend}")
            elif mode in {"always_prepared", "third_caster"}:
                buttons.append(f"{line} [{mode}]")
            elif mode == "calc":
                calcs.append(f"{line} [calc]")
            else:
                texts.append(f"{line} — мастер/нарратив или без формулы использований")

    return {
        "slug": subclass_slug,
        "name_ru": sub.get("name_ru"),
        "parent": subclass_parent(subclass_slug),
        "source": sub.get("source"),
        "resources": [r.pool_id for r in resources],
        "shared_options": [s.feature_id for s in shared],
        "permanent_bonuses": [
            {"feature_id": b.feature_id, "kind": b.kind, "value": b.value, "name_ru": b.name_ru}
            for b in bonuses
        ],
        "always_prepared_count": len(always),
        "third_caster": bool(third),
        "button": buttons,
        "calc": calcs,
        "text": texts,
        # Back-compat keys for earlier tests
        "automated": buttons + calcs,
        "mode": (
            "resource"
            if resources or shared
            else "calc"
            if bonuses
            else "always_prepared"
            if always or third
            else "mixed"
            if buttons or calcs
            else "text"
        ),
    }


def automation_report(level: int = 11) -> list[dict[str, Any]]:
    return [classify_subclass(slug, level=level) for slug in list_all_subclass_slugs()]


def automation_report_markdown(level: int = 11) -> str:
    rows = automation_report(level=level)
    lines = [
        f"# P24-M02b: автоматизация подклассов 2024 (ур. {level})",
        "",
        "| Подкласс | Кнопки (пулы/опции) | Расчёты | Текстом |",
        "|---|---|---|---|",
    ]
    for r in rows:
        name = r.get("name_ru") or r["slug"]
        btn = "; ".join(r.get("button") or []) or "—"
        calc = "; ".join(r.get("calc") or []) or "—"
        text = "; ".join(r.get("text") or []) or "—"
        # escape pipes
        btn = btn.replace("|", "/")
        calc = calc.replace("|", "/")
        text = text.replace("|", "/")
        lines.append(f"| {name} (`{r['slug']}`) | {btn} | {calc} | {text} |")
    return "\n".join(lines) + "\n"


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


def permanent_bonuses_to_sheet(
    bonuses: Sequence[PermanentBonus],
) -> list[dict[str, Any]]:
    return [
        {
            "feature_id": b.feature_id,
            "name_ru": b.name_ru,
            "kind": b.kind,
            "value": b.value,
            "min_level": b.min_level,
            "note_ru": b.note_ru,
        }
        for b in bonuses
    ]


def shared_options_to_sheet(
    options: Sequence[SharedPoolOption],
) -> list[dict[str, Any]]:
    return [
        {
            "feature_id": o.feature_id,
            "name_ru": o.name_ru,
            "spend_pool": o.spend_pool,
            "cost": o.cost,
            "cost_max": o.cost_max,
            "kind": o.kind,
            "min_level": o.min_level,
        }
        for o in options
    ]
