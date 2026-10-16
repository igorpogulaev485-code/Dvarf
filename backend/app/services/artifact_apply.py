"""Apply setting-artifact abilities onto a character sheet (grant / loot)."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

ABILITY_KEYS = ("str", "dex", "con", "int", "wis", "cha")
PASSIVE_TARGETS = ("attack", "damage", "ac", "save", "ability")
ACTION_COSTS = ("action", "bonus", "reaction", "free", "special")
RESOURCE_RESETS = ("short", "long", "manual")


def normalize_ability(raw: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    kind = str(raw.get("kind") or "trait").strip().lower()
    if kind not in ("passive", "resource", "action", "trait"):
        kind = "trait"
    name = str(raw.get("name") or "").strip()[:120]
    text = str(raw.get("text") or "").strip()[:2000]
    aid = str(raw.get("id") or "").strip() or str(uuid4())
    out: dict[str, Any] = {"id": aid, "kind": kind, "name": name or _default_name(kind), "text": text}

    if kind == "passive":
        target = str(raw.get("bonus_target") or "ac").strip().lower()
        if target not in PASSIVE_TARGETS:
            target = "ac"
        try:
            value = int(raw.get("bonus_value") or 0)
        except (TypeError, ValueError):
            value = 0
        value = max(-10, min(10, value))
        out["bonus_target"] = target
        out["bonus_value"] = value
        key = str(raw.get("ability_key") or "str").strip().lower()
        if key not in ABILITY_KEYS:
            key = "str"
        out["ability_key"] = key
    elif kind == "resource":
        try:
            charges = int(raw.get("charges") or 1)
        except (TypeError, ValueError):
            charges = 1
        out["charges"] = max(1, min(99, charges))
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
    }.get(kind, "Свойство")


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
            }.get(str(target), str(target))
            head = f"{name}: {sign} {label}".strip()
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
            lines.append(f"{name} ({cost_ru})" + (f" — {text}" if text else ""))
        else:
            lines.append(f"{name}" + (f" — {text}" if text else ""))
    return "\n".join(lines)[:2000]


def sum_passive_bonuses(abilities: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate passive mods for apply + inventory snapshot."""
    ac = 0
    attack = 0
    damage = 0
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
        elif target == "ability" and key in ability_scores:
            ability_scores[key] += value
        elif target == "save" and key in saves:
            saves[key] += value
    return {
        "ac": ac,
        "attack": attack,
        "damage": damage,
        "abilities": {k: v for k, v in ability_scores.items() if v},
        "saves": {k: v for k, v in saves.items() if v},
    }


def _ensure_list(sheet: dict[str, Any], key: str) -> list:
    raw = sheet.get(key)
    if isinstance(raw, list):
        return list(raw)
    return []


def apply_artifact_to_sheet(
    sheet: dict[str, Any],
    *,
    artifact: Any,
    qty: int = 1,
) -> dict[str, Any]:
    """
    Mutate sheet dict in place: inventory item + attunement + resources + attack + passives.
    Returns the new inventory item id.
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

    snapshot = {
        "artifact_id": str(getattr(artifact, "id", "")),
        "name": name,
        "rarity": rarity,
        "description": str(getattr(artifact, "description", "") or ""),
        "requires_attunement": requires,
        "abilities": abilities,
        "mods": mods,
        "attack_damage": str(getattr(artifact, "attack_damage", "") or ""),
        "attack_damage_type": str(getattr(artifact, "attack_damage_type", "") or ""),
        "attack_ability": str(getattr(artifact, "attack_ability", "") or "str"),
        "attack_range_kind": str(getattr(artifact, "attack_range_kind", "") or "melee"),
    }

    inventory = dict(sheet.get("inventory") or {})
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
        }
    )
    inventory["items"] = items
    if "coins" not in inventory:
        inventory["coins"] = {"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0}
    sheet["inventory"] = inventory

    # Attunement slot
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
        attuned = True  # no attunement required → active immediately

    if not attuned:
        # Item granted but not active yet — still store, skip mechanical apply
        return {"item_id": item_id, "active": False, "mods": mods}

    # Resources
    resources = _ensure_list(sheet, "resources")
    for ab in abilities:
        if ab.get("kind") != "resource":
            continue
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
    sheet["resources"] = resources

    # Attack line
    dmg = str(getattr(artifact, "attack_damage", "") or "").strip()
    if dmg or mods.get("attack") or mods.get("damage"):
        damage = dmg or "1d4"
        dmg_bonus = int(mods.get("damage") or 0)
        if dmg_bonus:
            sign = f"+{dmg_bonus}" if dmg_bonus > 0 else str(dmg_bonus)
            if not any(ch in damage for ch in "+-") or damage.replace(" ", "").endswith(
                ("d4", "d6", "d8", "d10", "d12")
            ):
                damage = f"{damage}{sign}"
        weapons = _ensure_list(sheet, "weapons")
        ability = str(getattr(artifact, "attack_ability", "") or "str").lower()
        if ability not in ABILITY_KEYS:
            ability = "str"
        range_kind = str(getattr(artifact, "attack_range_kind", "") or "melee")
        if range_kind not in ("melee", "ranged", "reach", "thrown"):
            range_kind = "melee"
        weapons.append(
            {
                "id": str(uuid4()),
                "name": name,
                "catalog_id": None,
                "source_kind": "artifact",
                "ability": ability,
                "is_proficient": True,
                "damage": damage,
                "damage_type": str(getattr(artifact, "attack_damage_type", "") or ""),
                "range_kind": range_kind,
                "magic_bonus": int(mods.get("attack") or 0),
                "source_item_id": item_id,
            }
        )
        sheet["weapons"] = weapons

    # Ability scores
    abilities_block = dict(sheet.get("abilities") or {})
    for key, delta in (mods.get("abilities") or {}).items():
        if not delta:
            continue
        row = dict(abilities_block.get(key) or {})
        try:
            score = int(row.get("score") or 10)
        except (TypeError, ValueError):
            score = 10
        row["score"] = max(1, min(30, score + int(delta)))
        abilities_block[key] = row
    sheet["abilities"] = abilities_block

    # AC on combat (seat cards read this)
    combat = dict(sheet.get("combat") or {})
    ac_delta = int(mods.get("ac") or 0)
    if ac_delta:
        try:
            cur = combat.get("ac")
            if cur is None:
                # seed from 10 + dex if present
                dex_row = abilities_block.get("dex") or {}
                try:
                    dex = int(dex_row.get("score") or 10)
                except (TypeError, ValueError):
                    dex = 10
                dex_mod = (dex - 10) // 2
                cur = 10 + dex_mod
            combat["ac"] = int(cur) + ac_delta
        except (TypeError, ValueError):
            combat["ac"] = 10 + ac_delta
        # track applied so UI can show hint
        combat["magic_ac_bonus"] = int(combat.get("magic_ac_bonus") or 0) + ac_delta
    sheet["combat"] = combat

    return {"item_id": item_id, "active": True, "mods": mods}
