"""L-21: отметки экономики хода мастером и неожиданность (PHB 2014).

Состояние в sheet.combat.turn_economy / session.combat.entries[].surprised —
отдельной миграции нет.
"""

from __future__ import annotations

from typing import Any

MARK_KEYS = ("action", "bonus", "reaction", "object_interaction", "moved")

MARK_LABELS_RU = {
    "action": "действие",
    "bonus": "бонусное",
    "reaction": "реакцию",
    "object_interaction": "взаимодействие",
    "moved": "движение",
}


def empty_turn_economy() -> dict[str, Any]:
    return {
        "action": False,
        "bonus": False,
        "reaction": False,
        "object_interaction": False,
        "moved": False,
        "extra_actions": 0,
        "action_spent_as": None,
        "casts_this_turn": [],
        "gm_locks": [],
        "surprised": False,
    }


def read_turn_economy(raw: object) -> dict[str, Any]:
    base = empty_turn_economy()
    if not isinstance(raw, dict):
        return base
    out = dict(base)
    for key in ("action", "bonus", "reaction", "moved", "surprised"):
        if key in raw:
            out[key] = bool(raw.get(key))
    out["object_interaction"] = bool(
        raw.get("object_interaction")
        if "object_interaction" in raw
        else raw.get("objectInteraction")
    )
    locks_raw = raw.get("gm_locks") or raw.get("gmLocks") or []
    locks: list[str] = []
    if isinstance(locks_raw, list):
        for item in locks_raw:
            s = str(item or "").strip()
            if s in MARK_KEYS and s not in locks:
                locks.append(s)
    out["gm_locks"] = locks
    # Preserve richer T-01 fields when present so we don't wipe auto-spend metadata.
    for key in (
        "extra_actions",
        "action_spent_as",
        "casts_this_turn",
        "steady_aim",
        "ki_spent_as",
        "dashed_this_turn",
        "attack_action_this_turn",
        "ready_prepared",
        "ready_trigger",
        "ready_kind",
        "ready_spell_id",
        "ready_spell_name",
        "ready_spell_level",
        "disengaged_this_turn",
    ):
        if key in raw:
            out[key] = raw[key]
    return out


def serialize_turn_economy(state: dict[str, Any]) -> dict[str, Any]:
    out = dict(state)
    out["action"] = bool(state.get("action"))
    out["bonus"] = bool(state.get("bonus"))
    out["reaction"] = bool(state.get("reaction"))
    out["object_interaction"] = bool(state.get("object_interaction"))
    out["moved"] = bool(state.get("moved"))
    out["surprised"] = bool(state.get("surprised"))
    locks: list[str] = []
    for item in state.get("gm_locks") or []:
        s = str(item or "").strip()
        if s in MARK_KEYS and s not in locks:
            locks.append(s)
    out["gm_locks"] = locks
    return out


def lock_keys(state: dict[str, Any]) -> set[str]:
    return {str(x) for x in (state.get("gm_locks") or []) if str(x) in MARK_KEYS}


def apply_mark_patch(
    state: dict[str, Any],
    patch: dict[str, bool | None],
    *,
    as_gm: bool,
) -> tuple[dict[str, Any], list[tuple[str, bool]]]:
    """Apply partial mark changes. Returns (next_state, changes[(key, spent)]).

    GM can set/clear freely and manages gm_locks.
    Owner may set spent marks, but cannot clear gm_locks / surprise locks.
    """
    next_state = read_turn_economy(state)
    locks = lock_keys(next_state)
    surprised = bool(next_state.get("surprised"))
    changes: list[tuple[str, bool]] = []

    for key, value in patch.items():
        if key not in MARK_KEYS or value is None:
            continue
        spent = bool(value)
        current = bool(next_state.get(key)) if key != "object_interaction" else bool(
            next_state.get("object_interaction")
        )
        if spent == current:
            continue
        # L-21: блок неожиданности до конца первого хода — никто не снимает.
        if surprised and not spent:
            raise PermissionError("surprise_locked")
        if not as_gm and not spent and key in locks:
            raise PermissionError("gm_locked")
        next_state[key] = spent
        if key == "action" and not spent:
            next_state["action_spent_as"] = None
        if as_gm:
            if spent:
                locks.add(key)
            else:
                locks.discard(key)
        changes.append((key, spent))

    next_state["gm_locks"] = sorted(locks)
    return serialize_turn_economy(next_state), changes


def apply_surprise_lock(state: dict[str, Any] | None = None) -> dict[str, Any]:
    next_state = read_turn_economy(state)
    next_state["action"] = True
    next_state["bonus"] = True
    next_state["reaction"] = True
    next_state["object_interaction"] = True
    next_state["moved"] = True
    next_state["action_spent_as"] = None
    next_state["surprised"] = True
    next_state["gm_locks"] = list(MARK_KEYS)
    return serialize_turn_economy(next_state)


def clear_surprise_and_reset(_state: dict[str, Any] | None = None) -> dict[str, Any]:
    return empty_turn_economy()


def reset_for_turn_start(state: dict[str, Any] | None = None) -> dict[str, Any]:
    """Start of PC turn: keep surprise lock, otherwise clear marks."""
    cur = read_turn_economy(state)
    if cur.get("surprised"):
        return apply_surprise_lock(cur)
    return empty_turn_economy()


def sheet_has_alert_flag(sheet: dict | None) -> bool:
    if not isinstance(sheet, dict):
        return False
    grants = sheet.get("feat_grants")
    if isinstance(grants, list):
        for row in grants:
            if not isinstance(row, dict):
                continue
            slug = str(row.get("slug") or "").strip().lower()
            if slug == "alert":
                return True
            applied = row.get("applied") if isinstance(row.get("applied"), dict) else {}
            flags = applied.get("flags") if isinstance(applied.get("flags"), list) else []
            if any(str(f).strip().lower() == "alert" for f in flags):
                return True
    return False


def sheet_has_no_surprise_while_conscious(sheet: dict | None) -> bool:
    if not isinstance(sheet, dict):
        return False
    combat = sheet.get("combat") if isinstance(sheet.get("combat"), dict) else {}
    effects = combat.get("effects") if isinstance(combat.get("effects"), list) else []
    for effect in effects:
        if not isinstance(effect, dict):
            continue
        mods = effect.get("mods") if isinstance(effect.get("mods"), list) else []
        for mod in mods:
            if not isinstance(mod, dict):
                continue
            cond = str(mod.get("condition") or "").strip().lower()
            if cond == "no_surprise_while_conscious":
                return True
    return False


def is_conscious_for_surprise(
    *,
    hp_current: int | None,
    combat: dict | None,
) -> bool:
    combat = combat if isinstance(combat, dict) else {}
    if hp_current is not None and int(hp_current) <= 0:
        return False
    if bool(combat.get("is_dying")):
        return False
    conditions = combat.get("conditions") if isinstance(combat.get("conditions"), list) else []
    for row in conditions:
        if not isinstance(row, dict):
            continue
        slug = str(row.get("slug") or "").strip().lower()
        if slug in {"unconscious", "incapacitated"}:
            return False
    return True


def sheet_surprise_immune(
    sheet: dict | None,
    *,
    hp_current: int | None = None,
) -> bool:
    """Alert / no_surprise_while_conscious while conscious."""
    if not isinstance(sheet, dict):
        return False
    combat = sheet.get("combat") if isinstance(sheet.get("combat"), dict) else {}
    if not is_conscious_for_surprise(hp_current=hp_current, combat=combat):
        return False
    return sheet_has_alert_flag(sheet) or sheet_has_no_surprise_while_conscious(sheet)


def merge_owner_turn_economy_write(
    previous: object,
    incoming: object,
) -> dict[str, Any]:
    """Owner updateCharacter cannot clear GM/surprise locks."""
    prev = read_turn_economy(previous)
    nxt = read_turn_economy(incoming)
    locks = lock_keys(prev)
    surprised = bool(prev.get("surprised"))
    if surprised:
        return apply_surprise_lock(prev)
    for key in locks:
        nxt[key] = True
        if key == "action":
            # keep spent metadata if any
            if not nxt.get("action_spent_as"):
                nxt["action_spent_as"] = prev.get("action_spent_as")
    nxt["gm_locks"] = sorted(locks)
    nxt["surprised"] = False
    return serialize_turn_economy(nxt)


def mark_feed_phrase(changes: list[tuple[str, bool]]) -> str | None:
    if not changes:
        return None
    parts_set: list[str] = []
    parts_clear: list[str] = []
    for key, spent in changes:
        label = MARK_LABELS_RU.get(key)
        if not label:
            continue
        if spent:
            parts_set.append(label)
        else:
            parts_clear.append(label)
    chunks: list[str] = []
    if parts_set:
        chunks.append("отметил: " + ", ".join(parts_set))
    if parts_clear:
        chunks.append("снял: " + ", ".join(parts_clear))
    return "; ".join(chunks) if chunks else None
