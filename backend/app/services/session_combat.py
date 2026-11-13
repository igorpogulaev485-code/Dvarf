"""S-02: очередь боя, волны, павшие, инициатива (чистое состояние JSON).

Состояние живёт в PlaySession.combat / combatants (JSONB) — миграция колонок не нужна.
Старые сессии без waves открываются как одна уже выпущенная волна.
"""

from __future__ import annotations

import random
from uuid import uuid4

from app.services.sheet_effects import parse_effects
from app.services import session_sides as sides


def ability_mod(score: int | None) -> int:
    if score is None:
        return 0
    return (int(score) - 10) // 2


def _parse_object_interactions(raw: object) -> dict[str, int]:
    """S-07: счётчик взаимодействий с предметом за текущий ход (крючок T-01)."""
    if not isinstance(raw, dict):
        return {}
    out: dict[str, int] = {}
    for key, value in raw.items():
        try:
            n = int(value)
        except (TypeError, ValueError):
            continue
        if n > 0 and key:
            out[str(key)] = n
    return out


def initiative_bonus_from_sheet(sheet: dict | None) -> tuple[int, bool]:
    """Бонус инициативы и преимущество из уже существующих эффектов листа.

    Подхватываем flat mods target=initiative и advantage на initiative.
    Черты/расы полностью не дублируем — dex_mod + эффекты + override на листе.
    """
    if not isinstance(sheet, dict):
        return 0, False
    combat = sheet.get("combat") if isinstance(sheet.get("combat"), dict) else {}
    bonus = 0
    advantage = False
    # Ручной override на листе — это итог, не бонус; бонус считаем из эффектов.
    effects = parse_effects(combat.get("effects"))
    for effect in effects:
        mods = effect.get("mods") or []
        if not isinstance(mods, list):
            continue
        for mod in mods:
            if not isinstance(mod, dict):
                continue
            target = str(mod.get("target") or "")
            op = str(mod.get("op") or "")
            if target == "initiative" and op == "add":
                try:
                    bonus += int(mod.get("value") or 0)
                except (TypeError, ValueError):
                    pass
            if target == "initiative" and op == "advantage":
                advantage = True
            if target == "roll" and op == "advantage":
                cond = str(mod.get("condition") or "").lower()
                if cond in ("", "initiative", "init"):
                    advantage = True
    return bonus, advantage


def dex_mod_from_sheet(sheet: dict | None) -> int:
    if not isinstance(sheet, dict):
        return 0
    abilities = sheet.get("abilities") or {}
    if not isinstance(abilities, dict):
        return 0
    dex = abilities.get("dex")
    if isinstance(dex, int):
        return ability_mod(dex)
    if isinstance(dex, dict) and isinstance(dex.get("score"), int):
        return ability_mod(dex["score"])
    return 0


def roll_d20(*, advantage: bool = False, disadvantage: bool = False) -> tuple[int, str]:
    a = random.randint(1, 20)
    if advantage and not disadvantage:
        b = random.randint(1, 20)
        pick = max(a, b)
        return pick, f"d20[{a},{b}] преим. → {pick}"
    if disadvantage and not advantage:
        b = random.randint(1, 20)
        pick = min(a, b)
        return pick, f"d20[{a},{b}] помеха → {pick}"
    return a, f"d20 → {a}"


def _parse_wave(item: dict, *, fallback_index: int = 1) -> dict | None:
    wid = str(item.get("id") or "").strip() or str(uuid4())
    try:
        index = int(item.get("index") or fallback_index)
    except (TypeError, ValueError):
        index = fallback_index
    index = max(1, min(20, index))
    combatant_ids: list[str] = []
    raw_ids = item.get("combatant_ids")
    if isinstance(raw_ids, list):
        for cid in raw_ids:
            s = str(cid).strip()
            if s and s not in combatant_ids:
                combatant_ids.append(s)
    condition_text = item.get("condition_text")
    if condition_text is not None:
        condition_text = str(condition_text).strip()[:240] or None
    return {
        "id": wid,
        "index": index,
        "released": bool(item.get("released", index == 1)),
        "condition_text": condition_text,
        "combatant_ids": combatant_ids,
    }


def _parse_fallen(item: dict) -> dict | None:
    if not isinstance(item, dict):
        return None
    combatant_id = str(item.get("combatant_id") or "").strip()
    member_id = str(item.get("member_id") or "").strip()
    name = str(item.get("name") or "").strip()
    if not combatant_id or not member_id or not name:
        return None
    try:
        hp_max = max(1, int(item.get("hp_max") or 1))
    except (TypeError, ValueError):
        hp_max = 1
    return {
        "id": str(item.get("id") or "").strip() or str(uuid4()),
        "combatant_id": combatant_id,
        "member_id": member_id,
        "name": name,
        "hp_max": hp_max,
    }


def _parse_entry(item: dict) -> dict | None:
    if not isinstance(item, dict):
        return None
    kind = str(item.get("kind") or "").strip()
    ref_id = str(item.get("ref_id") or "").strip()
    name = str(item.get("name") or "").strip()
    if kind not in {"pc", "companion", "enemy"} or not ref_id or not name:
        return None
    companion_id = item.get("companion_id")
    dex_mod = item.get("dex_mod")
    pending = bool(item.get("initiative_pending"))
    raw_init = item.get("initiative")
    initiative: int | None
    if pending or raw_init is None:
        initiative = None if pending else 0
        if pending:
            initiative = None
        elif raw_init is None:
            pending = True
            initiative = None
        else:
            try:
                initiative = int(raw_init)
            except (TypeError, ValueError):
                pending = True
                initiative = None
    else:
        try:
            initiative = int(raw_init)
        except (TypeError, ValueError):
            pending = True
            initiative = None
    wave_id = item.get("wave_id")
    side_fields = sides.entry_side_fields_from_raw({**item, "kind": kind})
    return {
        "id": str(item.get("id") or "").strip() or str(uuid4()),
        "kind": kind,
        "ref_id": ref_id,
        "companion_id": str(companion_id) if companion_id else None,
        "name": name,
        "initiative": initiative,
        "initiative_pending": pending,
        "dex_mod": int(dex_mod) if isinstance(dex_mod, int) else None,
        "wave_id": str(wave_id) if wave_id else None,
        "defer_to_next_round": bool(item.get("defer_to_next_round")),
        "alive_count": (
            int(item["alive_count"])
            if isinstance(item.get("alive_count"), int)
            else None
        ),
        "member_count": (
            int(item["member_count"])
            if isinstance(item.get("member_count"), int)
            else None
        ),
        "member_tones": (
            [str(t) for t in item.get("member_tones") if isinstance(t, str)]
            if isinstance(item.get("member_tones"), list)
            else []
        ),
        **side_fields,
    }


def ensure_waves_for_combatants(
    waves: list[dict],
    combatants: list[dict],
) -> list[dict]:
    """Старые сессии без waves → одна выпущенная волна со всеми combatants."""
    if waves:
        # подтянуть combatants без wave_id в волну 1
        by_id = {w["id"]: w for w in waves}
        wave1 = next((w for w in waves if int(w["index"]) == 1), None)
        if wave1 is None and waves:
            wave1 = min(waves, key=lambda w: int(w["index"]))
        for c in combatants:
            cid = str(c.get("id") or "")
            wid = str(c.get("wave_id") or "")
            if wid and wid in by_id:
                if cid and cid not in by_id[wid]["combatant_ids"]:
                    by_id[wid]["combatant_ids"].append(cid)
                continue
            if wave1 is not None and cid:
                c["wave_id"] = wave1["id"]
                if cid not in wave1["combatant_ids"]:
                    wave1["combatant_ids"].append(cid)
        return sorted(waves, key=lambda w: int(w["index"]))

    if not combatants:
        return []
    wave_id = str(uuid4())
    ids = [str(c["id"]) for c in combatants if c.get("id")]
    for c in combatants:
        c["wave_id"] = wave_id
    return [
        {
            "id": wave_id,
            "index": 1,
            "released": True,
            "condition_text": None,
            "combatant_ids": ids,
        }
    ]


def parse_combat_state(raw: object, *, combatants: list[dict] | None = None) -> dict:
    combatants = list(combatants or [])
    if not isinstance(raw, dict):
        waves = ensure_waves_for_combatants([], combatants)
        return {
            "active": False,
            "round": 1,
            "active_index": 0,
            "waiting_reaction": False,
            "dice_on_table": False,
            "reaction_character_id": None,
            "reaction_hint": None,
            "pending_fumble": None,
            "entries": [],
            "waves": waves,
            "fallen": [],
            "saved_waves": [],
            "sides": sides.default_sides_registry(),
            # S-06
            "pending_rewards": None,
            "loot_chest": None,
            # S-07: взаимодействия с предметом в текущий ход (крючок T-01)
            "object_interactions": {},
        }

    entries: list[dict] = []
    raw_entries = raw.get("entries")
    if isinstance(raw_entries, list):
        for item in raw_entries:
            parsed = _parse_entry(item) if isinstance(item, dict) else None
            if parsed:
                entries.append(parsed)

    waves: list[dict] = []
    raw_waves = raw.get("waves")
    if isinstance(raw_waves, list):
        for i, item in enumerate(raw_waves):
            if not isinstance(item, dict):
                continue
            parsed = _parse_wave(item, fallback_index=i + 1)
            if parsed:
                waves.append(parsed)
    waves = ensure_waves_for_combatants(waves, combatants)

    fallen: list[dict] = []
    raw_fallen = raw.get("fallen")
    if isinstance(raw_fallen, list):
        for item in raw_fallen:
            parsed = _parse_fallen(item) if isinstance(item, dict) else None
            if parsed:
                fallen.append(parsed)

    saved_waves: list[dict] = []
    raw_saved = raw.get("saved_waves")
    if isinstance(raw_saved, list):
        for i, item in enumerate(raw_saved):
            if not isinstance(item, dict):
                continue
            parsed = _parse_wave(item, fallback_index=i + 1)
            if parsed:
                parsed["released"] = False
                saved_waves.append(parsed)

    active = bool(raw.get("active")) and (
        len(entries) > 0 or any(w.get("released") for w in waves)
    )
    # Бой может быть active с pending entries без чисел.
    if bool(raw.get("active")) and (entries or waves):
        active = True
    active_index = int(raw.get("active_index") or 0)
    if entries:
        active_index = max(0, min(len(entries) - 1, active_index))
    else:
        active_index = 0

    pending_fumble = raw.get("pending_fumble")
    if pending_fumble is not None and not isinstance(pending_fumble, dict):
        pending_fumble = None

    sides_reg = sides.parse_sides_registry(raw.get("sides"))
    # подтянуть стороны из entries в реестр
    for e in entries:
        sides_reg = sides.ensure_side_in_registry(sides_reg, sides.true_side(e))

    from app.services import session_rewards as rewards

    pending_rewards = rewards.normalize_pending_rewards(raw.get("pending_rewards"))
    loot_raw = raw.get("loot_chest")
    loot_chest = (
        rewards.normalize_loot_chest(loot_raw)
        if isinstance(loot_raw, dict)
        else None
    )

    return {
        "active": active,
        "round": max(1, int(raw.get("round") or 1)),
        "active_index": active_index,
        "waiting_reaction": bool(raw.get("waiting_reaction")),
        "dice_on_table": bool(raw.get("dice_on_table")),
        "reaction_character_id": (
            str(raw["reaction_character_id"])
            if raw.get("reaction_character_id")
            else None
        ),
        "reaction_hint": (
            str(raw["reaction_hint"])[:240] if raw.get("reaction_hint") else None
        ),
        "pending_fumble": pending_fumble,
        "entries": entries if active else [],
        "waves": waves,
        "fallen": fallen if active else [],
        "saved_waves": saved_waves,
        "sides": sides_reg,
        # S-06: переживают конец боя
        "pending_rewards": pending_rewards,
        "loot_chest": loot_chest,
        # S-07
        "object_interactions": _parse_object_interactions(raw.get("object_interactions")),
    }


def sort_combat_entries(entries: list[dict]) -> list[dict]:
    """PHB: выше инициатива раньше; pending — в конце; при равенстве — dex, имя."""

    def key(e: dict) -> tuple:
        pending = bool(e.get("initiative_pending")) or e.get("initiative") is None
        init = -999 if pending else -int(e.get("initiative") or 0)
        dex = e.get("dex_mod") if isinstance(e.get("dex_mod"), int) else -99
        return (1 if pending else 0, init, -dex, str(e.get("name") or ""))

    return sorted(entries, key=key)


def enrich_enemy_entry(entry: dict, combatant: dict | None) -> dict:
    if not combatant or entry.get("kind") != "enemy":
        return entry
    members = combatant.get("members") or []
    alive = [m for m in members if int(m.get("hp_current") or 0) > 0]
    tones: list[str] = []
    for m in members:
        cur = int(m.get("hp_current") or 0)
        mx = max(1, int(m.get("hp_max") or 1))
        if cur <= 0:
            tones.append("down")
        elif cur / mx <= 0.5:
            tones.append("warn")
        else:
            tones.append("ok")
    entry = {**entry}
    entry["alive_count"] = len(alive)
    entry["member_count"] = len(members) or 1
    entry["member_tones"] = tones
    if len(members) > 1 and len(alive) > 0:
        entry["name"] = f"{combatant.get('name') or entry['name']} ×{len(alive)}"
    elif len(members) > 1 and len(alive) == 0:
        entry["name"] = f"{combatant.get('name') or entry['name']} ×0"
    return entry


def filter_combat_for_viewer(
    state: dict,
    combatants: list[dict],
    *,
    see_hidden: bool,
) -> tuple[dict, list[dict]]:
    """Игрок/наблюдатель не видит невыпущенные волны и их combatants."""
    released_ids: set[str] = set()
    visible_waves: list[dict] = []
    for wave in state.get("waves") or []:
        if wave.get("released") or see_hidden:
            visible_waves.append(wave if see_hidden or wave.get("released") else wave)
        if wave.get("released"):
            released_ids.update(wave.get("combatant_ids") or [])
            for c in combatants:
                if str(c.get("wave_id") or "") == wave["id"]:
                    released_ids.add(str(c["id"]))

    # combatants без wave_id считаем выпущенными (legacy)
    visible_combatants: list[dict] = []
    for c in combatants:
        cid = str(c.get("id") or "")
        wid = str(c.get("wave_id") or "")
        if not wid or cid in released_ids or see_hidden:
            if see_hidden or not wid or cid in released_ids:
                # скрытые волны: не отдаём combatants невыпущенных
                wave = next((w for w in (state.get("waves") or []) if w["id"] == wid), None)
                if wave and not wave.get("released") and not see_hidden:
                    continue
                visible_combatants.append(c)

    if see_hidden:
        visible_combatants = list(combatants)
        visible_waves = list(state.get("waves") or [])

    hidden_combatant_ids = {
        str(c["id"]) for c in combatants if c not in visible_combatants
    }
    entries = [
        e
        for e in state.get("entries") or []
        if not (e.get("kind") == "enemy" and e.get("ref_id") in hidden_combatant_ids)
    ]
    # S-05: игроку скрытая сторона маскируется; мастер видит истину.
    entries = [
        sides.redact_entry_sides_for_viewer(e, see_hidden=see_hidden) for e in entries
    ]
    fallen = list(state.get("fallen") or []) if see_hidden else []
    out = {
        **state,
        "waves": visible_waves,
        "entries": entries,
        "fallen": fallen,
        "saved_waves": list(state.get("saved_waves") or []) if see_hidden else [],
        "sides": sides.parse_sides_registry(state.get("sides")),
    }
    # поправить active_index после фильтра
    if out["entries"]:
        out["active_index"] = max(0, min(len(out["entries"]) - 1, int(out["active_index"])))
    else:
        out["active_index"] = 0
    return out, visible_combatants


def dump_combat_state(state: dict) -> dict:
    entries = list(state.get("entries") or [])
    sides_reg = sides.parse_sides_registry(state.get("sides"))
    for e in entries:
        sides_reg = sides.ensure_side_in_registry(sides_reg, sides.true_side(e))
    from app.services import session_rewards as rewards

    pending = rewards.normalize_pending_rewards(state.get("pending_rewards"))
    loot_raw = state.get("loot_chest")
    loot = (
        rewards.normalize_loot_chest(loot_raw)
        if isinstance(loot_raw, dict)
        else None
    )
    out = {
        "active": bool(state.get("active")),
        "round": max(1, int(state.get("round") or 1)),
        "active_index": int(state.get("active_index") or 0),
        "waiting_reaction": bool(state.get("waiting_reaction")),
        "dice_on_table": bool(state.get("dice_on_table")),
        "reaction_character_id": state.get("reaction_character_id"),
        "reaction_hint": state.get("reaction_hint"),
        "pending_fumble": state.get("pending_fumble"),
        "entries": entries,
        "waves": list(state.get("waves") or []),
        "fallen": list(state.get("fallen") or []),
        "saved_waves": list(state.get("saved_waves") or []),
        "sides": sides_reg,
        "pending_rewards": pending,
        "loot_chest": loot,
        "object_interactions": _parse_object_interactions(
            state.get("object_interactions")
        ),
    }
    return out


def empty_combat(
    *,
    saved_waves: list[dict] | None = None,
    pending_rewards: dict | None = None,
    loot_chest: dict | None = None,
) -> dict:
    """Конец боя: очередь пуста, но S-06 снимок наград и сундук остаются."""
    from app.services import session_rewards as rewards

    return {
        "active": False,
        "round": 1,
        "active_index": 0,
        "waiting_reaction": False,
        "dice_on_table": False,
        "reaction_character_id": None,
        "reaction_hint": None,
        "pending_fumble": None,
        "entries": [],
        "waves": [],
        "fallen": [],
        "saved_waves": list(saved_waves or []),
        "sides": sides.default_sides_registry(),
        "pending_rewards": rewards.normalize_pending_rewards(pending_rewards),
        "loot_chest": (
            rewards.normalize_loot_chest(loot_chest)
            if isinstance(loot_chest, dict)
            else None
        ),
        "object_interactions": {},
    }


def insert_entry(
    state: dict,
    entry: dict,
    *,
    respect_current_turn: bool = True,
) -> dict:
    """Вставить участника в порядок; если слот уже прошёл — defer до след. раунда."""
    entries = list(state.get("entries") or [])
    active_id = None
    if entries and 0 <= int(state.get("active_index") or 0) < len(entries):
        active_id = entries[int(state["active_index"])].get("id")

    # убрать дубликат того же ref
    entries = [
        e
        for e in entries
        if not (
            e.get("kind") == entry.get("kind")
            and e.get("ref_id") == entry.get("ref_id")
            and (e.get("companion_id") or None) == (entry.get("companion_id") or None)
        )
    ]
    entries.append(entry)
    entries = sort_combat_entries(entries)

    if respect_current_turn and active_id and not entry.get("initiative_pending"):
        new_active = next((i for i, e in enumerate(entries) if e.get("id") == active_id), 0)
        new_idx = next((i for i, e in enumerate(entries) if e.get("id") == entry.get("id")), None)
        if new_idx is not None and new_idx <= new_active:
            for e in entries:
                if e.get("id") == entry.get("id"):
                    e["defer_to_next_round"] = True
                    break
        state["active_index"] = new_active
    elif active_id:
        state["active_index"] = next(
            (i for i, e in enumerate(entries) if e.get("id") == active_id),
            int(state.get("active_index") or 0),
        )

    state["entries"] = entries
    state["active"] = True
    return state


def advance_turn(state: dict, *, direction: int = 1) -> dict:
    entries = list(state.get("entries") or [])
    if not entries:
        return state
    n = len(entries)
    idx = int(state.get("active_index") or 0)
    round_no = int(state.get("round") or 1)
    steps = 0
    while steps < n + 1:
        if direction >= 0:
            idx += 1
            if idx >= n:
                idx = 0
                round_no += 1
                for e in entries:
                    e["defer_to_next_round"] = False
        else:
            idx -= 1
            if idx < 0:
                idx = n - 1
                round_no = max(1, round_no - 1)
        steps += 1
        cur = entries[idx]
        if cur.get("defer_to_next_round"):
            continue
        break
    state["entries"] = entries
    state["active_index"] = idx
    state["round"] = round_no
    state["waiting_reaction"] = False
    state["reaction_character_id"] = None
    state["reaction_hint"] = None
    return state


def remove_enemy_from_order(state: dict, combatant_id: str) -> dict:
    entries = list(state.get("entries") or [])
    if not entries:
        return state
    active_id = None
    ai = int(state.get("active_index") or 0)
    if 0 <= ai < len(entries):
        active_id = entries[ai].get("id")
    entries = [
        e
        for e in entries
        if not (e.get("kind") == "enemy" and e.get("ref_id") == combatant_id)
    ]
    if active_id:
        new_ai = next((i for i, e in enumerate(entries) if e.get("id") == active_id), 0)
    else:
        new_ai = 0
    if entries:
        new_ai = max(0, min(len(entries) - 1, new_ai))
    state["entries"] = entries
    state["active_index"] = new_ai
    return state


def sync_fallen_from_combatants(state: dict, combatants: list[dict]) -> tuple[dict, list[dict]]:
    """Враги/члены с 0 HP → fallen; группа остаётся в очереди, пока жив хоть один."""
    fallen = list(state.get("fallen") or [])
    fallen_keys = {(f["combatant_id"], f["member_id"]) for f in fallen}
    changed = False
    for combatant in combatants:
        cid = str(combatant.get("id") or "")
        members = list(combatant.get("members") or [])
        alive = [m for m in members if int(m.get("hp_current") or 0) > 0]
        for member in members:
            if int(member.get("hp_current") or 0) > 0:
                continue
            key = (cid, str(member.get("id") or ""))
            if key in fallen_keys:
                continue
            fallen.append(
                {
                    "id": str(uuid4()),
                    "combatant_id": cid,
                    "member_id": str(member["id"]),
                    "name": str(member.get("name") or combatant.get("name") or "Враг"),
                    "hp_max": max(1, int(member.get("hp_max") or 1)),
                }
            )
            fallen_keys.add(key)
            changed = True
        if not alive and cid:
            # вся группа пала — убрать из очереди
            before = len(state.get("entries") or [])
            state = remove_enemy_from_order(state, cid)
            if len(state.get("entries") or []) != before:
                changed = True
        else:
            # обновить подпись ×N в очереди
            for e in state.get("entries") or []:
                if e.get("kind") == "enemy" and e.get("ref_id") == cid:
                    enrich_enemy_entry(e, combatant)
    state["fallen"] = fallen
    return state, combatants if changed else combatants


def restore_fallen(
    state: dict,
    combatants: list[dict],
    fallen_id: str,
    *,
    hp: int | None = None,
) -> tuple[dict, list[dict]]:
    fallen = list(state.get("fallen") or [])
    target = next((f for f in fallen if f.get("id") == fallen_id), None)
    if target is None:
        return state, combatants
    combatant = next(
        (c for c in combatants if c.get("id") == target["combatant_id"]),
        None,
    )
    if combatant is None:
        state["fallen"] = [f for f in fallen if f.get("id") != fallen_id]
        return state, combatants
    members = list(combatant.get("members") or [])
    member = next((m for m in members if m.get("id") == target["member_id"]), None)
    restore_hp = max(1, int(hp) if hp is not None else 1)
    if member is None:
        member = {
            "id": target["member_id"],
            "name": target["name"],
            "hp_current": restore_hp,
            "hp_max": max(restore_hp, int(target.get("hp_max") or 1)),
        }
        members.append(member)
    else:
        m_max = max(1, int(member.get("hp_max") or target.get("hp_max") or 1))
        member["hp_current"] = min(m_max, restore_hp)
        member["hp_max"] = m_max
    combatant["members"] = members
    # sync summary left to caller
    state["fallen"] = [f for f in fallen if f.get("id") != fallen_id]

    # вернуть группу в очередь, если её не было
    in_order = any(
        e.get("kind") == "enemy" and e.get("ref_id") == combatant["id"]
        for e in state.get("entries") or []
    )
    if not in_order and state.get("active"):
        entry = {
            "id": str(uuid4()),
            "kind": "enemy",
            "ref_id": str(combatant["id"]),
            "companion_id": None,
            "name": str(combatant.get("name") or target["name"]),
            "initiative": 0,
            "initiative_pending": True,
            "dex_mod": combatant.get("dex_mod")
            if isinstance(combatant.get("dex_mod"), int)
            else None,
            "wave_id": combatant.get("wave_id"),
            "defer_to_next_round": False,
        }
        # если у павших была инициатива — не восстанавливаем число; мастер/бросок заново
        state = insert_entry(state, entry, respect_current_turn=True)
    else:
        for e in state.get("entries") or []:
            if e.get("kind") == "enemy" and e.get("ref_id") == combatant["id"]:
                enrich_enemy_entry(e, combatant)
    return state, combatants


def release_wave(state: dict, wave_id: str) -> dict:
    waves = list(state.get("waves") or [])
    wave = next((w for w in waves if w.get("id") == wave_id), None)
    if wave is None:
        return state
    wave["released"] = True
    state["waves"] = waves
    return state


def wave_reminders(state: dict, combatants: list[dict]) -> list[dict]:
    """Напоминания ведущему (не автозапуск): условие-текст / пал босс по имени в тексте."""
    reminders: list[dict] = []
    for wave in state.get("waves") or []:
        if wave.get("released"):
            continue
        text = (wave.get("condition_text") or "").strip()
        if not text:
            continue
        due = False
        # эвристика: «раунд N»
        lower = text.lower()
        if "раунд" in lower:
            for token in lower.replace(",", " ").split():
                if token.isdigit() and int(token) <= int(state.get("round") or 1):
                    due = True
                    break
        # «пал …» — если среди fallen есть совпадение имени из текста
        if "пал" in lower:
            fallen_names = " ".join(f.get("name", "").lower() for f in state.get("fallen") or [])
            # также мёртвые combatants
            for c in combatants:
                if int(c.get("alive_count") or 0) == 0:
                    fallen_names += " " + str(c.get("name") or "").lower()
            # вытащить имя после «пал»
            due = True  # ведущему показываем напоминание при любом «пал»-условии, если есть павшие
            if not (state.get("fallen") or any(int(c.get("alive_count") or 0) == 0 for c in combatants)):
                due = False
            elif fallen_names.strip():
                due = True
        reminders.append(
            {
                "wave_id": wave["id"],
                "wave_index": wave["index"],
                "condition_text": text,
                "due": due,
            }
        )
    return reminders


def set_entry_initiative(
    state: dict,
    *,
    entry_id: str | None = None,
    kind: str | None = None,
    ref_id: str | None = None,
    companion_id: str | None = None,
    initiative: int,
) -> dict:
    entries = list(state.get("entries") or [])
    target = None
    if entry_id:
        target = next((e for e in entries if e.get("id") == entry_id), None)
    elif kind and ref_id:
        target = next(
            (
                e
                for e in entries
                if e.get("kind") == kind
                and e.get("ref_id") == ref_id
                and (e.get("companion_id") or None) == (companion_id or None)
            ),
            None,
        )
    if target is None:
        return state
    active_id = None
    ai = int(state.get("active_index") or 0)
    if 0 <= ai < len(entries):
        active_id = entries[ai].get("id")
    target["initiative"] = int(initiative)
    target["initiative_pending"] = False
    entries = sort_combat_entries(entries)
    # deferred if slot passed
    if active_id and active_id != target.get("id"):
        new_active = next((i for i, e in enumerate(entries) if e.get("id") == active_id), 0)
        new_idx = next((i for i, e in enumerate(entries) if e.get("id") == target.get("id")), 0)
        if new_idx <= new_active:
            target["defer_to_next_round"] = True
        state["active_index"] = new_active
    elif active_id == target.get("id"):
        state["active_index"] = next(
            (i for i, e in enumerate(entries) if e.get("id") == active_id), 0
        )
    state["entries"] = entries
    return state
