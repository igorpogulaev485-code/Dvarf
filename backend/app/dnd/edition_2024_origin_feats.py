"""P24-M03: structured picks for 2024 origin feats and species traits."""

from __future__ import annotations

from functools import lru_cache
from typing import Any, Mapping, Sequence

CASTING_ABILITIES = frozenset({"int", "wis", "cha"})
PORTAL_JUMPER_DAMAGE = frozenset({"necrotic", "psychic", "radiant"})
PURPLE_DRAGON_SKILLS = frozenset({"insight", "performance", "persuasion"})
MAGIC_INITIATE_LISTS = frozenset({"cleric", "druid", "wizard"})

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
SKILLED_TOOL_IDS = frozenset(ARTISAN_TOOL_IDS + GAMING_SET_IDS + MUSICAL_INSTRUMENT_IDS)

SPECIES_SKILL_RULES: dict[str, dict[str, Any]] = {
    "human": {"count": 1, "from": "any"},
    "elf": {"count": 1, "from": ("insight", "perception", "survival")},
    "elf__lfl": {"count": 1, "from": ("insight", "perception", "survival")},
    "changeling": {
        "count": 2,
        "from": ("deception", "insight", "intimidation", "performance", "persuasion"),
    },
    "shifter": {"count": 1, "from": ("acrobatics", "athletics", "intimidation", "survival")},
    "lupin": {"count": 1, "from": ("perception", "stealth", "survival")},
    "warforged": {"count": 1, "from": "any"},
    "reborn": {"count": 1, "from": "any"},
}
SPECIES_CASTING_ABILITY = frozenset({"elf", "gnome", "tiefling", "elf__lfl"})
SPECIES_TOOL_RULES = frozenset({"warforged"})
SPECIES_SKILL_OR_TOOL = frozenset({"khoravar"})
SPECIES_DAMAGE_RULES: dict[str, frozenset[str]] = {
    "reborn": frozenset({"cold", "necrotic", "poison"}),
}
SHIFTER_FORMS = frozenset({"beasthide", "longtooth", "swiftstride", "wildhunt"})


class OriginFeatError(ValueError):
    def __init__(self, message: str, *, code: str = "create_2024_origin_feat") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _normalize_slug(value: str | None) -> str:
    return (value or "").strip().lower()


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [str(x) for x in value if str(x).strip()]
    return [str(value)] if str(value).strip() else []


def _unique_exact(ids: Sequence[str], count: int) -> bool:
    return len(ids) == count and len(set(ids)) == count


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


@lru_cache(maxsize=1)
def _feat_catalog() -> dict[str, dict[str, Any]]:
    from app.dnd.edition_2024_create import load_feat_catalog

    return load_feat_catalog()


@lru_cache(maxsize=1)
def _spell_catalog() -> dict[str, dict[str, Any]]:
    from app.dnd.edition_2024_create import load_spell_catalog

    return load_spell_catalog()


def validate_origin_feat_picks(
    feat_slug: str,
    picks: Mapping[str, Any] | None,
    *,
    context: str = "origin",
) -> dict[str, Any]:
    slug = _normalize_slug(feat_slug)
    feat = _feat_catalog().get(slug)
    if feat is None:
        raise OriginFeatError(f"Черта происхождения не найдена: {feat_slug}")
    data = feat.get("data") if isinstance(feat.get("data"), dict) else {}
    if data.get("category") and data.get("category") != "origin":
        raise OriginFeatError(f"Черта {slug} не является чертой происхождения")

    raw = dict(picks or {})
    out: dict[str, Any] = {
        "slug": slug,
        "name_ru": feat.get("name_ru"),
        "context": context,
    }
    spells = _spell_catalog()

    if slug == "magic-initiate":
        spell_list = _normalize_slug((_as_list(raw.get("list")) or [""])[0])
        cantrips = [_normalize_slug(x) for x in _as_list(raw.get("cantrips"))]
        spell_id = _normalize_slug((_as_list(raw.get("spell")) or [""])[0])
        ability = _normalize_slug((_as_list(raw.get("ability")) or [""])[0])
        if spell_list not in MAGIC_INITIATE_LISTS:
            raise OriginFeatError(
                "Посвящённый в магию: выберите список жреца, друида или волшебника"
            )
        if not _unique_exact(cantrips, 2):
            raise OriginFeatError("Посвящённый в магию: нужно ровно два разных заговора")
        if not spell_id:
            raise OriginFeatError("Посвящённый в магию: нужно заклинание 1 круга")
        if ability not in CASTING_ABILITIES:
            raise OriginFeatError(
                "Посвящённый в магию: выберите заклинательную характеристику"
            )
        for cid in cantrips:
            row = spells.get(cid)
            if row is None or _spell_level(row) != 0:
                raise OriginFeatError(f"Неизвестный заговор: {cid}")
            classes = {str(c).lower() for c in ((row.get("data") or {}).get("classes") or [])}
            if spell_list not in classes:
                raise OriginFeatError(f"Заговор {cid} не из выбранного списка")
        spell_row = spells.get(spell_id)
        if spell_row is None or _spell_level(spell_row) != 1:
            raise OriginFeatError("Посвящённый в магию: заклинание должно быть 1 круга")
        classes = {str(c).lower() for c in ((spell_row.get("data") or {}).get("classes") or [])}
        if spell_list not in classes:
            raise OriginFeatError(f"Заклинание {spell_id} не из выбранного списка")
        out.update(
            {
                "list": spell_list,
                "cantrips": cantrips,
                "spell_id": spell_id,
                "ability": ability,
            }
        )
        return out

    if slug == "skilled":
        skilled = [str(x) for x in _as_list(raw.get("skilled"))]
        if not _unique_exact(skilled, 3):
            raise OriginFeatError("Умелый: выберите ровно три разных навыка или инструмента")
        for item in skilled:
            ok = item in SKILL_IDS or _normalize_slug(item) in SKILLED_TOOL_IDS
            if not ok:
                raise OriginFeatError(f"Умелый: недопустимый выбор {item}")
        out["skilled"] = skilled
        return out

    if slug == "crafter":
        tools = [_normalize_slug(x) for x in _as_list(raw.get("tools"))]
        if not _unique_exact(tools, 3) or any(t not in ARTISAN_TOOL_IDS for t in tools):
            raise OriginFeatError("Мастеровой: выберите три инструмента ремесленника")
        out["tools"] = tools
        return out

    if slug in {"musician", "harper-agent"}:
        need = 3 if slug == "musician" else 1
        instruments = [_normalize_slug(x) for x in _as_list(raw.get("instruments"))]
        if not _unique_exact(instruments, need) or any(
            i not in MUSICAL_INSTRUMENT_IDS for i in instruments
        ):
            raise OriginFeatError("Выберите музыкальный инструмент(ы) для черты")
        out["instruments"] = instruments
        return out

    if slug == "portal-jumper":
        damage = _normalize_slug((_as_list(raw.get("damage")) or [""])[0])
        if damage not in PORTAL_JUMPER_DAMAGE:
            raise OriginFeatError("Портальный прыгун: выберите тип сопротивления")
        out["damage"] = damage
        return out

    if slug == "arcane-undertaker":
        cantrip = _normalize_slug((_as_list(raw.get("cantrip")) or [""])[0])
        ability = _normalize_slug((_as_list(raw.get("ability")) or [""])[0])
        row = spells.get(cantrip) if cantrip else None
        if row is None or _spell_level(row) != 0:
            raise OriginFeatError("Колдовской могильщик: выберите заговор некромантии")
        if str((row.get("data") or {}).get("school") or "").lower() != "necromancy":
            raise OriginFeatError("Нужен заговор школы некромантии")
        if ability not in CASTING_ABILITIES:
            raise OriginFeatError("Выберите заклинательную характеристику")
        out.update({"cantrip": cantrip, "ability": ability})
        return out

    if slug == "purple-dragon-rook":
        skill = str((_as_list(raw.get("skill")) or [""])[0] or "")
        if skill not in PURPLE_DRAGON_SKILLS:
            raise OriginFeatError("Новобранец Пурпурного дракона: выберите навык")
        out["skill"] = skill
        return out

    if slug == "aberrant-dragonmark":
        cantrip = _normalize_slug((_as_list(raw.get("cantrip")) or [""])[0])
        spell_id = _normalize_slug((_as_list(raw.get("spell")) or [""])[0])
        for sid, level in ((cantrip, 0), (spell_id, 1)):
            row = spells.get(sid) if sid else None
            if row is None or _spell_level(row) != level:
                raise OriginFeatError(
                    "Аберрантное клеймо: выберите заговор и заклинание 1 круга чародея"
                )
            classes = {str(c).lower() for c in ((row.get("data") or {}).get("classes") or [])}
            if "sorcerer" not in classes:
                raise OriginFeatError("Заклинания аберрантного клейма — из списка чародея")
        out.update({"cantrip": cantrip, "spell_id": spell_id})
        return out

    traits = str(data.get("traits_text") or data.get("summary_ru") or "")
    if "Интеллект, Мудрость или Харизма" in traits:
        ability = _normalize_slug((_as_list(raw.get("ability")) or [""])[0])
        if ability not in CASTING_ABILITIES:
            raise OriginFeatError(
                f"{feat.get('name_ru') or slug}: выберите заклинательную характеристику"
            )
        out["ability"] = ability
        return out

    return out


def validate_species_trait_picks(
    species_slug: str,
    species_data: Mapping[str, Any],
    picks: Mapping[str, Any] | None,
) -> dict[str, Any]:
    slug = species_slug
    raw = dict(picks or {})
    out: dict[str, Any] = {}
    rule = SPECIES_SKILL_RULES.get(slug)
    if rule:
        skills = [str(x) for x in _as_list(raw.get("skills"))]
        count = int(rule["count"])
        allowed = (
            sorted(SKILL_IDS)
            if rule["from"] == "any"
            else [str(x) for x in rule["from"]]
        )
        if not _unique_exact(skills, count) or any(s not in allowed for s in skills):
            raise OriginFeatError("Выберите навык(и) вида", code="create_2024_species")
        out["skills"] = skills

    if slug in SPECIES_TOOL_RULES:
        tools = [_normalize_slug(x) for x in _as_list(raw.get("tools"))]
        if not _unique_exact(tools, 1) or tools[0] not in SKILLED_TOOL_IDS:
            raise OriginFeatError(
                "Выберите инструмент вида",
                code="create_2024_species",
            )
        out["tools"] = tools

    if slug in SPECIES_SKILL_OR_TOOL:
        chosen = [str(x) for x in _as_list(raw.get("skill_or_tool"))]
        if not _unique_exact(chosen, 1):
            raise OriginFeatError(
                "Выберите навык или инструмент вида",
                code="create_2024_species",
            )
        item = chosen[0]
        ok = item in SKILL_IDS or _normalize_slug(item) in SKILLED_TOOL_IDS
        if not ok:
            raise OriginFeatError(
                "Недопустимый навык или инструмент вида",
                code="create_2024_species",
            )
        out["skill_or_tool"] = item

    damage_rule = SPECIES_DAMAGE_RULES.get(slug)
    if damage_rule:
        damage = _normalize_slug((_as_list(raw.get("damage")) or [""])[0])
        if damage not in damage_rule:
            raise OriginFeatError(
                "Выберите тип сопротивления вида",
                code="create_2024_species",
            )
        out["damage"] = damage

    traits = {str(x).lower() for x in (species_data.get("traits") or [])}
    if slug == "shifter" or SHIFTER_FORMS & traits:
        form = _normalize_slug((_as_list(raw.get("form")) or [""])[0])
        if form not in SHIFTER_FORMS:
            raise OriginFeatError(
                "Шифтер: выберите облик смещения",
                code="create_2024_species",
            )
        out["form"] = form

    needs_ability = slug in SPECIES_CASTING_ABILITY or (
        "Интеллект, Мудрость или Харизма" in str(species_data.get("traits_text") or "")
    )
    if needs_ability:
        ability = _normalize_slug((_as_list(raw.get("ability")) or [""])[0])
        if ability not in CASTING_ABILITIES:
            raise OriginFeatError(
                "Выберите заклинательную характеристику вида",
                code="create_2024_species",
            )
        out["ability"] = ability
    return out
