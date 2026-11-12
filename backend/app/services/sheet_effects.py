"""Эффекты на листе (combat.effects) и снятие связанных с концентрацией.

B-01: расширенная модель (kind/slug/duration/mods/charges) с обратной совместимостью.
Старые строки (имя, · +N КД, ac_bonus инфузий) читаются как раньше.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.models.character import Character
from app.repositories.lobby import LobbyRepository

EFFECT_KINDS = frozenset(
    {"spell", "feature", "feat", "race", "item", "infusion", "piety"}
)
DURATION_UNITS = frozenset(
    {
        "rounds",
        "minutes",
        "hours",
        "until_short_rest",
        "until_long_rest",
        "until_source_next_turn_end",
        "permanent",
        "manual",
    }
)

ROUNDS_PER_MINUTE = 10
ROUNDS_PER_HOUR = 600

INFUSION_ORIGIN = "infusion"


def _duration_to_rounds(duration: dict) -> int | None:
    unit = duration.get("unit")
    if isinstance(duration.get("remaining_rounds"), int):
        return max(0, int(duration["remaining_rounds"]))
    value = duration.get("value")
    try:
        num = float(value) if value is not None else 0.0
    except (TypeError, ValueError):
        num = 0.0
    if unit == "rounds" or unit == "until_source_next_turn_end":
        return max(0, int(num or 1))
    if unit == "minutes":
        return int(num * ROUNDS_PER_MINUTE)
    if unit == "hours":
        return int(num * ROUNDS_PER_HOUR)
    return None


def _parse_mods(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        target = str(item.get("target") or "").strip()
        op = str(item.get("op") or "add").strip() or "add"
        if not target:
            continue
        row: dict[str, Any] = {"target": target, "op": op}
        value = item.get("value")
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            row["value"] = value
        dice = item.get("dice")
        if isinstance(dice, str) and dice.strip():
            row["dice"] = dice.strip()
        condition = item.get("condition")
        if isinstance(condition, str) and condition.strip():
            row["condition"] = condition.strip()
        if isinstance(item.get("once"), bool):
            row["once"] = bool(item.get("once"))
        out.append(row)
    return out


def _parse_duration(raw: object) -> dict | None:
    if not isinstance(raw, dict):
        return None
    unit = str(raw.get("unit") or "").strip()
    if unit not in DURATION_UNITS:
        return None
    duration: dict[str, Any] = {"unit": unit}
    value = raw.get("value")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        duration["value"] = value
    started_at = raw.get("started_at")
    if isinstance(started_at, str) and started_at.strip():
        duration["started_at"] = started_at.strip()
    started_round = raw.get("started_round")
    if isinstance(started_round, int):
        duration["started_round"] = started_round
    remaining = raw.get("remaining_rounds")
    if isinstance(remaining, int):
        duration["remaining_rounds"] = max(0, remaining)
    else:
        rounds = _duration_to_rounds(duration)
        if rounds is not None:
            duration["remaining_rounds"] = rounds
    return duration


def parse_effects(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        eid = str(item.get("id") or "").strip()
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        if not eid:
            eid = f"fx-{name.lower().replace(' ', '-')}"
        source_character_id = item.get("source_character_id")
        source_name = item.get("source_name")
        row: dict[str, Any] = {
            "id": eid,
            "name": name,
            "source_character_id": (
                str(source_character_id) if source_character_id else None
            ),
            "source_name": str(source_name).strip() if source_name else None,
            "linked_concentration": bool(item.get("linked_concentration")),
        }
        kind = item.get("kind")
        if isinstance(kind, str) and kind.strip() in EFFECT_KINDS:
            row["kind"] = kind.strip()
        slug = item.get("slug")
        if isinstance(slug, str) and slug.strip():
            row["slug"] = slug.strip().replace("-", "_")
        origin = item.get("origin")
        if isinstance(origin, str) and origin.strip():
            row["origin"] = origin.strip()
        ac_bonus = item.get("ac_bonus")
        if isinstance(ac_bonus, int) and not isinstance(ac_bonus, bool):
            row["ac_bonus"] = max(0, ac_bonus)
        charges = item.get("charges")
        if isinstance(charges, int) and not isinstance(charges, bool):
            row["charges"] = max(0, charges)
        mods = _parse_mods(item.get("mods"))
        if mods:
            row["mods"] = mods
        duration = _parse_duration(item.get("duration"))
        if duration:
            row["duration"] = duration
        if item.get("inactive") is True:
            row["inactive"] = True
            reason = item.get("inactive_reason")
            if isinstance(reason, str) and reason.strip():
                row["inactive_reason"] = reason.strip()
        out.append(row)
    return out


def normalize_effect_payload(payload: dict, *, default_id: str | None = None) -> dict:
    """Build a stored effect row from an API/client payload."""
    name = str(payload.get("name") or "").strip()
    if not name:
        raise ValueError("effect_name_required")
    eid = str(payload.get("id") or "").strip() or (default_id or str(uuid4()))
    row: dict[str, Any] = {
        "id": eid,
        "name": name,
        "source_character_id": (
            str(payload["source_character_id"])
            if payload.get("source_character_id")
            else None
        ),
        "source_name": (
            str(payload.get("source_name")).strip()
            if payload.get("source_name")
            else None
        ),
        "linked_concentration": bool(payload.get("linked_concentration")),
    }
    kind = payload.get("kind")
    if isinstance(kind, str) and kind.strip() in EFFECT_KINDS:
        row["kind"] = kind.strip()
    slug = payload.get("slug")
    if isinstance(slug, str) and slug.strip():
        row["slug"] = slug.strip().replace("-", "_")
    origin = payload.get("origin")
    if isinstance(origin, str) and origin.strip():
        row["origin"] = origin.strip()
    ac_bonus = payload.get("ac_bonus")
    if isinstance(ac_bonus, int) and not isinstance(ac_bonus, bool):
        row["ac_bonus"] = max(0, ac_bonus)
    charges = payload.get("charges")
    if isinstance(charges, int) and not isinstance(charges, bool):
        row["charges"] = max(0, charges)
    mods = _parse_mods(payload.get("mods"))
    if mods:
        row["mods"] = mods
    duration = _parse_duration(payload.get("duration"))
    if duration:
        if "started_at" not in duration:
            duration["started_at"] = datetime.now(timezone.utc).isoformat()
        row["duration"] = duration
    return row


def is_infusion_share_effect(effect: dict, source_id: str) -> bool:
    """Effects this artificer previously hung on an ally via Infuse Item."""
    if str(effect.get("source_character_id") or "") != source_id:
        return False
    if effect.get("origin") == INFUSION_ORIGIN:
        return True
    if effect.get("kind") == "infusion":
        return True
    # Legacy shares: «Усиленная защита · +1 КД» (no origin field yet).
    return " · +" in str(effect.get("name") or "")


def replace_infusion_effects(
    effects: list[dict],
    source_id: str,
    replacements: list[dict],
) -> list[dict]:
    kept = [row for row in effects if not is_infusion_share_effect(row, source_id)]
    return kept + replacements


def apply_infusion_effect_sync(
    character: Character,
    *,
    source_id: str,
    source_name: str | None,
    replacements: list[dict],
) -> bool:
    """Replace this source's infusion marks. Returns True when the sheet changed."""
    sheet = dict(character.sheet or {})
    combat = dict(sheet.get("combat") or {})
    current = parse_effects(combat.get("effects"))
    next_effects = replace_infusion_effects(current, source_id, replacements)
    stamped = []
    for row in next_effects:
        if row.get("origin") == INFUSION_ORIGIN and not row.get("source_name"):
            row = {**row, "source_name": source_name}
        # B-01: ensure mods.ac mirrors ac_bonus for new writes.
        if row.get("origin") == INFUSION_ORIGIN and "ac_bonus" in row:
            mods = list(row.get("mods") or [])
            if not any(m.get("target") == "ac" for m in mods if isinstance(m, dict)):
                bonus = int(row.get("ac_bonus") or 0)
                if bonus > 0:
                    mods.append({"target": "ac", "op": "add", "value": bonus})
                    row = {**row, "mods": mods, "kind": row.get("kind") or "infusion"}
        stamped.append(row)
    if stamped == current:
        return False
    combat["effects"] = stamped
    sheet["combat"] = combat
    character.sheet = sheet
    character.sheet_version = int(character.sheet_version or 1) + 1
    flag_modified(character, "sheet")
    return True


def _hp_max_bonus_from_effect(effect: dict) -> int:
    total = 0
    mods = effect.get("mods") or []
    if not isinstance(mods, list):
        return 0
    for mod in mods:
        if not isinstance(mod, dict):
            continue
        if mod.get("target") != "hp_max" or mod.get("op") != "add":
            continue
        try:
            total += int(mod.get("value") or 0)
        except (TypeError, ValueError):
            continue
    return max(0, total)


def _temp_hp_grant_from_effect(effect: dict) -> int | None:
    mods = effect.get("mods") or []
    if not isinstance(mods, list):
        return None
    total = 0
    found = False
    for mod in mods:
        if not isinstance(mod, dict) or mod.get("target") != "temp_hp":
            continue
        found = True
        try:
            if mod.get("value") is not None:
                total += int(mod.get("value") or 0)
        except (TypeError, ValueError):
            pass
        # Dice are rolled on the client; backend keeps fixed value when present.
    return total if found and total > 0 else None


def _apply_hp_max_grant(character: Character, combat: dict, bonus: int) -> None:
    if bonus <= 0:
        return
    try:
        hp_max = int(combat.get("hp_max") or character.hp_max or 1)
    except (TypeError, ValueError):
        hp_max = int(character.hp_max or 1)
    try:
        hp_current = int(
            combat.get("hp_current")
            if combat.get("hp_current") is not None
            else character.hp_current
            if character.hp_current is not None
            else hp_max
        )
    except (TypeError, ValueError):
        hp_current = hp_max
    combat["hp_max"] = hp_max + bonus
    combat["hp_current"] = hp_current + bonus
    character.hp_max = combat["hp_max"]
    character.hp_current = combat["hp_current"]


def _revert_hp_max_grant(character: Character, combat: dict, lost: int) -> None:
    if lost <= 0:
        return
    try:
        hp_max = int(combat.get("hp_max") or character.hp_max or 1)
    except (TypeError, ValueError):
        hp_max = int(character.hp_max or 1)
    try:
        hp_current = int(
            combat.get("hp_current")
            if combat.get("hp_current") is not None
            else character.hp_current
            if character.hp_current is not None
            else hp_max
        )
    except (TypeError, ValueError):
        hp_current = hp_max
    new_max = max(1, hp_max - lost)
    if hp_current > 0:
        new_current = max(1, min(hp_current, new_max))
    else:
        new_current = max(0, min(hp_current, new_max))
    combat["hp_max"] = new_max
    combat["hp_current"] = new_current
    character.hp_max = new_max
    character.hp_current = new_current


def _apply_temp_hp_grant(combat: dict, grant: int | None) -> None:
    if grant is None or grant <= 0:
        return
    try:
        current = int(combat.get("hp_temp") or 0)
    except (TypeError, ValueError):
        current = 0
    # Remote apply: replace only when incoming is higher (Р4 dialog is local).
    if current <= 0 or grant > current:
        combat["hp_temp"] = grant


def _clear_temp_hp_if_needed(combat: dict, effect: dict) -> None:
    mods = effect.get("mods") or []
    if not isinstance(mods, list):
        return
    for mod in mods:
        if not isinstance(mod, dict) or mod.get("target") != "temp_hp":
            continue
        if mod.get("condition") == "clear_on_end" or effect.get("slug") == "tensers_transformation":
            combat["hp_temp"] = 0
            return


def append_effect(
    character: Character,
    *,
    effect_id: str | None = None,
    name: str,
    source_character_id: str | None,
    source_name: str | None,
    linked_concentration: bool,
    kind: str | None = None,
    slug: str | None = None,
    origin: str | None = None,
    ac_bonus: int | None = None,
    charges: int | None = None,
    mods: list[dict] | None = None,
    duration: dict | None = None,
    effect: dict | None = None,
) -> dict:
    """Append one effect. Pass `effect` for a full B-01 payload, or legacy fields."""
    if effect is not None:
        row = normalize_effect_payload(
            {
                **effect,
                "name": effect.get("name") or name,
                "source_character_id": effect.get("source_character_id")
                or source_character_id,
                "source_name": effect.get("source_name") or source_name,
                "linked_concentration": effect.get(
                    "linked_concentration", linked_concentration
                ),
            },
            default_id=effect_id,
        )
    else:
        payload: dict[str, Any] = {
            "id": effect_id or str(uuid4()),
            "name": name.strip(),
            "source_character_id": source_character_id,
            "source_name": source_name,
            "linked_concentration": linked_concentration,
        }
        if kind:
            payload["kind"] = kind
        if slug:
            payload["slug"] = slug
        if origin:
            payload["origin"] = origin
        if ac_bonus is not None:
            payload["ac_bonus"] = ac_bonus
        if charges is not None:
            payload["charges"] = charges
        if mods:
            payload["mods"] = mods
        if duration:
            payload["duration"] = duration
        row = normalize_effect_payload(payload, default_id=effect_id)

    sheet = dict(character.sheet or {})
    combat = dict(sheet.get("combat") or {})
    effects = parse_effects(combat.get("effects"))
    effects.append(row)
    combat["effects"] = effects
    _apply_hp_max_grant(character, combat, _hp_max_bonus_from_effect(row))
    _apply_temp_hp_grant(combat, _temp_hp_grant_from_effect(row))
    sheet["combat"] = combat
    character.sheet = sheet
    character.sheet_version = int(character.sheet_version or 1) + 1
    flag_modified(character, "sheet")
    return row


def remove_effect_by_id(character: Character, effect_id: str) -> bool:
    sheet = dict(character.sheet or {})
    combat = dict(sheet.get("combat") or {})
    effects = parse_effects(combat.get("effects"))
    removed_rows = [e for e in effects if e.get("id") == effect_id]
    kept = [e for e in effects if e.get("id") != effect_id]
    if len(kept) == len(effects):
        return False
    for row in removed_rows:
        _revert_hp_max_grant(character, combat, _hp_max_bonus_from_effect(row))
        _clear_temp_hp_if_needed(combat, row)
    combat["effects"] = kept
    sheet["combat"] = combat
    character.sheet = sheet
    character.sheet_version = int(character.sheet_version or 1) + 1
    flag_modified(character, "sheet")
    return True


def clear_linked_effects_on_character(
    character: Character,
    caster_key: str,
) -> int:
    sheet = dict(character.sheet or {})
    combat = dict(sheet.get("combat") or {})
    effects = parse_effects(combat.get("effects"))
    kept = []
    removed_rows = []
    for e in effects:
        if e.get("linked_concentration") and e.get("source_character_id") == caster_key:
            removed_rows.append(e)
        else:
            kept.append(e)
    removed = len(removed_rows)
    if removed == 0:
        return 0
    for row in removed_rows:
        _revert_hp_max_grant(character, combat, _hp_max_bonus_from_effect(row))
        _clear_temp_hp_if_needed(combat, row)
    combat["effects"] = kept
    sheet["combat"] = combat
    character.sheet = sheet
    character.sheet_version = int(character.sheet_version or 1) + 1
    flag_modified(character, "sheet")
    return removed


def clear_linked_effects_for_caster(
    lobbies: LobbyRepository,
    caster_id: UUID,
) -> int:
    """Снять у всех целей эффекты, связанные с Conc кастера (включая самого кастера)."""
    caster_key = str(caster_id)
    from app.models.lobby import LobbyMember

    lobby_ids = list(
        lobbies.db.scalars(
            select(LobbyMember.lobby_id).where(LobbyMember.character_id == caster_id)
        ).all()
    )

    touched_ids: set[UUID] = {caster_id}
    for lobby_id in lobby_ids:
        lobby = lobbies.get(lobby_id)
        if lobby is None:
            continue
        for member in lobby.members:
            touched_ids.add(member.character_id)

    # Also own other characters of the same user (Р25 self-cast outside lobby).
    caster = lobbies.db.get(Character, caster_id)
    if caster is not None:
        own_ids = list(
            lobbies.db.scalars(
                select(Character.id).where(Character.user_id == caster.user_id)
            ).all()
        )
        touched_ids.update(own_ids)

    removed = 0
    char_map = lobbies.get_characters_map(list(touched_ids))
    for other_id, other in char_map.items():
        if other is None:
            continue
        removed += clear_linked_effects_on_character(other, caster_key)
    return removed


def clear_caster_concentration(
    character: Character,
    lobbies: LobbyRepository,
) -> int:
    """Drop concentration on the caster sheet and clear linked ally effects."""
    sheet = dict(character.sheet or {})
    combat = dict(sheet.get("combat") or {})
    if combat.get("concentration") is not None:
        combat["concentration"] = None
        sheet["combat"] = combat
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        flag_modified(character, "sheet")
    return clear_linked_effects_for_caster(lobbies, character.id)


def concentration_from_sheet(sheet: object) -> dict | None:
    if not isinstance(sheet, dict):
        return None
    combat = sheet.get("combat") or {}
    if not isinstance(combat, dict):
        return None
    raw = combat.get("concentration")
    if not isinstance(raw, dict):
        return None
    spell_id = str(raw.get("spell_id") or "").strip()
    name = str(raw.get("name") or "").strip()
    if not spell_id and not name:
        return None
    return {"spell_id": spell_id or f"conc-{name}", "name": name or "Заклинание"}


def effect_suggestions_from_sheet(sheet: object) -> list[str]:
    """Имена с листа: текущая Conc + подготовленные Conc-заклинания."""
    if not isinstance(sheet, dict):
        return []
    names: list[str] = []
    seen: set[str] = set()

    def add(name: str) -> None:
        cleaned = name.strip()
        if not cleaned:
            return
        key = cleaned.casefold()
        if key in seen:
            return
        seen.add(key)
        names.append(cleaned)

    conc = concentration_from_sheet(sheet)
    if conc:
        add(str(conc["name"]))

    spells = sheet.get("spells") or {}
    if isinstance(spells, dict):
        known = spells.get("known")
        if not isinstance(known, list):
            known = (
                spells.get("prepared")
                if isinstance(spells.get("prepared"), list)
                else []
            )
        for item in known:
            if not isinstance(item, dict):
                continue
            prepared = item.get("prepared")
            level = item.get("level")
            if isinstance(level, int) and level > 0 and prepared is False:
                continue
            if item.get("concentration") or item.get("applies_to_allies"):
                add(str(item.get("name") or ""))

    return names


async def broadcast_sheet_effects_changed(
    lobbies: LobbyRepository,
    character_ids: list[UUID],
) -> None:
    """Nudge lobby sockets so open sheets can refresh combat.effects (B04 / #299)."""
    from app.models.lobby import LobbyMember
    from app.realtime.hub import lobby_hub

    if not character_ids:
        return
    lobby_ids = list(
        set(
            lobbies.db.scalars(
                select(LobbyMember.lobby_id).where(
                    LobbyMember.character_id.in_(character_ids)
                )
            ).all()
        )
    )
    payload = {
        "type": "sheet_effects_changed",
        "character_ids": [str(cid) for cid in character_ids],
    }
    for lobby_id in lobby_ids:
        await lobby_hub.broadcast(lobby_id, payload)
        await lobby_hub.broadcast(lobby_id, {"type": "lobby_resync"})
