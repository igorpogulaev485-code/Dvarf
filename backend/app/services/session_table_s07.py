"""S-07: отдых партии со стола и передача предметов (бой / взаимодействие).

T-01 чип экономики хода не строим — только счётчик object_interaction в combat JSON.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.core.exceptions import AppError
from app.services.session_table_s04 import epic_heroism_enabled, gritty_rest_enabled


def combat_active(state: dict | None) -> bool:
    return bool(state and state.get("active"))


def current_pc_ref(state: dict | None) -> str | None:
    """ref_id активного PC в очереди, иначе None."""
    if not state or not state.get("active"):
        return None
    entries = list(state.get("entries") or [])
    if not entries:
        return None
    try:
        ai = int(state.get("active_index") or 0)
    except (TypeError, ValueError):
        ai = 0
    if ai < 0 or ai >= len(entries):
        return None
    cur = entries[ai]
    if not isinstance(cur, dict):
        return None
    if cur.get("kind") != "pc":
        return None
    if cur.get("initiative_pending"):
        return None
    ref = cur.get("ref_id")
    return str(ref) if ref else None


def object_interactions(state: dict | None) -> dict[str, int]:
    raw = (state or {}).get("object_interactions")
    if not isinstance(raw, dict):
        return {}
    out: dict[str, int] = {}
    for key, value in raw.items():
        try:
            n = int(value)
        except (TypeError, ValueError):
            continue
        if n > 0:
            out[str(key)] = n
    return out


def clear_object_interactions(state: dict) -> dict:
    """Сброс отметок при смене хода (крючок T-01)."""
    next_state = dict(state)
    next_state["object_interactions"] = {}
    return next_state


def assert_player_transfer_in_combat(
    state: dict | None,
    *,
    from_character_id: UUID,
) -> None:
    """Вне боя — ок. В бою: только свой ход, одно взаимодействие с предметом за ход."""
    if not combat_active(state):
        return
    cid = str(from_character_id)
    current = current_pc_ref(state)
    if current != cid:
        raise AppError(
            "Дождись своего хода",
            code="transfer_not_your_turn",
            status_code=400,
        )
    used = object_interactions(state).get(cid, 0)
    if used >= 1:
        raise AppError(
            "Взаимодействие с предметом уже использовано в этом ходу "
            "(повторная передача — за счёт свободного действия, когда будет T-01)",
            code="transfer_interaction_used",
            status_code=400,
        )


def mark_object_interaction(state: dict, character_id: UUID) -> dict:
    """Отметить первое взаимодействие с предметом в текущий ход."""
    next_state = dict(state)
    bag = object_interactions(next_state)
    key = str(character_id)
    bag[key] = int(bag.get(key) or 0) + 1
    next_state["object_interactions"] = bag
    return next_state


def normalize_object_interactions(raw: object) -> dict[str, int]:
    if not isinstance(raw, dict):
        return {}
    out: dict[str, int] = {}
    for key, value in raw.items():
        try:
            n = int(value)
        except (TypeError, ValueError):
            continue
        if n > 0:
            out[str(key)] = n
    return out


def gritty_rest_copy(campaign_rules: object | None) -> dict[str, Any]:
    """Подписи для UI: обычный / суровый реализм / эпический героизм (O-04).

    При конфликте обоих флагов приоритет у эпического (UI снимает второй).
    """
    epic = epic_heroism_enabled(campaign_rules)
    gritty = gritty_rest_enabled(campaign_rules)
    if epic and not gritty:
        return {
            "gritty_rest": False,
            "epic_heroism": True,
            "short_label": "Короткий отдых (5 минут)",
            "long_label": "Долгий отдых (1 час)",
            "short_hint": "Эпический героизм: короткий отдых — 5 минут.",
            "long_hint": "Эпический героизм: долгий отдых — 1 час.",
        }
    if epic and gritty:
        return {
            "gritty_rest": False,
            "epic_heroism": True,
            "short_label": "Короткий отдых (5 минут)",
            "long_label": "Долгий отдых (1 час)",
            "short_hint": "Эпический героизм: короткий отдых — 5 минут.",
            "long_hint": "Эпический героизм: долгий отдых — 1 час.",
        }
    if gritty:
        return {
            "gritty_rest": True,
            "epic_heroism": False,
            "short_label": "Короткий отдых (8 часов)",
            "long_label": "Долгий отдых (7 дней)",
            "short_hint": "Суровый реализм: короткий отдых — 8 часов.",
            "long_hint": "Суровый реализм: долгий отдых — 7 дней.",
        }
    return {
        "gritty_rest": False,
        "epic_heroism": False,
        "short_label": "Короткий отдых",
        "long_label": "Долгий отдых",
        "short_hint": "Короткий отдых: кости хитов и сброс ресурсов «короткий».",
        "long_hint": "Долгий отдых: полные HP, ячейки, ресурсы и −1 истощение.",
    }


__all__ = [
    "combat_active",
    "current_pc_ref",
    "object_interactions",
    "clear_object_interactions",
    "assert_player_transfer_in_combat",
    "mark_object_interaction",
    "normalize_object_interactions",
    "gritty_rest_copy",
]
