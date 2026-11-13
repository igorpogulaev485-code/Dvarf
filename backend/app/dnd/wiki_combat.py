"""W-03: страница вики «Бой» — волны/лут в fields + оценка DMG 2014.

Волны совместимы с S-02 (CombatWaveInput + add_combatants).
Оценка — budget_base + encounter_xp_cost, без party_power G-01.
"""

from __future__ import annotations

from typing import Any

from app.dnd.encounter_budget import (
    EncounterDifficulty,
    budget_base,
    encounter_xp_cost,
)
from app.dnd.setting_templates import _field
from app.services import session_rewards as rewards

COMBAT_PARENT_KINDS = frozenset({"location", "quest"})

WAVE_CONDITION_PRESETS = (
    "сразу",
    "через 1 раунд",
    "через 2 раунда",
    "через 3 раунда",
    "когда пала предыдущая",
)

# Системный шаблон: schema почти пустая — волны/лут живут в JSON fields.
COMBAT_SYSTEM_TEMPLATE: dict[str, Any] = {
    "page_kind": "combat",
    "name": "Бой",
    "body_seed": "",
    "schema": [
        _field("gm_notes", "Заметки мастера", "long", gm_only=True),
    ],
}


def empty_combat_fields() -> dict[str, Any]:
    return {
        "waves": [
            {
                "index": 1,
                "condition_text": "сразу",
                "combatants": [],
            }
        ],
        "loot": {
            "items": [],
            "coins": rewards.empty_coins(),
        },
        "party_levels": [],
        "gm_notes": "",
    }


def normalize_wave_combatant(raw: object | None) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    slug = str(raw.get("slug") or "").strip()[:80] or None
    catalog_id = str(raw.get("catalog_id") or "").strip()[:80] or None
    name = str(raw.get("name") or "").strip()[:120]
    custom = bool(raw.get("custom")) or (not slug and not catalog_id)
    try:
        count = max(1, min(20, int(raw.get("count") or 1)))
    except (TypeError, ValueError):
        count = 1
    hp_max = raw.get("hp_max")
    ac = raw.get("ac")
    xp = raw.get("xp")
    try:
        hp_max_i = int(hp_max) if hp_max is not None and str(hp_max) != "" else None
    except (TypeError, ValueError):
        hp_max_i = None
    try:
        ac_i = int(ac) if ac is not None and str(ac) != "" else None
    except (TypeError, ValueError):
        ac_i = None
    try:
        xp_i = int(xp) if xp is not None and str(xp) != "" else None
    except (TypeError, ValueError):
        xp_i = None
    if custom and not name:
        return None
    if not custom and not slug and not catalog_id:
        return None
    actions = raw.get("actions") if isinstance(raw.get("actions"), list) else []
    return {
        "slug": None if custom else slug,
        "catalog_id": None if custom else catalog_id,
        "name": name or (slug or "Враг"),
        "count": count,
        "hp_max": hp_max_i,
        "ac": ac_i,
        "xp": xp_i,
        "custom": custom,
        "actions": actions,
    }


def normalize_wave(raw: object | None, *, fallback_index: int = 1) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    try:
        index = max(1, min(20, int(raw.get("index") or fallback_index)))
    except (TypeError, ValueError):
        index = fallback_index
    condition = str(raw.get("condition_text") or "").strip()[:240] or None
    if index == 1 and not condition:
        condition = "сразу"
    combatants: list[dict[str, Any]] = []
    for row in raw.get("combatants") or []:
        parsed = normalize_wave_combatant(row)
        if parsed:
            combatants.append(parsed)
    return {
        "index": index,
        "condition_text": condition,
        "combatants": combatants,
    }


def normalize_loot_prep(raw: object | None) -> dict[str, Any]:
    """Заготовка лута в форме сундука S-06 (без on_table/log)."""
    chest = rewards.normalize_loot_chest(raw if isinstance(raw, dict) else {})
    return {
        "items": list(chest.get("items") or []),
        "coins": dict(chest.get("coins") or rewards.empty_coins()),
    }


def normalize_combat_fields(raw: object | None) -> dict[str, Any]:
    base = empty_combat_fields()
    if not isinstance(raw, dict):
        return base
    waves: list[dict[str, Any]] = []
    for i, row in enumerate(raw.get("waves") or []):
        parsed = normalize_wave(row, fallback_index=i + 1)
        if parsed:
            waves.append(parsed)
    if not waves:
        waves = list(base["waves"])
    waves.sort(key=lambda w: int(w["index"]))
    # перенумеровать подряд с 1, сохраняя порядок
    for i, w in enumerate(waves, start=1):
        w["index"] = i
        if i == 1 and not w.get("condition_text"):
            w["condition_text"] = "сразу"
    levels: list[int] = []
    for lvl in raw.get("party_levels") or []:
        try:
            levels.append(max(1, min(20, int(lvl))))
        except (TypeError, ValueError):
            continue
    out = {
        "waves": waves,
        "loot": normalize_loot_prep(raw.get("loot")),
        "party_levels": levels[:12],
        "gm_notes": str(raw.get("gm_notes") or "")[:4000],
    }
    # сохранить прочие скалярные ключи шаблона
    for k, v in raw.items():
        if k in out:
            continue
        if isinstance(v, (str, int, float, bool)) or v is None:
            out[k] = v
    return out


def merge_combat_fields(existing: object | None, patch: object | None) -> dict[str, Any]:
    """Слияние: patch полностью заменяет waves/loot/party_levels при наличии ключа."""
    cur = normalize_combat_fields(existing)
    if not isinstance(patch, dict):
        return cur
    if "waves" in patch:
        cur["waves"] = normalize_combat_fields({"waves": patch.get("waves")})["waves"]
    if "loot" in patch:
        cur["loot"] = normalize_loot_prep(patch.get("loot"))
    if "party_levels" in patch:
        cur["party_levels"] = normalize_combat_fields(
            {"party_levels": patch.get("party_levels")}
        )["party_levels"]
    if "gm_notes" in patch:
        cur["gm_notes"] = str(patch.get("gm_notes") or "")[:4000]
    for k, v in patch.items():
        if k in {"waves", "loot", "party_levels", "gm_notes"}:
            continue
        if isinstance(v, (str, int, float, bool)) or v is None:
            cur[k] = v
    return cur


def loot_prep_to_chest(loot: object | None) -> dict[str, Any]:
    """Черновик сундука из заготовки страницы (не на столе)."""
    prep = normalize_loot_prep(loot)
    chest = rewards.empty_loot_chest()
    chest["items"] = list(prep.get("items") or [])
    chest["coins"] = dict(prep.get("coins") or rewards.empty_coins())
    chest["on_table"] = False
    chest["log"] = []
    return chest


def estimate_combat_dmg(
    fields: object | None,
    *,
    party_levels: list[int] | None = None,
    xp_by_slug: dict[str, int] | None = None,
) -> dict[str, Any]:
    """Оценка DMG 2014: пороги budget_base + стоимость с monster_count_multiplier.

    Без party_power / budget_adjusted.
    """
    data = normalize_combat_fields(fields)
    levels = list(party_levels or data.get("party_levels") or [])
    levels = [max(1, min(20, int(x))) for x in levels][:12]
    xp_map = xp_by_slug or {}

    total_raw = 0
    total_adjusted = 0
    monster_count = 0
    unknown = 0
    breakdown: list[dict[str, Any]] = []

    for wave in data["waves"]:
        for c in wave["combatants"]:
            count = int(c.get("count") or 1)
            monster_count += count
            each = c.get("xp")
            if each is None and c.get("slug"):
                each = xp_map.get(str(c["slug"]))
            if each is None:
                unknown += count
                continue
            each_i = max(0, int(each))
            adj = encounter_xp_cost(each_i, count)
            total_raw += each_i * count
            total_adjusted += adj
            breakdown.append(
                {
                    "name": c.get("name") or c.get("slug") or "Враг",
                    "count": count,
                    "xp_each": each_i,
                    "xp_adjusted": adj,
                    "wave_index": wave["index"],
                }
            )

    thresholds: dict[str, int] | None = None
    band: str | None = None
    note: str | None = None
    if levels:
        thresholds = {
            d.value: budget_base(levels, d)
            for d in (
                EncounterDifficulty.easy,
                EncounterDifficulty.medium,
                EncounterDifficulty.hard,
                EncounterDifficulty.deadly,
            )
        }
        if total_adjusted <= 0 and unknown:
            band = None
            note = "Не хватает XP у части врагов"
        elif total_adjusted <= thresholds["easy"]:
            band = "easy"
        elif total_adjusted <= thresholds["medium"]:
            band = "medium"
        elif total_adjusted <= thresholds["hard"]:
            band = "hard"
        elif total_adjusted <= thresholds["deadly"]:
            band = "deadly"
        else:
            band = "beyond"
    else:
        note = "по составу, когда будет стол (или укажите уровни партии)"

    return {
        "party_levels": levels,
        "monster_count": monster_count,
        "xp_raw": total_raw,
        "xp_adjusted": total_adjusted,
        "unknown_xp_count": unknown,
        "thresholds": thresholds,
        "band": band,
        "note": note,
        "breakdown": breakdown,
    }


def waves_from_generator_picks(
    picks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Собрать waves[] для fields из выбора генератора (slug + count)."""
    waves: list[dict[str, Any]] = []
    for i, pick in enumerate(picks, start=1):
        if not isinstance(pick, dict):
            continue
        try:
            index = max(1, int(pick.get("wave_index") or pick.get("index") or i))
        except (TypeError, ValueError):
            index = i
        combatants: list[dict[str, Any]] = []
        for role_key in ("boss", "pack"):
            role = pick.get(role_key)
            if not isinstance(role, dict):
                continue
            slug = str(role.get("slug") or "").strip()
            if not slug:
                continue
            if role_key == "boss":
                count = 1
            else:
                try:
                    count = max(1, min(20, int(pick.get("pack_count") or role.get("count") or 1)))
                except (TypeError, ValueError):
                    count = 1
            combatants.append(
                {
                    "slug": slug,
                    "catalog_id": None,
                    "name": str(role.get("name_ru") or role.get("name") or slug)[:120],
                    "count": count,
                    "hp_max": None,
                    "ac": None,
                    "xp": int(role["xp"]) if isinstance(role.get("xp"), int) else None,
                    "custom": False,
                    "actions": [],
                }
            )
        # плоский список combatants без boss/pack
        for row in pick.get("combatants") or []:
            parsed = normalize_wave_combatant(row)
            if parsed:
                combatants.append(parsed)
        if not combatants:
            continue
        condition = str(pick.get("condition_text") or "").strip()[:240]
        if not condition:
            condition = "сразу" if index == 1 else "когда пала предыдущая"
        waves.append(
            {
                "index": index,
                "condition_text": condition,
                "combatants": combatants,
            }
        )
    waves.sort(key=lambda w: int(w["index"]))
    for i, w in enumerate(waves, start=1):
        w["index"] = i
    return waves
