"""S-05: стороны в бою (Партия / Враги / третьи), скрытие, помощник «свои».

Хранение — в JSON `session.combat` (entries + реестр sides). Миграция колонок не нужна.
Старые бои без поля side читаем как: pc/companion → party, enemy → enemies.
"""

from __future__ import annotations

import re
from typing import Any
from uuid import uuid4

SIDE_PARTY = "party"
SIDE_ENEMIES = "enemies"

DEFAULT_SIDE_LABELS: dict[str, str] = {
    SIDE_PARTY: "Партия",
    SIDE_ENEMIES: "Враги",
}

_SIDE_ID_RE = re.compile(r"^[a-z][a-z0-9_]{0,31}$")


def default_side_for_kind(kind: str | None) -> str:
    if kind == "enemy":
        return SIDE_ENEMIES
    return SIDE_PARTY


def looks_like_side_id(raw: object | None) -> bool:
    s = str(raw or "").strip().lower()
    if not s:
        return False
    if _SIDE_ID_RE.match(s):
        return True
    return len(s) <= 40 and all(c.isalnum() or c in "-_" for c in s)


def normalize_side_id(raw: object | None, *, fallback: str = SIDE_PARTY) -> str:
    s = str(raw or "").strip().lower()
    if not s:
        return fallback
    if looks_like_side_id(s):
        return s
    return fallback


def slugify_side_label(label: str) -> str:
    """Детерминированный id из ярлыка; при коллизии вызывающий добавит суффикс."""
    text = (label or "").strip().lower()
    # простая транслитерация частых кириллических букв
    table = str.maketrans(
        {
            "а": "a",
            "б": "b",
            "в": "v",
            "г": "g",
            "д": "d",
            "е": "e",
            "ё": "e",
            "ж": "zh",
            "з": "z",
            "и": "i",
            "й": "i",
            "к": "k",
            "л": "l",
            "м": "m",
            "н": "n",
            "о": "o",
            "п": "p",
            "р": "r",
            "с": "s",
            "т": "t",
            "у": "u",
            "ф": "f",
            "х": "h",
            "ц": "c",
            "ч": "ch",
            "ш": "sh",
            "щ": "sch",
            "ъ": "",
            "ы": "y",
            "ь": "",
            "э": "e",
            "ю": "yu",
            "я": "ya",
            " ": "_",
            "-": "_",
        }
    )
    slug = "".join(ch for ch in text.translate(table) if ch.isalnum() or ch == "_")
    slug = re.sub(r"_+", "_", slug).strip("_")
    if not slug or not slug[0].isalpha():
        slug = f"side_{slug}" if slug else f"side_{uuid4().hex[:8]}"
    return slug[:32]


def true_side(row: dict | None, *, kind_fallback: str | None = None) -> str:
    """Истинная сторона записи очереди / combatant / цели."""
    if not isinstance(row, dict):
        return default_side_for_kind(kind_fallback)
    kind = str(row.get("kind") or kind_fallback or "")
    if row.get("side"):
        return normalize_side_id(row.get("side"), fallback=default_side_for_kind(kind))
    # legacy: kind → default
    return default_side_for_kind(kind or row.get("kind"))


def side_is_hidden(row: dict | None) -> bool:
    if not isinstance(row, dict):
        return False
    return bool(row.get("side_hidden"))


def visible_side(
    row: dict | None,
    *,
    see_hidden: bool,
    kind_fallback: str | None = None,
) -> str:
    """Сторона для зрителя: скрытая выглядит как Партия (или прежняя маска)."""
    if see_hidden or not side_is_hidden(row):
        return true_side(row, kind_fallback=kind_fallback)
    mask = None
    if isinstance(row, dict):
        mask = row.get("side_mask")
    if mask:
        return normalize_side_id(mask, fallback=SIDE_PARTY)
    return SIDE_PARTY


def is_same_side(a: str | None, b: str | None) -> bool:
    return normalize_side_id(a) == normalize_side_id(b)


def is_ally_of(
    actor_side: str | None,
    target_row: dict | None,
    *,
    use_true: bool = True,
    see_hidden: bool = True,
    kind_fallback: str | None = None,
) -> bool:
    """Свои = та же сторона. use_true — сервер/мастер; иначе видимая маска."""
    target_side = (
        true_side(target_row, kind_fallback=kind_fallback)
        if use_true
        else visible_side(target_row, see_hidden=see_hidden, kind_fallback=kind_fallback)
    )
    return is_same_side(actor_side, target_side)


def default_sides_registry() -> list[dict]:
    return [
        {"id": SIDE_PARTY, "label": DEFAULT_SIDE_LABELS[SIDE_PARTY]},
        {"id": SIDE_ENEMIES, "label": DEFAULT_SIDE_LABELS[SIDE_ENEMIES]},
    ]


def parse_sides_registry(raw: object | None) -> list[dict]:
    out: list[dict] = []
    seen: set[str] = set()
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            sid = normalize_side_id(item.get("id"), fallback="")
            if not sid or sid in seen:
                continue
            label = str(item.get("label") or DEFAULT_SIDE_LABELS.get(sid) or sid).strip()[:80]
            if not label:
                label = sid
            out.append({"id": sid, "label": label})
            seen.add(sid)
    for base in default_sides_registry():
        if base["id"] not in seen:
            out.insert(0 if base["id"] == SIDE_PARTY else len(out), base)
            seen.add(base["id"])
    # party / enemies всегда первыми в каноническом порядке
    ordered: list[dict] = []
    for need in (SIDE_PARTY, SIDE_ENEMIES):
        hit = next((s for s in out if s["id"] == need), None)
        if hit:
            ordered.append(hit)
    for s in out:
        if s["id"] not in {SIDE_PARTY, SIDE_ENEMIES}:
            ordered.append(s)
    return ordered


def ensure_side_in_registry(sides: list[dict], side_id: str, label: str | None = None) -> list[dict]:
    sid = normalize_side_id(side_id)
    for s in sides:
        if s["id"] == sid:
            if label and label.strip() and s["id"] not in DEFAULT_SIDE_LABELS:
                s["label"] = label.strip()[:80]
            return sides
    lbl = (label or "").strip()[:80] or DEFAULT_SIDE_LABELS.get(sid) or sid
    sides.append({"id": sid, "label": lbl})
    return sides


def side_label(sides: list[dict], side_id: str) -> str:
    sid = normalize_side_id(side_id)
    for s in sides:
        if s["id"] == sid:
            return str(s.get("label") or sid)
    return DEFAULT_SIDE_LABELS.get(sid, sid)


def apply_default_sides_to_entries(entries: list[dict]) -> list[dict]:
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        kind = str(entry.get("kind") or "")
        if not entry.get("side"):
            entry["side"] = default_side_for_kind(kind)
        else:
            entry["side"] = normalize_side_id(
                entry.get("side"), fallback=default_side_for_kind(kind)
            )
        entry["side_hidden"] = bool(entry.get("side_hidden"))
        if entry.get("side_mask"):
            entry["side_mask"] = normalize_side_id(entry.get("side_mask"), fallback=SIDE_PARTY)
        else:
            entry["side_mask"] = None
    return entries


def apply_default_sides_to_combatants(combatants: list[dict]) -> list[dict]:
    for c in combatants:
        if not isinstance(c, dict):
            continue
        if not c.get("side"):
            c["side"] = SIDE_ENEMIES
        else:
            c["side"] = normalize_side_id(c.get("side"), fallback=SIDE_ENEMIES)
        c["side_hidden"] = bool(c.get("side_hidden"))
    return combatants


def find_entry_for_ref(
    state: dict,
    *,
    kind: str,
    ref_id: str,
    companion_id: str | None = None,
) -> dict | None:
    for e in state.get("entries") or []:
        if not isinstance(e, dict):
            continue
        if e.get("kind") != kind:
            continue
        if str(e.get("ref_id") or "") != str(ref_id):
            continue
        if kind == "companion":
            if (e.get("companion_id") or None) != (companion_id or None):
                continue
        return e
    return None


def find_entry_by_id(state: dict, entry_id: str) -> dict | None:
    for e in state.get("entries") or []:
        if isinstance(e, dict) and str(e.get("id") or "") == str(entry_id):
            return e
    return None


def set_entry_side(
    entry: dict,
    *,
    side: str,
    side_hidden: bool | None = None,
    side_mask: str | None = None,
    label_for_mask: bool = True,
) -> dict:
    """Перевести участника. При скрытии маска — прежняя видимая «Партия» по умолчанию."""
    prev_true = true_side(entry)
    was_hidden = side_is_hidden(entry)
    new_side = normalize_side_id(side, fallback=prev_true)
    entry["side"] = new_side
    if side_hidden is not None:
        entry["side_hidden"] = bool(side_hidden)
    if entry["side_hidden"]:
        if side_mask is not None:
            entry["side_mask"] = normalize_side_id(side_mask, fallback=SIDE_PARTY)
        elif not was_hidden or not entry.get("side_mask"):
            # маска = как выглядел до перевода (обычно party)
            entry["side_mask"] = prev_true if label_for_mask else SIDE_PARTY
            if new_side == prev_true and prev_true != SIDE_PARTY:
                entry["side_mask"] = SIDE_PARTY
    else:
        entry["side_mask"] = None
    return entry


def reveal_entry_side(entry: dict) -> dict:
    entry["side_hidden"] = False
    entry["side_mask"] = None
    return entry


def maybe_reveal_on_hostile(
    state: dict,
    *,
    actor_entry: dict | None,
    target_entry: dict | None,
    target_kind: str | None = None,
) -> bool:
    """
    Первое враждебное действие скрытого бойца по прежней (маскированной) стороне → раскрытие.
    Удар по тому, кто выглядит «своим» для маски (обычно Партия).
    """
    del state  # state мутируется через actor_entry in-place
    if not actor_entry or not side_is_hidden(actor_entry):
        return False
    mask = visible_side(actor_entry, see_hidden=False)
    if target_entry is not None:
        target_true = true_side(target_entry, kind_fallback=target_kind)
    else:
        target_true = default_side_for_kind(target_kind)
    if is_same_side(mask, target_true):
        reveal_entry_side(actor_entry)
        return True
    return False


def reset_party_on_combat_end_noop() -> None:
    """Конец боя чистит entries через empty_combat — стороны сбрасываются вместе с JSON."""
    return None


def allies_of_side(
    rows: list[dict],
    side: str,
    *,
    use_true: bool = True,
    see_hidden: bool = True,
) -> list[dict]:
    return [
        r
        for r in rows
        if is_ally_of(side, r, use_true=use_true, see_hidden=see_hidden)
    ]


def foes_of_side(
    rows: list[dict],
    side: str,
    *,
    use_true: bool = True,
    see_hidden: bool = True,
) -> list[dict]:
    return [
        r
        for r in rows
        if not is_ally_of(side, r, use_true=use_true, see_hidden=see_hidden)
    ]


def redact_entry_sides_for_viewer(entry: dict, *, see_hidden: bool) -> dict:
    """Копия entry для API: игроку — видимая сторона, без флага скрытия если не мастер."""
    out = {**entry}
    vis = visible_side(entry, see_hidden=see_hidden)
    if see_hidden:
        out["side"] = true_side(entry)
        out["side_hidden"] = side_is_hidden(entry)
        out["side_revealed"] = not side_is_hidden(entry)
    else:
        out["side"] = vis
        out["side_hidden"] = False
        out.pop("side_mask", None)
    return out


def entry_side_fields_from_raw(item: dict) -> dict[str, Any]:
    kind = str(item.get("kind") or "")
    side = normalize_side_id(
        item.get("side"), fallback=default_side_for_kind(kind)
    ) if item.get("side") is not None else default_side_for_kind(kind)
    hidden = bool(item.get("side_hidden"))
    mask = item.get("side_mask")
    return {
        "side": side,
        "side_hidden": hidden,
        "side_mask": normalize_side_id(mask, fallback=SIDE_PARTY) if mask else None,
        "retained_after_kick": (
            str(item["retained_after_kick"])
            if item.get("retained_after_kick")
            else None
        ),
    }
