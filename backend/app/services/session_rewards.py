"""S-06: награды сессии — опыт (остаток, вехи), сундук добычи, снимок после боя.

Состояние:
- ``campaign_rules.progression.xp_remainder`` — копилка остатка XP лобби
- ``session.combat.pending_rewards`` — снимок опыта после «Завершить бой»
- ``session.combat.loot_chest`` — сундук / добыча на столе

Контракт наполнения для G-01: ``fill_loot_chest(...)`` / ``POST .../loot/chest`` action=generate|quick_add.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any
from uuid import UUID, uuid4

from app.dnd import loot_tables as loot_tbl
from app.dnd.experience import clamp_level, crossed_next_threshold
from app.services import session_sides as sides

COIN_KEYS = ("cp", "sp", "ep", "gp", "pp")
COIN_LABELS = {"cp": "мм", "sp": "см", "ep": "эм", "gp": "зм", "pp": "пм"}

OUTCOME_FLED = "fled"
OUTCOME_SURRENDERED = "surrendered"
OUTCOME_KILLED = "killed"


def empty_coins() -> dict[str, int]:
    return {k: 0 for k in COIN_KEYS}


def normalize_coins(raw: object | None) -> dict[str, int]:
    out = empty_coins()
    if not isinstance(raw, dict):
        return out
    for k in COIN_KEYS:
        try:
            out[k] = max(0, int(raw.get(k) or 0))
        except (TypeError, ValueError):
            out[k] = 0
    return out


def coins_total(coins: dict[str, int]) -> int:
    return sum(int(coins.get(k) or 0) for k in COIN_KEYS)


def format_coins(coins: dict[str, int]) -> str:
    parts = []
    for k in ("pp", "gp", "ep", "sp", "cp"):
        n = int(coins.get(k) or 0)
        if n > 0:
            parts.append(f"{n} {COIN_LABELS[k]}")
    return " · ".join(parts) if parts else "0"


def empty_loot_chest() -> dict[str, Any]:
    return {
        "on_table": False,
        "items": [],
        "coins": empty_coins(),
        "log": [],
    }


def normalize_loot_item(raw: object | None) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    name = str(raw.get("name") or "").strip()[:120]
    if not name and not raw.get("artifact_id"):
        return None
    try:
        qty = max(1, int(raw.get("qty") or 1))
    except (TypeError, ValueError):
        qty = 1
    artifact_id = raw.get("artifact_id")
    artifact_s = str(artifact_id) if artifact_id else None
    item_id = str(raw.get("id") or "") or str(uuid4())
    notes = str(raw.get("notes") or "").strip()[:240] or None
    return {
        "id": item_id,
        "name": name or "Предмет",
        "qty": qty,
        "notes": notes,
        "artifact_id": artifact_s,
        "catalog_slug": (
            str(raw["catalog_slug"])[:80] if raw.get("catalog_slug") else None
        ),
        "magic_table": (
            str(raw["magic_table"])[:8] if raw.get("magic_table") else None
        ),
    }


def normalize_loot_chest(raw: object | None) -> dict[str, Any]:
    base = empty_loot_chest()
    if not isinstance(raw, dict):
        return base
    base["on_table"] = bool(raw.get("on_table"))
    base["coins"] = normalize_coins(raw.get("coins"))
    items: list[dict] = []
    for row in raw.get("items") or []:
        parsed = normalize_loot_item(row)
        if parsed:
            items.append(parsed)
    base["items"] = items
    log: list[dict] = []
    for row in raw.get("log") or []:
        if not isinstance(row, dict):
            continue
        text = str(row.get("text") or "").strip()[:240]
        if not text:
            continue
        log.append(
            {
                "id": str(row.get("id") or uuid4()),
                "who": str(row.get("who") or "")[:80] or None,
                "text": text,
                "character_id": (
                    str(row["character_id"]) if row.get("character_id") else None
                ),
            }
        )
    base["log"] = log[-40:]
    return base


def append_loot_log(
    chest: dict[str, Any],
    *,
    text: str,
    who: str | None = None,
    character_id: str | None = None,
) -> dict[str, Any]:
    chest = normalize_loot_chest(chest)
    chest["log"] = list(chest.get("log") or [])
    chest["log"].append(
        {
            "id": str(uuid4()),
            "who": (who or None),
            "text": text[:240],
            "character_id": character_id,
        }
    )
    chest["log"] = chest["log"][-40:]
    return chest


def get_xp_remainder(campaign_rules: object | None) -> int:
    if not isinstance(campaign_rules, dict):
        return 0
    prog = campaign_rules.get("progression")
    if not isinstance(prog, dict):
        return 0
    try:
        return max(0, int(prog.get("xp_remainder") or 0))
    except (TypeError, ValueError):
        return 0


def set_xp_remainder(campaign_rules: dict, value: int) -> dict:
    rules = deepcopy(campaign_rules) if isinstance(campaign_rules, dict) else {}
    prog = dict(rules.get("progression") or {})
    prog["xp_remainder"] = max(0, int(value))
    rules["progression"] = prog
    return rules


def progression_mode(campaign_rules: object | None) -> str:
    if not isinstance(campaign_rules, dict):
        return "xp"
    prog = campaign_rules.get("progression")
    if isinstance(prog, dict) and prog.get("mode") == "milestones":
        return "milestones"
    return "xp"


def member_defeated(member: dict) -> bool:
    """Повержен: 0 HP, сбежал или сдался (2014: XP за всех троих)."""
    outcome = str(member.get("outcome") or "").strip().lower()
    if outcome in {OUTCOME_FLED, OUTCOME_SURRENDERED}:
        return True
    try:
        return int(member.get("hp_current") or 0) <= 0
    except (TypeError, ValueError):
        return False


def combatant_defeat_counts(combatant: dict) -> dict[str, Any]:
    """Сколько поверженных ещё не учтены в XP."""
    xp_each = max(0, int(combatant.get("xp") or 0))
    members = combatant.get("members")
    if isinstance(members, list) and members:
        dead = sum(1 for m in members if isinstance(m, dict) and member_defeated(m))
        # исходы на уровне карточки, если нет members-исходов
    else:
        outcome = str(combatant.get("outcome") or "").strip().lower()
        if outcome in {OUTCOME_FLED, OUTCOME_SURRENDERED}:
            dead = 1
        else:
            try:
                dead = 1 if int(combatant.get("hp_current") or 0) <= 0 else 0
            except (TypeError, ValueError):
                dead = 0
    claimed_raw = combatant.get("xp_claimed_count")
    try:
        claimed = max(0, int(claimed_raw or 0))
    except (TypeError, ValueError):
        claimed = int(combatant.get("member_count") or 0) if combatant.get("xp_claimed") else 0
    claimed = min(dead, claimed)
    unclaimed = max(0, dead - claimed)
    claimable = unclaimed > 0 and xp_each > 0
    return {
        "dead": dead,
        "claimed": claimed,
        "unclaimed": unclaimed,
        "xp_each": xp_each,
        "total": unclaimed * xp_each if claimable else 0,
        "claimable": claimable,
        "outcome": str(combatant.get("outcome") or "") or None,
    }


def compute_xp_pool(combatants: list[dict]) -> dict[str, Any]:
    rows: list[dict] = []
    total = 0
    claim_ids: list[str] = []
    for c in combatants:
        if not isinstance(c, dict):
            continue
        info = combatant_defeat_counts(c)
        if not info["claimable"]:
            continue
        cid = str(c.get("id") or "")
        rows.append(
            {
                "combatant_id": cid,
                "name": str(c.get("name") or "Враг"),
                "unclaimed": info["unclaimed"],
                "xp_each": info["xp_each"],
                "total": info["total"],
                "outcome": info["outcome"],
                "type_ru": str(c.get("type_ru") or "") or None,
            }
        )
        total += int(info["total"])
        if cid:
            claim_ids.append(cid)
    return {"pool": total, "defeats": rows, "claim_combatant_ids": claim_ids}


def _looks_humanoid(combatant: dict) -> bool:
    t = str(combatant.get("type_ru") or "").lower()
    return any(x in t for x in ("гуманоид", "humanoid", "человек", "гоблин", "орки", "орк"))


def _looks_beast(combatant: dict) -> bool:
    t = str(combatant.get("type_ru") or "").lower()
    return any(x in t for x in ("звер", "beast", "животн"))


def build_pending_rewards(
    *,
    combatants: list[dict],
    combat_state: dict,
    seats: list[Any],
    difficulty: str | None = None,
) -> dict[str, Any]:
    """Снимок для окна «Награды» после завершения боя."""
    pool_info = compute_xp_pool(combatants)
    participant_ids: list[str] = []
    traitor_ids: list[str] = []
    for e in combat_state.get("entries") or []:
        if not isinstance(e, dict):
            continue
        if e.get("kind") != "pc":
            continue
        cid = str(e.get("ref_id") or "")
        if not cid:
            continue
        participant_ids.append(cid)
        true_side = sides.true_side(e)
        if true_side != sides.SIDE_PARTY:
            traitor_ids.append(cid)

    dead_ids: list[str] = []
    seat_levels: list[int] = []
    all_seat_ids: list[str] = []
    for seat in seats:
        cid = str(getattr(seat, "character_id", "") or "")
        if not cid:
            continue
        all_seat_ids.append(cid)
        level = clamp_level(getattr(seat, "character_level", 1) or 1)
        seat_levels.append(level)
        hp = getattr(seat, "hp_current", None)
        fails = getattr(seat, "death_fails", None)
        is_dying = getattr(seat, "is_dying", None)
        try:
            hp_n = int(hp) if hp is not None else None
        except (TypeError, ValueError):
            hp_n = None
        try:
            fails_n = int(fails) if fails is not None else 0
        except (TypeError, ValueError):
            fails_n = 0
        dead = False
        if hp_n is not None and hp_n <= 0 and fails_n >= 3:
            dead = True
        if is_dying is False and hp_n is not None and hp_n <= 0 and fails_n >= 3:
            dead = True
        # условия «мертв»
        conditions = getattr(seat, "conditions", None) or []
        for cond in conditions:
            name = ""
            if isinstance(cond, dict):
                name = str(cond.get("name") or cond.get("id") or "").lower()
            else:
                name = str(getattr(cond, "name", "") or "").lower()
            if "мертв" in name or name in {"dead", "death"}:
                dead = True
        if dead:
            dead_ids.append(cid)

    absent_ids = [cid for cid in all_seat_ids if cid not in set(participant_ids)]
    # если бой без entries pc — считаем всех за столом участниками
    if not participant_ids:
        absent_ids = []
        participant_ids = list(all_seat_ids)

    default_excluded = sorted(set(dead_ids) | set(absent_ids) | set(traitor_ids))
    avg_level = (
        int(round(sum(seat_levels) / len(seat_levels))) if seat_levels else 1
    )
    has_humanoids = any(_looks_humanoid(c) for c in combatants if isinstance(c, dict))
    has_beasts = any(_looks_beast(c) for c in combatants if isinstance(c, dict))

    return {
        "xp_pool": int(pool_info["pool"]),
        "defeats": pool_info["defeats"],
        "claim_combatant_ids": pool_info["claim_combatant_ids"],
        "participant_character_ids": participant_ids,
        "default_excluded_ids": default_excluded,
        "dead_ids": dead_ids,
        "absent_ids": absent_ids,
        "traitor_ids": traitor_ids,
        "party_avg_level": avg_level,
        "difficulty": difficulty,
        "has_humanoids": has_humanoids,
        "has_beasts": has_beasts,
    }


def normalize_pending_rewards(raw: object | None) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    try:
        xp_pool = max(0, int(raw.get("xp_pool") or 0))
    except (TypeError, ValueError):
        xp_pool = 0
    return {
        "xp_pool": xp_pool,
        "defeats": list(raw.get("defeats") or []) if isinstance(raw.get("defeats"), list) else [],
        "claim_combatant_ids": [
            str(x) for x in (raw.get("claim_combatant_ids") or []) if x
        ],
        "participant_character_ids": [
            str(x) for x in (raw.get("participant_character_ids") or []) if x
        ],
        "default_excluded_ids": [
            str(x) for x in (raw.get("default_excluded_ids") or []) if x
        ],
        "dead_ids": [str(x) for x in (raw.get("dead_ids") or []) if x],
        "absent_ids": [str(x) for x in (raw.get("absent_ids") or []) if x],
        "traitor_ids": [str(x) for x in (raw.get("traitor_ids") or []) if x],
        "party_avg_level": clamp_level(raw.get("party_avg_level") or 1),
        "difficulty": (
            str(raw["difficulty"])
            if raw.get("difficulty") in {"easy", "medium", "hard", "deadly"}
            else None
        ),
        "has_humanoids": bool(raw.get("has_humanoids")),
        "has_beasts": bool(raw.get("has_beasts")),
    }


def split_xp(total: int, n: int) -> tuple[int, int]:
    """Возвращает (каждому, остаток). Остаток не отбрасывается."""
    if n <= 0:
        return 0, max(0, int(total))
    total = max(0, int(total))
    each = total // n
    rem = total - each * n
    return each, rem


def apply_xp_to_identity(sheet: dict, amount: int) -> tuple[dict, dict[str, Any]]:
    """Добавить XP в identity.experience. Возвращает (sheet, meta)."""
    sheet = dict(sheet or {})
    identity = dict(sheet.get("identity") or {})
    try:
        before = int(identity.get("experience") or 0)
    except (TypeError, ValueError):
        before = 0
    try:
        level = clamp_level(identity.get("level") or 1)
    except (TypeError, ValueError):
        level = 1
    after = max(0, before + max(0, int(amount)))
    identity["experience"] = after
    sheet["identity"] = identity
    leveled = crossed_next_threshold(before_xp=before, after_xp=after, level=level)
    return sheet, {
        "before": before,
        "after": after,
        "level": level,
        "leveled_up": leveled,
        "awarded": max(0, int(amount)),
    }


def bump_character_level(sheet: dict, *, delta: int = 1) -> tuple[dict, int]:
    """Вехи: поднять identity.level (+classes[0].level если есть)."""
    sheet = dict(sheet or {})
    identity = dict(sheet.get("identity") or {})
    level = clamp_level(identity.get("level") or 1)
    new_level = clamp_level(level + max(0, int(delta)))
    identity["level"] = new_level
    sheet["identity"] = identity
    classes = sheet.get("classes")
    if isinstance(classes, list) and classes:
        first = dict(classes[0] or {})
        try:
            cls_lvl = int(first.get("level") or level)
        except (TypeError, ValueError):
            cls_lvl = level
        first["level"] = clamp_level(cls_lvl + max(0, int(delta)))
        classes = [first, *classes[1:]]
        sheet["classes"] = classes
    return sheet, new_level


def fill_loot_chest(
    chest: dict[str, Any] | None,
    *,
    party_level: int,
    difficulty: str | None = None,
    kind: str | None = None,
    has_humanoids: bool = False,
    has_beasts: bool = False,
    replace: bool = False,
    seed: int | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Наполнить сундук генератором. Контракт для G-01.

    ``replace=True`` — заменить содержимое; иначе добавить к текущему.
    ``kind='legend'`` — no-op по предметам (легенда вручную).
    """
    current = normalize_loot_chest(chest)
    generated = loot_tbl.generate_loot(
        party_level=party_level,
        difficulty=difficulty,
        kind=kind,  # type: ignore[arg-type]
        has_humanoids=has_humanoids,
        has_beasts=has_beasts,
        seed=seed,
    )
    new_items = []
    for row in generated.get("items") or []:
        parsed = normalize_loot_item({**row, "id": str(uuid4())})
        if parsed:
            new_items.append(parsed)
    new_coins = normalize_coins(generated.get("coins"))

    if replace:
        out = empty_loot_chest()
        out["on_table"] = current["on_table"]
        out["log"] = list(current.get("log") or [])
        out["items"] = new_items
        out["coins"] = new_coins
    else:
        out = current
        out["items"] = list(out.get("items") or []) + new_items
        merged = empty_coins()
        for k in COIN_KEYS:
            merged[k] = int(out["coins"].get(k) or 0) + int(new_coins.get(k) or 0)
        out["coins"] = merged
    return out, generated.get("meta") or {}


def split_coins_evenly(
    coins: dict[str, int], n: int
) -> tuple[dict[str, int], dict[str, int]]:
    """Поровну на n; возвращает (доля_каждому, остаток_в_сундуке)."""
    if n <= 0:
        return empty_coins(), normalize_coins(coins)
    coins = normalize_coins(coins)
    each = empty_coins()
    rem = empty_coins()
    for k in COIN_KEYS:
        total = int(coins.get(k) or 0)
        each[k] = total // n
        rem[k] = total - each[k] * n
    return each, rem


def take_item_from_chest(
    chest: dict[str, Any],
    *,
    item_id: str,
    qty: int = 1,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    """Убрать qty предмета из сундука. Возвращает (chest, taken_item|None)."""
    chest = normalize_loot_chest(chest)
    qty = max(1, int(qty))
    items = list(chest.get("items") or [])
    taken = None
    next_items: list[dict] = []
    for row in items:
        if taken is None and str(row.get("id")) == str(item_id):
            have = int(row.get("qty") or 1)
            if have <= qty:
                taken = {**row, "qty": have}
            else:
                taken = {**row, "qty": qty}
                next_items.append({**row, "qty": have - qty})
            continue
        next_items.append(row)
    chest["items"] = next_items
    return chest, taken


def take_coins_from_chest(
    chest: dict[str, Any],
    coins: dict[str, int],
) -> tuple[dict[str, Any], dict[str, int]]:
    chest = normalize_loot_chest(chest)
    want = normalize_coins(coins)
    taken = empty_coins()
    left = empty_coins()
    for k in COIN_KEYS:
        have = int(chest["coins"].get(k) or 0)
        take = min(have, int(want.get(k) or 0))
        taken[k] = take
        left[k] = have - take
    chest["coins"] = left
    return chest, taken


def as_uuid(value: object) -> UUID | None:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None
