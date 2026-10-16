"""Apply setting-artifact abilities onto a character sheet (grant / loot).

Ability kinds align with catalog item/weapon/spell shapes and sheet surfaces:
passive, resource, action, trait, spell_slot, spell, companion, resistance, weapon.
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

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
        # потолок характеристики (маска лича: +2 ИНТ, макс 22)
        if target == "ability" and raw.get("max_score") is not None:
            out["max_score"] = _clamp_int(raw.get("max_score"), 20, 1, 30)

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
        elif target == "save" and key in saves:
            saves[key] += value
    return {
        "ac": ac,
        "attack": attack,
        "damage": damage,
        "speed": speed,
        "darkvision": darkvision,
        "abilities": {k: v for k, v in ability_scores.items() if v},
        "saves": {k: v for k, v in saves.items() if v},
    }


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

    if not attuned:
        return {"item_id": item_id, "active": False, "mods": mods}

    # --- Resources (resource / action charges / mode charges) ---
    resources = _ensure_list(sheet, "resources")
    mode_resource_ids: dict[str, str] = {}  # ability id → resource id
    for ab in abilities:
        if ab.get("kind") == "resource" or (
            ab.get("kind") == "action" and ab.get("charges")
        ):
            resources.append(
                {
                    "id": str(uuid4()),
                    "name": f"{name}: {ab.get('name') or 'Заряды'}"[:80],
                    "max": int(ab.get("charges") or 1),
                    "used": 0,
                    "reset": ab.get("reset") or "long",
                    "applies_to_allies": False,
                    "source_item_id": item_id,
                }
            )
        elif ab.get("kind") == "mode":
            rid = str(uuid4())
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
            damage = attack_damage or "1d12"
            dmg_bonus = int(mods.get("damage") or 0)
            if dmg_bonus:
                sign = f"+{dmg_bonus}" if dmg_bonus > 0 else str(dmg_bonus)
                damage = f"{damage}{sign}"
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
                "attack_role": "artifact",
                **_weapon_req_fields(),
            }
            weapons.append(_attach_modes(row))
        sheet["weapons"] = weapons

    # --- Ability scores (+ optional max_score from passives) ---
    abilities_block = _ensure_dict(sheet, "abilities")
    max_scores: dict[str, int] = {}
    for ab in abilities:
        if ab.get("kind") == "passive" and ab.get("bonus_target") == "ability":
            if ab.get("max_score") is not None:
                key = str(ab.get("ability_key") or "str")
                max_scores[key] = max(int(max_scores.get(key) or 0), int(ab["max_score"]))
    for key, delta in (mods.get("abilities") or {}).items():
        if not delta:
            continue
        row = dict(abilities_block.get(key) or {})
        try:
            score = int(row.get("score") or 10)
        except (TypeError, ValueError):
            score = 10
        ceiling = int(max_scores.get(key) or row.get("max_score") or 30)
        row["score"] = max(1, min(ceiling, score + int(delta)))
        if key in max_scores:
            row["max_score"] = max(int(row.get("max_score") or 0), max_scores[key])
        abilities_block[key] = row
    for key, ceiling in max_scores.items():
        row = dict(abilities_block.get(key) or {"score": 10})
        row["max_score"] = max(int(row.get("max_score") or 0), ceiling)
        abilities_block[key] = row
    sheet["abilities"] = abilities_block

    # --- Skill bonuses ---
    skills_block = _ensure_dict(sheet, "skills")
    for ab in abilities:
        if ab.get("kind") != "skill":
            continue
        skey = str(ab.get("skill_key") or "")
        if skey not in SKILL_KEYS:
            continue
        row = dict(skills_block.get(skey) or {})
        try:
            cur = int(row.get("magic_bonus") or 0)
        except (TypeError, ValueError):
            cur = 0
        row["magic_bonus"] = cur + int(ab.get("bonus_value") or 0)
        if "is_proficient" not in row:
            row["is_proficient"] = False
        if "is_expertise" not in row:
            row["is_expertise"] = False
        skills_block[skey] = row
    sheet["skills"] = skills_block

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

    # --- Saves: magic_bonus (cloak of protection etc.) ---
    saves_block = _ensure_dict(sheet, "saves")
    for key, delta in (mods.get("saves") or {}).items():
        if not delta:
            continue
        row = dict(saves_block.get(key) or {})
        try:
            cur = int(row.get("magic_bonus") or 0)
        except (TypeError, ValueError):
            cur = 0
        row["magic_bonus"] = cur + int(delta)
        if "is_proficient" not in row:
            row["is_proficient"] = False
        saves_block[key] = row
    sheet["saves"] = saves_block

    # --- Combat: AC, speed ---
    combat = _ensure_dict(sheet, "combat")
    ac_delta = int(mods.get("ac") or 0)
    if ac_delta:
        try:
            cur = combat.get("ac")
            if cur is None:
                dex_row = abilities_block.get("dex") or {}
                try:
                    dex = int(dex_row.get("score") or 10)
                except (TypeError, ValueError):
                    dex = 10
                cur = 10 + (dex - 10) // 2
            combat["ac"] = int(cur) + ac_delta
        except (TypeError, ValueError):
            combat["ac"] = 10 + ac_delta
        combat["magic_ac_bonus"] = int(combat.get("magic_ac_bonus") or 0) + ac_delta

    speed_delta = int(mods.get("speed") or 0)
    if speed_delta:
        try:
            cur_speed = int(combat.get("speed") or 30)
        except (TypeError, ValueError):
            cur_speed = 30
        combat["speed"] = max(0, cur_speed + speed_delta)

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

    # --- Darkvision → identity ---
    dv_delta = int(mods.get("darkvision") or 0)
    if dv_delta:
        identity = _ensure_dict(sheet, "identity")
        try:
            cur_dv = int(identity.get("darkvision") or 0)
        except (TypeError, ValueError):
            cur_dv = 0
        identity["darkvision"] = max(0, cur_dv + dv_delta)
        sheet["identity"] = identity

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
        companion_id = str(uuid4())
        row: dict[str, Any] = {
            "id": companion_id,
            "name": str(ab.get("companion_name") or ab.get("name") or "Напарник")[:80],
            "hp_current": hp_max,
            "hp_max": hp_max,
            "ac": int(ab.get("ac") or 12),
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
                    "id": str(uuid4()),
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
