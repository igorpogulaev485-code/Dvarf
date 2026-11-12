"""Apply setting-artifact abilities onto a character sheet (grant / loot).

Ability kinds align with catalog item/weapon/spell shapes and sheet surfaces:
passive, resource, action, trait, spell_slot, spell, companion, resistance, weapon.
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.services.ability_score_caps import (
    DEFAULT_ABILITY_SCORE_MAX,
    HARD_ABILITY_SCORE_CEILING,
    resolve_ability_maxes,
)

ABILITY_KEYS = ("str", "dex", "con", "int", "wis", "cha")
PASSIVE_TARGETS = (
    "attack",
    "damage",
    "ac",
    "save",
    "ability",
    "speed",
    "darkvision",
)
ACTION_COSTS = ("action", "bonus", "reaction", "free", "special")
RESOURCE_RESETS = ("short", "long", "manual")
ABILITY_KINDS = (
    "passive",
    "resource",
    "action",
    "trait",
    "spell_slot",
    "spell",
    "companion",
    "resistance",
    "weapon",
    "requirement",
    "mode",
    "skill",
    "tool",
    "condition_immunity",
)
RESIST_MODES = ("resistance", "immunity", "vulnerability")
RANGE_KINDS = ("melee", "ranged", "reach", "thrown")
SKILL_KEYS = (
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
)
SKILL_LABELS_RU = {
    "acrobatics": "Акробатика",
    "animal_handling": "Уход за животными",
    "arcana": "Магия",
    "athletics": "Атлетика",
    "deception": "Обман",
    "history": "История",
    "insight": "Проницательность",
    "intimidation": "Запугивание",
    "investigation": "Анализ",
    "medicine": "Медицина",
    "nature": "Природа",
    "perception": "Внимательность",
    "performance": "Выступление",
    "persuasion": "Убеждение",
    "religion": "Религия",
    "sleight_of_hand": "Ловкость рук",
    "stealth": "Скрытность",
    "survival": "Выживание",
}


def normalize_ability(raw: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    kind = str(raw.get("kind") or "trait").strip().lower()
    if kind not in ABILITY_KINDS:
        kind = "trait"
    name = str(raw.get("name") or "").strip()[:120]
    text = str(raw.get("text") or "").strip()[:2000]
    aid = str(raw.get("id") or "").strip() or str(uuid4())
    out: dict[str, Any] = {
        "id": aid,
        "kind": kind,
        "name": name or _default_name(kind),
        "text": text,
    }

    if kind == "passive":
        target = str(raw.get("bonus_target") or "ac").strip().lower()
        if target not in PASSIVE_TARGETS:
            target = "ac"
        # speed / darkvision — футы (до 120); остальное — обычный бонус
        if target in ("speed", "darkvision"):
            value = _clamp_int(raw.get("bonus_value"), 0, -30, 120)
        else:
            value = _clamp_int(raw.get("bonus_value"), 0, -10, 10)
        out["bonus_target"] = target
        out["bonus_value"] = value
        key = str(raw.get("ability_key") or "str").strip().lower()
        if key not in ABILITY_KEYS:
            key = "str"
        out["ability_key"] = key
        # потолок характеристики (маска лича: +2 ИНТ, макс 22); PHB default 20
        if target == "ability" and raw.get("max_score") is not None:
            out["max_score"] = _clamp_int(
                raw.get("max_score"),
                DEFAULT_ABILITY_SCORE_MAX,
                1,
                HARD_ABILITY_SCORE_CEILING,
            )

    elif kind == "skill":
        skill = str(raw.get("skill_key") or "").strip().lower()
        if skill not in SKILL_KEYS:
            skill = "nature"
        out["skill_key"] = skill
        out["bonus_value"] = _clamp_int(raw.get("bonus_value"), 2, -10, 10)
        if not name or name == _default_name(kind):
            label = SKILL_LABELS_RU.get(skill, skill)
            sign = out["bonus_value"]
            out["name"] = f"{'+' if sign >= 0 else ''}{sign} {label}"

    elif kind == "tool":
        tool = str(raw.get("tool_name") or name or "Инструмент").strip()[:80]
        out["tool_name"] = tool
        out["name"] = tool if not name or name == _default_name(kind) else name

    elif kind == "condition_immunity":
        slug = str(raw.get("condition_slug") or "").strip().lower()[:40]
        cname = str(raw.get("condition_name") or "").strip()[:80]
        if not slug and cname:
            slug = cname.lower().replace(" ", "_")[:40]
        if not slug:
            slug = "frightened"
        if not cname:
            cname = {
                "frightened": "Испуганный",
                "charmed": "Очарованный",
                "poisoned": "Отравленный",
                "illusions": "Иллюзии",
            }.get(slug, slug)
        out["condition_slug"] = slug
        out["condition_name"] = cname
        if not name or name == _default_name(kind):
            out["name"] = f"Имм. {cname}"

    elif kind == "resource":
        out["charges"] = _clamp_int(raw.get("charges"), 1, 1, 99)
        reset = str(raw.get("reset") or "long").strip().lower()
        if reset == "dawn":
            reset = "long"
        if reset not in RESOURCE_RESETS:
            reset = "long"
        out["reset"] = reset

    elif kind == "action":
        cost = str(raw.get("action_cost") or "action").strip().lower()
        if cost not in ACTION_COSTS:
            cost = "action"
        out["action_cost"] = cost
        # optional auto-resource for «1/день»
        if raw.get("charges"):
            out["charges"] = _clamp_int(raw.get("charges"), 1, 1, 99)
            reset = str(raw.get("reset") or "long").strip().lower()
            if reset == "dawn":
                reset = "long"
            if reset not in RESOURCE_RESETS:
                reset = "long"
            out["reset"] = reset

    elif kind == "spell_slot":
        # slot_level 0 = pact magic; 1–9 = leveled slot
        level = _clamp_int(raw.get("slot_level"), 1, 0, 9)
        out["slot_level"] = level
        out["slot_count"] = _clamp_int(raw.get("slot_count"), 1, 1, 9)
        if level == 0:
            # pact slot level (cast level)
            out["pact_level"] = _clamp_int(raw.get("pact_level"), 1, 1, 9)

    elif kind == "spell":
        out["spell_name"] = str(raw.get("spell_name") or name or "Заклинание").strip()[:120]
        out["spell_level"] = _clamp_int(raw.get("spell_level"), 0, 0, 9)
        out["catalog_id"] = (
            str(raw.get("catalog_id")).strip()[:80] if raw.get("catalog_id") else None
        )
        out["prepared"] = bool(raw.get("prepared", True))
        out["casting_time"] = str(raw.get("casting_time") or "").strip()[:80]
        out["range"] = str(raw.get("range") or "").strip()[:80]
        out["attack_or_save"] = str(raw.get("attack_or_save") or raw.get("save") or "").strip()[
            :80
        ]
        out["damage"] = str(raw.get("damage") or "").strip()[:40]
        out["concentration"] = bool(raw.get("concentration", False))
        out["name"] = out["spell_name"]

    elif kind == "companion":
        out["companion_name"] = str(
            raw.get("companion_name") or name or "Напарник"
        ).strip()[:80]
        out["hp_max"] = _clamp_int(raw.get("hp_max"), 10, 1, 999)
        out["ac"] = _clamp_int(raw.get("ac"), 12, 1, 40)
        out["companion_type"] = str(raw.get("companion_type") or "").strip()[:40]
        out["name"] = out["companion_name"]
        # атака призванного (коготь Араха)
        if raw.get("attack_damage") or raw.get("damage") or raw.get("attack_bonus") is not None:
            out["attack_damage"] = str(
                raw.get("attack_damage") or raw.get("damage") or "1d8"
            ).strip()[:40]
            out["attack_damage_type"] = str(
                raw.get("attack_damage_type") or raw.get("damage_type") or ""
            ).strip()[:40]
            out["attack_bonus"] = _clamp_int(raw.get("attack_bonus"), 0, -5, 15)
            rk = str(raw.get("attack_range_kind") or raw.get("range_kind") or "melee").strip().lower()
            if raw.get("ranged") is True:
                rk = "ranged"
            if rk not in RANGE_KINDS:
                rk = "melee"
            out["attack_range_kind"] = rk
        # 1/день + длительность
        if raw.get("charges"):
            out["charges"] = _clamp_int(raw.get("charges"), 1, 1, 99)
            reset = str(raw.get("reset") or "long").strip().lower()
            if reset == "dawn":
                reset = "long"
            if reset not in RESOURCE_RESETS:
                reset = "long"
            out["reset"] = reset
        if raw.get("duration") or raw.get("duration_rounds"):
            out["duration"] = str(raw.get("duration") or "1 минута").strip()[:80]
            out["duration_rounds"] = _clamp_int(raw.get("duration_rounds"), 10, 1, 600)

    elif kind == "resistance":
        dtype = str(raw.get("damage_type") or text or "огонь").strip()[:40]
        mode = str(raw.get("resist_mode") or "resistance").strip().lower()
        if mode not in RESIST_MODES:
            mode = "resistance"
        out["damage_type"] = dtype
        out["resist_mode"] = mode
        if not name or name == _default_name(kind):
            mode_ru = {
                "resistance": "Сопр.",
                "immunity": "Имм.",
                "vulnerability": "Уязв.",
            }[mode]
            out["name"] = f"{mode_ru} {dtype}"

    elif kind == "weapon":
        # Catalog-aligned attack line (ability, damage, damage_type, ranged…)
        out["damage"] = str(raw.get("damage") or raw.get("attack_damage") or "1d8").strip()[:40]
        out["damage_type"] = str(
            raw.get("damage_type") or raw.get("attack_damage_type") or ""
        ).strip()[:40]
        ability = str(raw.get("ability") or raw.get("attack_ability") or "str").strip().lower()
        if ability not in ABILITY_KEYS:
            ability = "str"
        out["ability"] = ability
        range_kind = str(
            raw.get("range_kind") or raw.get("attack_range_kind") or "melee"
        ).strip().lower()
        if raw.get("ranged") is True:
            range_kind = "ranged"
        if range_kind not in RANGE_KINDS:
            range_kind = "melee"
        out["range_kind"] = range_kind
        out["magic_bonus"] = _clamp_int(raw.get("magic_bonus") or raw.get("bonus_value"), 0, -5, 5)

    elif kind == "requirement":
        # «только с Силой 15+»
        key = str(raw.get("ability_key") or "str").strip().lower()
        if key not in ABILITY_KEYS:
            key = "str"
        out["ability_key"] = key
        out["min_score"] = _clamp_int(raw.get("min_score") or raw.get("bonus_value"), 15, 1, 30)
        if not name or name == _default_name(kind):
            labels = {
                "str": "СИЛ",
                "dex": "ЛОВ",
                "con": "ТЕЛ",
                "int": "ИНТ",
                "wis": "МДР",
                "cha": "ХАР",
            }
            out["name"] = f"Требуется {labels[key]} {out['min_score']}+"

    elif kind == "mode":
        # Активация зарядом: на N времени смена урона / типа / преимущество
        cost = str(raw.get("action_cost") or "bonus").strip().lower()
        if cost not in ACTION_COSTS:
            cost = "bonus"
        out["action_cost"] = cost
        out["charges"] = _clamp_int(raw.get("charges"), 1, 1, 99)
        reset = str(raw.get("reset") or "short").strip().lower()
        if reset == "dawn":
            reset = "long"
        if reset not in RESOURCE_RESETS:
            reset = "short"
        out["reset"] = reset
        out["duration"] = str(raw.get("duration") or "1 минута").strip()[:80]
        out["duration_rounds"] = _clamp_int(raw.get("duration_rounds"), 10, 1, 600)
        out["active_damage"] = str(raw.get("active_damage") or "").strip()[:40]
        out["active_damage_type"] = str(raw.get("active_damage_type") or "").strip()[:40]
        out["advantage"] = bool(raw.get("advantage", True))
        if not name or name == _default_name(kind):
            out["name"] = "Активация"

    return out


def normalize_abilities(raw: object) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw[:40]:
        ability = normalize_ability(item if isinstance(item, dict) else None)
        if ability:
            out.append(ability)
    return out


def _default_name(kind: str) -> str:
    return {
        "passive": "Пассив",
        "resource": "Заряды",
        "action": "Действие",
        "trait": "Свойство",
        "spell_slot": "Ячейка",
        "spell": "Заклинание",
        "companion": "Призыв",
        "resistance": "Сопротивление",
        "weapon": "Атака",
        "requirement": "Требование",
        "mode": "Активация",
        "skill": "Навык",
        "tool": "Инструмент",
        "condition_immunity": "Имм. состояния",
    }.get(kind, "Свойство")


def _clamp_int(raw: object, default: int, lo: int, hi: int) -> int:
    try:
        value = int(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        value = default
    return max(lo, min(hi, value))


def format_abilities_notes(abilities: list[dict[str, Any]], description: str = "") -> str:
    lines: list[str] = []
    desc = (description or "").strip()
    if desc:
        lines.append(desc)
    for ab in abilities:
        kind = ab.get("kind")
        name = ab.get("name") or _default_name(str(kind))
        text = (ab.get("text") or "").strip()
        if kind == "passive":
            target = ab.get("bonus_target")
            value = int(ab.get("bonus_value") or 0)
            sign = f"+{value}" if value >= 0 else str(value)
            label = {
                "attack": "атака",
                "damage": "урон",
                "ac": "КД",
                "save": f"спас. {ab.get('ability_key', '')}",
                "ability": str(ab.get("ability_key") or ""),
                "speed": "скорость",
                "darkvision": "тёмное зрение",
            }.get(str(target), str(target))
            head = f"{name}: {sign} {label}".strip()
            if target == "ability" and ab.get("max_score") is not None:
                head = f"{head} (макс {ab['max_score']})"
            lines.append(f"{head}" + (f" — {text}" if text else ""))
        elif kind == "resource":
            charges = ab.get("charges") or 1
            reset = ab.get("reset") or "long"
            reset_ru = {"short": "к. отдых", "long": "п. отдых", "manual": "вручную"}.get(
                str(reset), str(reset)
            )
            lines.append(f"{name}: {charges} зар. ({reset_ru})" + (f" — {text}" if text else ""))
        elif kind == "action":
            cost = ab.get("action_cost") or "action"
            cost_ru = {
                "action": "действие",
                "bonus": "бонус",
                "reaction": "реакция",
                "free": "свободно",
                "special": "особое",
            }.get(str(cost), str(cost))
            extra = ""
            if ab.get("charges"):
                extra = f", {ab.get('charges')}×"
            lines.append(f"{name} ({cost_ru}{extra})" + (f" — {text}" if text else ""))
        elif kind == "spell_slot":
            level = int(ab.get("slot_level") or 1)
            count = int(ab.get("slot_count") or 1)
            if level == 0:
                lines.append(
                    f"{name}: pact ×{count} (ур. {ab.get('pact_level') or 1})"
                    + (f" — {text}" if text else "")
                )
            else:
                lines.append(
                    f"{name}: ячейка {level}-го ×{count}" + (f" — {text}" if text else "")
                )
        elif kind == "spell":
            lvl = int(ab.get("spell_level") or 0)
            lvl_s = "заговор" if lvl == 0 else f"{lvl}-й"
            lines.append(f"{name} ({lvl_s})" + (f" — {text}" if text else ""))
        elif kind == "companion":
            bits = [name]
            if ab.get("companion_type"):
                bits.append(str(ab["companion_type"]))
            bits.append(f"ХП {ab.get('hp_max')}")
            bits.append(f"КД {ab.get('ac')}")
            if ab.get("attack_damage"):
                bonus = int(ab.get("attack_bonus") or 0)
                bits.append(
                    f"атака {bonus:+d} {ab.get('attack_damage')} {ab.get('attack_damage_type') or ''}".strip()
                )
            if ab.get("duration"):
                bits.append(str(ab["duration"]))
            lines.append(" · ".join(bits) + (f" — {text}" if text else ""))
        elif kind == "resistance":
            mode_ru = {
                "resistance": "сопр.",
                "immunity": "имм.",
                "vulnerability": "уязв.",
            }.get(str(ab.get("resist_mode")), "сопр.")
            lines.append(
                f"{name}: {mode_ru} {ab.get('damage_type')}"
                + (f" — {text}" if text else "")
            )
        elif kind == "weapon":
            dmg = ab.get("damage") or ""
            bonus = int(ab.get("magic_bonus") or 0)
            bonus_s = f" {bonus:+d}" if bonus else ""
            lines.append(
                f"{name}: {dmg}{bonus_s} {ab.get('damage_type') or ''}".strip()
                + (f" — {text}" if text else "")
            )
        elif kind == "requirement":
            lines.append(f"{name}" + (f" — {text}" if text else ""))
        elif kind == "skill":
            label = SKILL_LABELS_RU.get(str(ab.get("skill_key")), ab.get("skill_key"))
            v = int(ab.get("bonus_value") or 0)
            sign = f"+{v}" if v >= 0 else str(v)
            lines.append(f"{name}: {sign} {label}" + (f" — {text}" if text else ""))
        elif kind == "tool":
            lines.append(
                f"Владение: {ab.get('tool_name') or name}" + (f" — {text}" if text else "")
            )
        elif kind == "condition_immunity":
            lines.append(
                f"Имм. {ab.get('condition_name') or ab.get('condition_slug')}"
                + (f" — {text}" if text else "")
            )
        elif kind == "mode":
            cost = ab.get("action_cost") or "bonus"
            cost_ru = {
                "action": "действие",
                "bonus": "бонус",
                "reaction": "реакция",
                "free": "свободно",
                "special": "особое",
            }.get(str(cost), str(cost))
            bits = [
                f"{name} ({cost_ru})",
                f"{ab.get('charges') or 1} зар.",
                str(ab.get("duration") or ""),
            ]
            if ab.get("active_damage"):
                bits.append(str(ab["active_damage"]))
            if ab.get("advantage"):
                bits.append("преимущество")
            lines.append(" · ".join(b for b in bits if b) + (f" — {text}" if text else ""))
        else:
            lines.append(f"{name}" + (f" — {text}" if text else ""))
    return "\n".join(lines)[:2000]


def sum_passive_bonuses(abilities: list[dict[str, Any]]) -> dict[str, Any]:
    ac = 0
    attack = 0
    damage = 0
    speed = 0
    darkvision = 0
    ability_scores: dict[str, int] = {k: 0 for k in ABILITY_KEYS}
    ability_max: dict[str, int] = {}
    saves: dict[str, int] = {k: 0 for k in ABILITY_KEYS}
    for ab in abilities:
        if ab.get("kind") != "passive":
            continue
        value = int(ab.get("bonus_value") or 0)
        target = ab.get("bonus_target")
        key = str(ab.get("ability_key") or "str")
        if target == "ac":
            ac += value
        elif target == "attack":
            attack += value
        elif target == "damage":
            damage += value
        elif target == "speed":
            speed += value
        elif target == "darkvision":
            darkvision += value
        elif target == "ability" and key in ability_scores:
            ability_scores[key] += value
            if ab.get("max_score") is not None:
                ceiling = int(ab["max_score"])
                ability_max[key] = max(int(ability_max.get(key) or 0), ceiling)
        elif target == "save" and key in saves:
            saves[key] += value
    result: dict[str, Any] = {
        "ac": ac,
        "attack": attack,
        "damage": damage,
        "speed": speed,
        "darkvision": darkvision,
        "abilities": {k: v for k, v in ability_scores.items() if v},
        "saves": {k: v for k, v in saves.items() if v},
    }
    if ability_max:
        result["ability_max"] = ability_max
    return result


def gear_resource_id(item_id: str, ability_id: str) -> str:
    return f"gear-res:{item_id}:{ability_id}"


def gear_companion_id(item_id: str, ability_id: str) -> str:
    return f"gear-companion:{item_id}:{ability_id}"


def effects_from_abilities(abilities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Map wiki abilities onto the same effect union catalog items use (I01–I04).

    Unknown kinds become a note. Callers must not also bake the numeric bonuses
    these effects apply live (AC, saves, skills, ability +N, attack, damage, speed).
    """
    effects: list[dict[str, Any]] = []
    for ab in abilities:
        kind = ab.get("kind")
        name = str(ab.get("name") or "").strip()
        text = str(ab.get("text") or "").strip()
        ability_id = str(ab.get("id") or "")

        if kind == "passive":
            target = ab.get("bonus_target")
            value = int(ab.get("bonus_value") or 0)
            key = str(ab.get("ability_key") or "str")
            if target == "ac" and value:
                effects.append({"type": "ac_bonus", "value": value})
            elif target == "attack" and value:
                effects.append({"type": "attack_bonus", "value": value})
            elif target == "damage" and value:
                effects.append({"type": "damage_bonus", "value": value})
            elif target == "ability" and value:
                row: dict[str, Any] = {
                    "type": "ability_mod",
                    "ability": key,
                    "value": value,
                    "max": int(ab["max_score"])
                    if ab.get("max_score") is not None
                    else DEFAULT_ABILITY_SCORE_MAX,
                }
                effects.append(row)
            elif target == "save" and value:
                effects.append({"type": "save_bonus", "ability": key, "value": value})
            elif target == "speed" and value:
                effects.append({"type": "speed", "mode": "walk", "value_ft": value})
            elif target == "darkvision" and value:
                effects.append(
                    {"type": "sense", "sense": "darkvision", "range_ft": value}
                )
            continue

        if kind == "skill":
            value = int(ab.get("bonus_value") or 0)
            skill = str(ab.get("skill_key") or "")
            if skill and value:
                effects.append({"type": "skill_bonus", "skill": skill, "value": value})
            continue

        if kind == "tool":
            tool = str(ab.get("tool_name") or name).strip()
            if tool:
                effects.append(
                    {"type": "sheet_flag", "flag": "tool_proficiency", "value": tool}
                )
            continue

        if kind == "resource":
            effects.append(
                {
                    "type": "resource",
                    "id": ability_id or "charges",
                    "max": int(ab.get("charges") or 1),
                    "restore": ab.get("reset") or "long",
                    "name": name or "Заряды",
                }
            )
            continue

        if kind == "action":
            note = name or "Действие"
            if text:
                note = f"{note}: {text}"
            effects.append({"type": "custom_note", "text": note[:500]})
            if ab.get("charges"):
                effects.append(
                    {
                        "type": "resource",
                        "id": ability_id or "action",
                        "max": int(ab.get("charges") or 1),
                        "restore": ab.get("reset") or "long",
                        "name": name or "Действие",
                    }
                )
            continue

        if kind == "mode":
            effects.append(
                {
                    "type": "weapon_mode",
                    "ability_id": ability_id,
                    "name": name or "Активация",
                    "action_cost": ab.get("action_cost") or "bonus",
                    "active_damage": ab.get("active_damage") or "",
                    "active_damage_type": ab.get("active_damage_type") or "",
                    "advantage": bool(ab.get("advantage", True)),
                    "duration": ab.get("duration") or "",
                    "text": text,
                }
            )
            effects.append(
                {
                    "type": "resource",
                    "id": ability_id or "mode",
                    "max": int(ab.get("charges") or 1),
                    "restore": ab.get("reset") or "short",
                    "name": name or "Активация",
                }
            )
            continue

        if kind == "requirement":
            effects.append(
                {
                    "type": "sheet_flag",
                    "flag": "requirement",
                    "ability": str(ab.get("ability_key") or "str"),
                    "min": int(ab.get("min_score") or 15),
                    "name": name or "Требование",
                }
            )
            continue

        if kind == "spell_slot":
            level = int(ab.get("slot_level") or 1)
            count = int(ab.get("slot_count") or 1)
            if level <= 0:
                # Pact slots stay on spells.pact_slots — the gear engine has no pact delta.
                continue
            effects.append({"type": "spell_slots", "level": level, "delta": count})
            continue

        if kind == "spell":
            effects.append(
                {
                    "type": "artifact_spell",
                    "name": str(ab.get("spell_name") or name or "Заклинание"),
                    "level": int(ab.get("spell_level") or 0),
                    "damage": ab.get("damage") or "",
                    "casting_time": ab.get("casting_time") or "",
                    "range": ab.get("range") or "",
                    "text": text,
                }
            )
            continue

        if kind == "companion":
            attack = ""
            if ab.get("attack_damage"):
                bonus = int(ab.get("attack_bonus") or 0)
                attack = (
                    f"{bonus:+d} {ab.get('attack_damage')} {ab.get('attack_damage_type') or ''}"
                ).strip()
            effects.append(
                {
                    "type": "companion",
                    "kind": "ally",
                    "ability_id": ability_id,
                    "name_ru": str(ab.get("companion_name") or name or "Напарник"),
                    "hp_max": int(ab.get("hp_max") or 10),
                    "ac": int(ab.get("ac") or 12),
                    "actions": attack,
                    "notes": str(ab.get("duration") or text or ""),
                }
            )
            if ab.get("charges"):
                effects.append(
                    {
                        "type": "resource",
                        "id": ability_id or "companion",
                        "max": int(ab.get("charges") or 1),
                        "restore": ab.get("reset") or "long",
                        "name": name or "Призыв",
                    }
                )
            continue

        if kind == "resistance":
            mode = str(ab.get("resist_mode") or "resistance")
            damage_type = str(ab.get("damage_type") or "")
            if not damage_type:
                continue
            effect_type = {
                "immunity": "immunity",
                "vulnerability": "vulnerability",
            }.get(mode, "resistance")
            effects.append({"type": effect_type, "damage_type": damage_type})
            continue

        if kind == "condition_immunity":
            effects.append(
                {
                    "type": "condition_immunity",
                    "slug": ab.get("condition_slug") or "",
                    "name": ab.get("condition_name") or ab.get("condition_slug") or "",
                }
            )
            continue

        if kind == "weapon":
            bonus = int(ab.get("magic_bonus") or 0)
            if bonus:
                effects.append({"type": "attack_bonus", "value": bonus})
                effects.append({"type": "damage_bonus", "value": bonus})
            label = name or "Атака"
            dice = str(ab.get("damage") or "")
            if dice or text:
                effects.append(
                    {
                        "type": "custom_note",
                        "text": " ".join(
                            part for part in (label, dice, str(ab.get("damage_type") or ""), text) if part
                        )[:500],
                    }
                )
            continue

        if kind == "trait" or text or name:
            note = name or "Черта"
            if text:
                note = f"{note}: {text}"
            effects.append({"type": "custom_note", "text": note[:500]})
    return effects


def _ensure_list(sheet: dict[str, Any], key: str) -> list:
    raw = sheet.get(key)
    if isinstance(raw, list):
        return list(raw)
    return []


def _ensure_dict(sheet: dict[str, Any], key: str) -> dict:
    raw = sheet.get(key)
    if isinstance(raw, dict):
        return dict(raw)
    return {}


def apply_artifact_to_sheet(
    sheet: dict[str, Any],
    *,
    artifact: Any,
    qty: int = 1,
) -> dict[str, Any]:
    """
    Mutate sheet: inventory + attunement + resources + weapons + spells/slots +
    companions + resistances + passives (AC/scores/saves/speed/darkvision).
    """
    abilities = normalize_abilities(getattr(artifact, "abilities", None) or [])
    mods = sum_passive_bonuses(abilities)
    notes = format_abilities_notes(abilities, getattr(artifact, "description", "") or "")
    item_id = str(uuid4())
    requires = bool(getattr(artifact, "requires_attunement", False))
    name = str(getattr(artifact, "name", "") or "Артефакт").strip()[:120]
    rarity = str(getattr(artifact, "rarity", "") or "").strip()[:40]
    weight = getattr(artifact, "weight_lb", None)
    try:
        weight_lb = float(weight) if weight is not None else None
    except (TypeError, ValueError):
        weight_lb = None

    attack_damage = str(getattr(artifact, "attack_damage", "") or "").strip()
    attack_damage_type = str(getattr(artifact, "attack_damage_type", "") or "").strip()
    attack_ability = str(getattr(artifact, "attack_ability", "") or "str").lower()
    attack_range_kind = str(getattr(artifact, "attack_range_kind", "") or "melee")

    snapshot = {
        "artifact_id": str(getattr(artifact, "id", "")),
        "name": name,
        "rarity": rarity,
        "description": str(getattr(artifact, "description", "") or ""),
        "requires_attunement": requires,
        "abilities": abilities,
        "mods": mods,
        "attack_damage": attack_damage,
        "attack_damage_type": attack_damage_type,
        "attack_ability": attack_ability,
        "attack_range_kind": attack_range_kind,
        "attack_role": "artifact",
        "item_kind": "magic",
        "attunement": requires,
        "weight_lb": weight_lb,
    }

    requirements = [
        {
            "ability_key": ab.get("ability_key") or "str",
            "min_score": int(ab.get("min_score") or 15),
            "name": ab.get("name") or "Требование",
        }
        for ab in abilities
        if ab.get("kind") == "requirement"
    ]
    # primary requirement (first) for quick UI checks
    primary_req = requirements[0] if requirements else None

    inventory = _ensure_dict(sheet, "inventory")
    items = list(inventory.get("items") or [])
    if not isinstance(items, list):
        items = []
    items.append(
        {
            "id": item_id,
            "name": name,
            "catalog_id": None,
            "qty": max(1, int(qty)),
            "weight_lb": weight_lb,
            "equipped": not requires,
            "armor_kind": "none",
            "base_ac": None,
            "notes": notes,
            "item_kind": "magic",
            "setting_artifact_id": str(getattr(artifact, "id", "")),
            "magic_mods": mods,
            "artifact_snapshot": snapshot,
            "requires_attunement": requires,
            "requirements": requirements,
            "req_ability": (primary_req or {}).get("ability_key"),
            "req_score": (primary_req or {}).get("min_score"),
            # Live bonuses. artifact_live means the score/AC/skills were NOT baked,
            # so opening the sheet must not subtract them again.
            "effects": effects_from_abilities(abilities),
            "artifact_live": True,
        }
    )
    inventory["items"] = items
    if "coins" not in inventory:
        inventory["coins"] = {"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0}
    sheet["inventory"] = inventory

    attuned = False
    if requires:
        attunements = _ensure_list(sheet, "attunements")
        filled = [
            s
            for s in attunements
            if isinstance(s, dict) and (str(s.get("name") or "").strip() or s.get("item_id"))
        ]
        if len(filled) < 3:
            attunements.append(
                {
                    "id": str(uuid4()),
                    "item_id": item_id,
                    "name": name,
                    "notes": notes[:500],
                }
            )
            sheet["attunements"] = attunements[:3]
            attuned = True
    else:
        attuned = True

    # Worn when the effects are on. Attunement alone is not enough for gearEffects
    # (same rule as catalog items: equipped, and attuned when required).
    for row in items:
        if isinstance(row, dict) and row.get("id") == item_id:
            row["equipped"] = bool(attuned)
            break
    inventory["items"] = items
    sheet["inventory"] = inventory

    if not attuned:
        return {"item_id": item_id, "active": False, "mods": mods}

    # --- Resources (resource / action charges / mode charges) ---
    resources = _ensure_list(sheet, "resources")
    mode_resource_ids: dict[str, str] = {}  # ability id → resource id
    for ab in abilities:
        if ab.get("kind") == "resource" or (
            ab.get("kind") == "action" and ab.get("charges")
        ):
            rid = gear_resource_id(item_id, str(ab.get("id") or "charges"))
            resources.append(
                {
                    "id": rid,
                    "name": f"{name}: {ab.get('name') or 'Заряды'}"[:80],
                    "max": int(ab.get("charges") or 1),
                    "used": 0,
                    "reset": ab.get("reset") or "long",
                    "applies_to_allies": False,
                    "source_item_id": item_id,
                }
            )
        elif ab.get("kind") == "mode":
            rid = gear_resource_id(item_id, str(ab.get("id") or "mode"))
            mode_resource_ids[str(ab.get("id"))] = rid
            resources.append(
                {
                    "id": rid,
                    "name": f"{name}: {ab.get('name') or 'Активация'}"[:80],
                    "max": int(ab.get("charges") or 1),
                    "used": 0,
                    "reset": ab.get("reset") or "short",
                    "applies_to_allies": False,
                    "source_item_id": item_id,
                    "mode_ability_id": ab.get("id"),
                }
            )
    sheet["resources"] = resources

    def _weapon_req_fields() -> dict[str, Any]:
        if not primary_req:
            return {}
        return {
            "req_ability": primary_req.get("ability_key") or "str",
            "req_score": int(primary_req.get("min_score") or 15),
            "requirements": requirements,
        }

    def _attach_modes(weapon: dict[str, Any]) -> dict[str, Any]:
        modes = [a for a in abilities if a.get("kind") == "mode"]
        if not modes:
            return weapon
        # one primary activation on the weapon (first mode)
        ab = modes[0]
        base_dmg = str(weapon.get("damage") or "")
        base_type = str(weapon.get("damage_type") or "")
        weapon["activation"] = {
            "id": str(ab.get("id") or uuid4()),
            "name": ab.get("name") or "Активация",
            "action_cost": ab.get("action_cost") or "bonus",
            "duration": ab.get("duration") or "1 минута",
            "duration_rounds": int(ab.get("duration_rounds") or 10),
            "active_damage": ab.get("active_damage") or base_dmg,
            "active_damage_type": ab.get("active_damage_type") or base_type,
            "advantage": bool(ab.get("advantage", True)),
            "resource_id": mode_resource_ids.get(str(ab.get("id"))),
            "base_damage": base_dmg,
            "base_damage_type": base_type,
            "text": ab.get("text") or "",
        }
        weapon["mode_active"] = False
        return weapon

    # --- Weapons: top-level attack fields + weapon abilities + attack/damage passives ---
    weapons = _ensure_list(sheet, "weapons")
    weapon_abs = [a for a in abilities if a.get("kind") == "weapon"]
    modes = [a for a in abilities if a.get("kind") == "mode"]
    # If only mode/requirement without explicit attack — still create weapon from top-level fields
    need_weapon = bool(
        attack_damage
        or mods.get("attack")
        or mods.get("damage")
        or weapon_abs
        or modes
    )
    if need_weapon:
        if attack_damage or mods.get("attack") or mods.get("damage") or (
            modes and not weapon_abs
        ):
            # Dice only. +N to damage lives in item.effects so the sheet does not add it twice.
            damage = attack_damage or "1d12"
            ability = attack_ability if attack_ability in ABILITY_KEYS else "str"
            range_kind = attack_range_kind if attack_range_kind in RANGE_KINDS else "melee"
            row = {
                "id": str(uuid4()),
                "name": name,
                "catalog_id": None,
                "source_kind": "artifact",
                "ability": ability,
                "is_proficient": True,
                "damage": damage,
                "damage_type": attack_damage_type or "рубящий",
                "range_kind": range_kind,
                "magic_bonus": int(mods.get("attack") or 0),
                "source_item_id": item_id,
                "inventory_item_id": item_id,
                "attack_role": "artifact",
                **_weapon_req_fields(),
            }
            weapons.append(_attach_modes(row))
        for ab in weapon_abs:
            row = {
                "id": str(uuid4()),
                "name": f"{name}: {ab.get('name')}"[:80]
                if ab.get("name") and ab.get("name") != name
                else name,
                "catalog_id": None,
                "source_kind": "artifact",
                "ability": ab.get("ability") or "str",
                "is_proficient": True,
                "damage": ab.get("damage") or "1d8",
                "damage_type": ab.get("damage_type") or "",
                "range_kind": ab.get("range_kind") or "melee",
                "magic_bonus": int(ab.get("magic_bonus") or 0) + int(mods.get("attack") or 0),
                "source_item_id": item_id,
                "inventory_item_id": item_id,
                "attack_role": "artifact",
                **_weapon_req_fields(),
            }
            weapons.append(_attach_modes(row))
        sheet["weapons"] = weapons

    # --- Ability scores (+ optional max_score from passives; PHB base 20) ---
    abilities_block = _ensure_dict(sheet, "abilities")
    # Bake this artifact's max_score onto the sheet first so resolve sees it.
    for ab in abilities:
        if ab.get("kind") != "passive" or ab.get("bonus_target") != "ability":
            continue
        if ab.get("max_score") is None:
            continue
        key = str(ab.get("ability_key") or "str")
        if key not in ABILITY_KEYS:
            continue
        row = dict(abilities_block.get(key) or {"score": 10})
        prev = int(row.get("max_score") or 0)
        row["max_score"] = max(prev, int(ab["max_score"]))
        abilities_block[key] = row
    sheet["abilities"] = abilities_block

    # The +N itself is item.effects (ability_mod). Only the ceiling is stored,
    # so a later save does not clamp 22 down to 20 and does not add the bonus twice.
    ceilings = resolve_ability_maxes(sheet)
    for key, ceiling in ceilings.items():
        if ceiling <= DEFAULT_ABILITY_SCORE_MAX:
            continue
        row = dict(abilities_block.get(key) or {"score": 10})
        row["max_score"] = max(int(row.get("max_score") or 0), ceiling)
        abilities_block[key] = row
    sheet["abilities"] = abilities_block

    # Skill and save bonuses are item.effects (skill_bonus / save_bonus).
    # Writing skills.*.magic_bonus here would not show on the sheet and, if a
    # future reader added it, would double the live bonus.

    # --- Tool proficiencies ---
    proficiency = _ensure_dict(sheet, "proficiency")
    tools = list(proficiency.get("tools") or [])
    if not isinstance(tools, list):
        tools = []
    tool_names = {str(t).strip().lower() for t in tools if isinstance(t, str)}
    for ab in abilities:
        if ab.get("kind") != "tool":
            continue
        tool = str(ab.get("tool_name") or "").strip()
        if not tool:
            continue
        if tool.lower() not in tool_names:
            tools.append(tool)
            tool_names.add(tool.lower())
    proficiency["tools"] = tools
    sheet["proficiency"] = proficiency

    # AC, saves, speed and attack/damage bonuses are item.effects. A baked
    # combat.ac would sit as a manual override and hide the live bonus — or
    # stack with it.

    # --- Combat: resistances and condition immunities (also mirrored in effects) ---
    combat = _ensure_dict(sheet, "combat")

    # Resistances
    resists = list(combat.get("damage_resistances") or [])
    if not isinstance(resists, list):
        resists = []
    for ab in abilities:
        if ab.get("kind") != "resistance":
            continue
        entry = {
            "id": str(uuid4()),
            "damage_type": ab.get("damage_type") or "",
            "mode": ab.get("resist_mode") or "resistance",
            "source_item_id": item_id,
            "source_name": name,
        }
        # dedupe same type+mode from same item
        if not any(
            isinstance(r, dict)
            and r.get("damage_type") == entry["damage_type"]
            and r.get("mode") == entry["mode"]
            and r.get("source_item_id") == item_id
            for r in resists
        ):
            resists.append(entry)
    if resists:
        combat["damage_resistances"] = resists

    # Condition immunities (fear, illusions, …)
    cond_imm = list(combat.get("condition_immunities") or [])
    if not isinstance(cond_imm, list):
        cond_imm = []
    for ab in abilities:
        if ab.get("kind") != "condition_immunity":
            continue
        entry = {
            "id": str(uuid4()),
            "slug": ab.get("condition_slug") or "",
            "name": ab.get("condition_name") or ab.get("condition_slug") or "",
            "source_item_id": item_id,
            "source_name": name,
        }
        if not any(
            isinstance(c, dict)
            and c.get("slug") == entry["slug"]
            and c.get("source_item_id") == item_id
            for c in cond_imm
        ):
            cond_imm.append(entry)
    if cond_imm:
        combat["condition_immunities"] = cond_imm
    sheet["combat"] = combat

    # --- Darkvision → combat.darkvision (the sheet reads this, not identity) ---
    # Greater range wins; adding on top of a racial 60 would double the sense.
    dv_delta = int(mods.get("darkvision") or 0)
    if dv_delta:
        identity = _ensure_dict(sheet, "identity")
        try:
            cur_dv = int(combat.get("darkvision") or identity.get("darkvision") or 0)
        except (TypeError, ValueError):
            cur_dv = 0
        seen = max(cur_dv, dv_delta)
        combat["darkvision"] = seen
        identity["darkvision"] = seen
        sheet["identity"] = identity
        sheet["combat"] = combat

    # --- Spell slots ---
    spells = _ensure_dict(sheet, "spells")
    slots = dict(spells.get("slots") or {})
    if not isinstance(slots, dict):
        slots = {}
    for ab in abilities:
        if ab.get("kind") != "spell_slot":
            continue
        level = int(ab.get("slot_level") or 1)
        count = int(ab.get("slot_count") or 1)
        if level == 0:
            pact = dict(spells.get("pact_slots") or {})
            try:
                pmax = int(pact.get("max") or 0)
            except (TypeError, ValueError):
                pmax = 0
            pact["max"] = pmax + count
            pact["used"] = int(pact.get("used") or 0)
            pact["level"] = max(
                int(pact.get("level") or 1),
                int(ab.get("pact_level") or 1),
            )
            spells["pact_slots"] = pact
        else:
            key = str(level)
            row = dict(slots.get(key) or {"max": 0, "used": 0})
            try:
                smax = int(row.get("max") or 0)
            except (TypeError, ValueError):
                smax = 0
            row["max"] = smax + count
            row["used"] = int(row.get("used") or 0)
            slots[key] = row
            # Remember the baked delta so the client gear sync does not add it again.
            deltas = dict(spells.get("gear_slot_deltas") or {})
            if not isinstance(deltas, dict):
                deltas = {}
            try:
                prev_delta = int(deltas.get(key) or 0)
            except (TypeError, ValueError):
                prev_delta = 0
            deltas[key] = prev_delta + count
            spells["gear_slot_deltas"] = deltas
    spells["slots"] = slots

    # --- Known spells ---
    known = list(spells.get("known") or [])
    if not isinstance(known, list):
        known = []
    for ab in abilities:
        if ab.get("kind") != "spell":
            continue
        spell_name = str(ab.get("spell_name") or ab.get("name") or "Заклинание")
        catalog_id = ab.get("catalog_id")
        if catalog_id and any(
            isinstance(s, dict) and s.get("catalog_id") == catalog_id for s in known
        ):
            continue
        known.append(
            {
                "id": str(uuid4()),
                "name": spell_name,
                "catalog_id": catalog_id,
                "level": int(ab.get("spell_level") or 0),
                "prepared": bool(ab.get("prepared", True)),
                "notes": f"от {name}" + (f": {ab.get('text')}" if ab.get("text") else ""),
                "casting_time": ab.get("casting_time") or "",
                "range": ab.get("range") or "",
                "attack_or_save": ab.get("attack_or_save") or "",
                "damage": ab.get("damage") or "",
                "concentration": bool(ab.get("concentration")),
                "applies_to_allies": False,
                "ally_target_count": 1,
                "source_item_id": item_id,
            }
        )
    spells["known"] = known
    sheet["spells"] = spells

    # --- Companions / summons ---
    companions = _ensure_list(sheet, "companions")
    resources = _ensure_list(sheet, "resources")
    for ab in abilities:
        if ab.get("kind") != "companion":
            continue
        hp_max = int(ab.get("hp_max") or 10)
        ac_value = int(ab.get("ac") or 12)
        companion_name = str(ab.get("companion_name") or ab.get("name") or "Напарник")[:80]
        companion_id = gear_companion_id(item_id, str(ab.get("id") or "ally"))
        attack_line = ""
        if ab.get("attack_damage"):
            bonus = int(ab.get("attack_bonus") or 0)
            attack_line = (
                f"{bonus:+d} {ab.get('attack_damage')} {ab.get('attack_damage_type') or ''}"
            ).strip()
        row: dict[str, Any] = {
            "id": companion_id,
            "kind": "ally",
            "role": "ally",
            "name": companion_name,
            "nature": "summoned",
            "active": True,
            "source": {"kind": "item", "labelRu": name},
            "stats": {
                "hp": hp_max,
                "hp_max": hp_max,
                "ac": ac_value,
                "speed": None,
            },
            "actions": attack_line,
            "notes": str(ab.get("duration") or ""),
            # Flat fields kept so older readers and the D1 assertions still see them.
            "hp_current": hp_max,
            "hp_max": hp_max,
            "ac": ac_value,
            "conditions": [],
            "type": ab.get("companion_type") or "",
            "source_item_id": item_id,
            "source_name": name,
        }
        if ab.get("attack_damage"):
            row["attack_bonus"] = int(ab.get("attack_bonus") or 0)
            row["attack_damage"] = ab.get("attack_damage")
            row["attack_damage_type"] = ab.get("attack_damage_type") or ""
            row["attack_range_kind"] = ab.get("attack_range_kind") or "melee"
        if ab.get("duration"):
            row["duration"] = ab.get("duration")
            row["duration_rounds"] = int(ab.get("duration_rounds") or 10)
        companions.append(row)
        if ab.get("charges"):
            resources.append(
                {
                    "id": gear_resource_id(item_id, str(ab.get("id") or "companion")),
                    "name": f"{name}: {ab.get('name') or 'Призыв'}"[:80],
                    "max": int(ab.get("charges") or 1),
                    "used": 0,
                    "reset": ab.get("reset") or "long",
                    "applies_to_allies": False,
                    "source_item_id": item_id,
                    "companion_id": companion_id,
                }
            )
    sheet["companions"] = companions
    sheet["resources"] = resources

    return {"item_id": item_id, "active": True, "mods": mods}


def _artifact_record_abilities(
    artifact: Any,
) -> tuple[list[dict[str, Any]], str, str, bool, str]:
    if artifact is None:
        return []
    if isinstance(artifact, dict):
        raw = artifact.get("abilities")
        name = artifact.get("name") or ""
        description = artifact.get("description") or ""
        requires = bool(artifact.get("requires_attunement"))
        rarity = artifact.get("rarity") or ""
    else:
        raw = getattr(artifact, "abilities", None)
        name = getattr(artifact, "name", "") or ""
        description = getattr(artifact, "description", "") or ""
        requires = bool(getattr(artifact, "requires_attunement", False))
        rarity = getattr(artifact, "rarity", "") or ""
    abilities = normalize_abilities(raw or [])
    return abilities, str(name), str(description), bool(requires), str(rarity)


def _attuned_ids(sheet: dict[str, Any]) -> set[str]:
    ids: set[str] = set()
    for slot in sheet.get("attunements") or []:
        if isinstance(slot, dict) and slot.get("item_id"):
            ids.add(str(slot["item_id"]))
    return ids


def _item_effects_were_baked(item: dict[str, Any], attuned: set[str]) -> bool:
    """True when grant wrote numeric bonuses onto the sheet (legacy apply)."""
    if item.get("requires_attunement"):
        return str(item.get("id") or "") in attuned
    return True


def hydrate_legacy_artifact_sheet(
    sheet: dict[str, Any],
    artifacts_by_id: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Restore live effects for artifacts already on a sheet. No migration.

    Reads the snapshot, or the setting_artifacts row when the snapshot was
    stripped but setting_artifact_id survived. Subtracts baked ability / speed
    bonuses once (artifact_live) so item.effects does not add them again.
    If both the snapshot and the id are gone, the row cannot be rebuilt.
    """
    if not isinstance(sheet, dict):
        return sheet
    inventory = sheet.get("inventory")
    if not isinstance(inventory, dict):
        return sheet
    items = inventory.get("items")
    if not isinstance(items, list):
        return sheet

    attuned = _attuned_ids(sheet)
    abilities_block = sheet.get("abilities") if isinstance(sheet.get("abilities"), dict) else {}
    combat = sheet.get("combat") if isinstance(sheet.get("combat"), dict) else {}
    identity = sheet.get("identity") if isinstance(sheet.get("identity"), dict) else {}
    weapons = sheet.get("weapons") if isinstance(sheet.get("weapons"), list) else []
    companions = sheet.get("companions") if isinstance(sheet.get("companions"), list) else []
    resources = sheet.get("resources") if isinstance(sheet.get("resources"), list) else []
    spells = sheet.get("spells") if isinstance(sheet.get("spells"), dict) else {}
    changed = False

    for item in items:
        if not isinstance(item, dict):
            continue
        snap = item.get("artifact_snapshot") if isinstance(item.get("artifact_snapshot"), dict) else {}
        sid = str(item.get("setting_artifact_id") or snap.get("artifact_id") or "")
        has_abilities = isinstance(snap.get("abilities"), list) and bool(snap.get("abilities"))
        if not has_abilities and sid and artifacts_by_id and sid in artifacts_by_id:
            abilities, name, description, requires, rarity = _artifact_record_abilities(
                artifacts_by_id[sid]
            )
            if abilities:
                mods = sum_passive_bonuses(abilities)
                item["artifact_snapshot"] = {
                    "artifact_id": sid,
                    "name": name or item.get("name") or "",
                    "rarity": rarity,
                    "description": description,
                    "requires_attunement": requires or bool(item.get("requires_attunement")),
                    "abilities": abilities,
                    "mods": mods,
                    "item_kind": "magic",
                }
                if not isinstance(item.get("magic_mods"), dict):
                    item["magic_mods"] = mods
                item["setting_artifact_id"] = sid
                item["item_kind"] = item.get("item_kind") or "magic"
                snap = item["artifact_snapshot"]
                changed = True
                has_abilities = True
        if not has_abilities:
            continue
        if item.get("artifact_live") is True:
            continue
        effects = item.get("effects")
        if isinstance(effects, list) and effects:
            item["artifact_live"] = True
            changed = True
            continue

        abilities = [row for row in snap.get("abilities") or [] if isinstance(row, dict)]
        mods = item.get("magic_mods") if isinstance(item.get("magic_mods"), dict) else None
        if not mods:
            mods = sum_passive_bonuses(abilities)
            item["magic_mods"] = mods
        item["effects"] = effects_from_abilities(abilities)
        item["item_kind"] = item.get("item_kind") or "magic"
        baked = _item_effects_were_baked(item, attuned)
        if baked:
            _unbake_legacy_item(
                item,
                mods,
                abilities,
                abilities_block=abilities_block,
                combat=combat,
                identity=identity,
                weapons=weapons,
                companions=companions,
                resources=resources,
                spells=spells,
            )
            item["equipped"] = True
        item["artifact_live"] = True
        changed = True

    if changed:
        sheet["abilities"] = abilities_block
        sheet["combat"] = combat
        sheet["identity"] = identity
        sheet["weapons"] = weapons
        sheet["companions"] = companions
        sheet["resources"] = resources
        sheet["spells"] = spells
        inventory["items"] = items
        sheet["inventory"] = inventory
    return sheet


def _unbake_legacy_item(
    item: dict[str, Any],
    mods: dict[str, Any],
    abilities: list[dict[str, Any]],
    *,
    abilities_block: dict[str, Any],
    combat: dict[str, Any],
    identity: dict[str, Any],
    weapons: list[Any],
    companions: list[Any],
    resources: list[Any],
    spells: dict[str, Any],
) -> None:
    item_id = str(item.get("id") or "")
    ability_max = mods.get("ability_max") if isinstance(mods.get("ability_max"), dict) else {}
    for key, delta in (mods.get("abilities") or {}).items():
        try:
            delta_n = int(delta)
        except (TypeError, ValueError):
            continue
        if not delta_n or key not in ABILITY_KEYS:
            continue
        row = dict(abilities_block.get(key) or {})
        try:
            score = int(row.get("score") or 10)
        except (TypeError, ValueError):
            score = 10
        try:
            ceiling = int(ability_max.get(key) or row.get("max_score") or DEFAULT_ABILITY_SCORE_MAX)
        except (TypeError, ValueError):
            ceiling = DEFAULT_ABILITY_SCORE_MAX
        # At the ceiling the bake may have been partial — leave the score.
        # Below the ceiling the full +N is inside the stored score.
        if score < ceiling:
            row["score"] = max(1, score - delta_n)
        if ceiling > DEFAULT_ABILITY_SCORE_MAX:
            row["max_score"] = max(int(row.get("max_score") or 0), ceiling)
        abilities_block[key] = row

    try:
        speed_delta = int(mods.get("speed") or 0)
    except (TypeError, ValueError):
        speed_delta = 0
    if speed_delta and combat.get("speed") is not None:
        try:
            combat["speed"] = max(0, int(combat.get("speed") or 0) - speed_delta)
        except (TypeError, ValueError):
            pass

    try:
        ac_delta = int(mods.get("ac") or 0)
    except (TypeError, ValueError):
        ac_delta = 0
    if ac_delta and combat.get("magic_ac_bonus"):
        combat.pop("ac", None)
        combat.pop("magic_ac_bonus", None)

    try:
        dv = int(mods.get("darkvision") or 0)
    except (TypeError, ValueError):
        dv = 0
    if dv:
        try:
            cur = int(combat.get("darkvision") or identity.get("darkvision") or 0)
        except (TypeError, ValueError):
            cur = 0
        seen = max(cur, dv)
        combat["darkvision"] = seen
        identity["darkvision"] = seen

    try:
        dmg_bonus = int(mods.get("damage") or 0)
    except (TypeError, ValueError):
        dmg_bonus = 0
    suffix = f"+{dmg_bonus}" if dmg_bonus > 0 else (str(dmg_bonus) if dmg_bonus else "")
    modes = [ab for ab in abilities if ab.get("kind") == "mode"]
    reqs = [ab for ab in abilities if ab.get("kind") == "requirement"]
    for weapon in weapons:
        if not isinstance(weapon, dict):
            continue
        linked = str(weapon.get("source_item_id") or weapon.get("inventory_item_id") or "")
        if linked != item_id and weapon.get("source_kind") == "artifact" and weapon.get("name") == item.get("name"):
            linked = item_id
        if linked != item_id:
            continue
        weapon["source_item_id"] = item_id
        weapon["inventory_item_id"] = item_id
        if suffix and str(weapon.get("damage") or "").endswith(suffix):
            weapon["damage"] = str(weapon["damage"])[: -len(suffix)]
        if reqs and not weapon.get("req_score"):
            weapon["req_ability"] = reqs[0].get("ability_key") or "str"
            weapon["req_score"] = int(reqs[0].get("min_score") or 15)
            weapon["requirements"] = [
                {
                    "ability_key": ab.get("ability_key") or "str",
                    "min_score": int(ab.get("min_score") or 15),
                    "name": ab.get("name") or "Требование",
                }
                for ab in reqs
            ]
        if modes and not isinstance(weapon.get("activation"), dict):
            ab = modes[0]
            base_dmg = str(weapon.get("damage") or "")
            weapon["activation"] = {
                "id": str(ab.get("id") or ""),
                "name": ab.get("name") or "Активация",
                "action_cost": ab.get("action_cost") or "bonus",
                "duration": ab.get("duration") or "1 минута",
                "duration_rounds": int(ab.get("duration_rounds") or 10),
                "active_damage": ab.get("active_damage") or base_dmg,
                "active_damage_type": ab.get("active_damage_type") or weapon.get("damage_type") or "",
                "advantage": bool(ab.get("advantage", True)),
                "resource_id": gear_resource_id(item_id, str(ab.get("id") or "mode")),
                "base_damage": base_dmg,
                "base_damage_type": weapon.get("damage_type") or "",
                "text": ab.get("text") or "",
            }
            weapon["mode_active"] = bool(weapon.get("mode_active"))

    for companion in companions:
        if not isinstance(companion, dict):
            continue
        if str(companion.get("source_item_id") or "") != item_id:
            continue
        match = next((ab for ab in abilities if ab.get("kind") == "companion"), None)
        if match is None:
            continue
        ability_id = str(match.get("id") or "ally")
        companion["id"] = gear_companion_id(item_id, ability_id)
        companion["kind"] = companion.get("kind") or "ally"
        companion["role"] = companion.get("role") or "ally"
        companion["nature"] = companion.get("nature") or "summoned"
        companion["source"] = companion.get("source") or {"kind": "item", "labelRu": item.get("name") or ""}
        hp_max = int(match.get("hp_max") or companion.get("hp_max") or 10)
        ac_value = int(match.get("ac") or companion.get("ac") or 12)
        stats = companion.get("stats") if isinstance(companion.get("stats"), dict) else {}
        companion["stats"] = {
            "hp": stats.get("hp") if isinstance(stats.get("hp"), int) else companion.get("hp_current") or hp_max,
            "hp_max": stats.get("hp_max") if isinstance(stats.get("hp_max"), int) else hp_max,
            "ac": stats.get("ac") if isinstance(stats.get("ac"), int) else ac_value,
            "speed": stats.get("speed"),
        }
        if not companion.get("actions") and match.get("attack_damage"):
            bonus = int(match.get("attack_bonus") or 0)
            companion["actions"] = (
                f"{bonus:+d} {match.get('attack_damage')} {match.get('attack_damage_type') or ''}"
            ).strip()
        if not companion.get("notes") and match.get("duration"):
            companion["notes"] = str(match.get("duration"))

    id_remap: dict[str, str] = {}
    for resource in resources:
        if not isinstance(resource, dict):
            continue
        if str(resource.get("source_item_id") or "") != item_id:
            continue
        current = str(resource.get("id") or "")
        if current.startswith("gear-res:"):
            continue
        ability_id = str(resource.get("mode_ability_id") or "")
        if not ability_id:
            for ab in abilities:
                if ab.get("kind") not in ("resource", "mode", "action", "companion"):
                    continue
                if not ab.get("charges") and ab.get("kind") != "resource":
                    continue
                label = str(ab.get("name") or "")
                if label and label in str(resource.get("name") or ""):
                    ability_id = str(ab.get("id") or "")
                    break
        if not ability_id:
            continue
        new_id = gear_resource_id(item_id, ability_id)
        id_remap[current] = new_id
        resource["id"] = new_id
    if id_remap:
        for weapon in weapons:
            if not isinstance(weapon, dict):
                continue
            activation = weapon.get("activation")
            if isinstance(activation, dict) and activation.get("resource_id") in id_remap:
                activation["resource_id"] = id_remap[str(activation["resource_id"])]

    deltas = dict(spells.get("gear_slot_deltas") or {})
    if not isinstance(deltas, dict):
        deltas = {}
    for ab in abilities:
        if ab.get("kind") != "spell_slot":
            continue
        level = int(ab.get("slot_level") or 1)
        if level <= 0:
            continue
        key = str(level)
        try:
            already = int(deltas.get(key) or 0)
        except (TypeError, ValueError):
            already = 0
        count = int(ab.get("slot_count") or 1)
        if already < count:
            deltas[key] = count
    if deltas:
        spells["gear_slot_deltas"] = deltas
