"""Эффекты на листе (combat.effects) и снятие связанных с концентрацией."""

from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy.orm.attributes import flag_modified

from app.models.character import Character
from app.repositories.lobby import LobbyRepository


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
        out.append(
            {
                "id": eid,
                "name": name,
                "source_character_id": (
                    str(source_character_id) if source_character_id else None
                ),
                "source_name": str(source_name).strip() if source_name else None,
                "linked_concentration": bool(item.get("linked_concentration")),
            }
        )
    return out


def append_effect(
    character: Character,
    *,
    effect_id: str | None,
    name: str,
    source_character_id: str | None,
    source_name: str | None,
    linked_concentration: bool,
) -> None:
    sheet = dict(character.sheet or {})
    combat = dict(sheet.get("combat") or {})
    effects = parse_effects(combat.get("effects"))
    effects.append(
        {
            "id": effect_id or str(uuid4()),
            "name": name.strip(),
            "source_character_id": source_character_id,
            "source_name": source_name,
            "linked_concentration": linked_concentration,
        }
    )
    combat["effects"] = effects
    sheet["combat"] = combat
    character.sheet = sheet
    character.sheet_version = int(character.sheet_version or 1) + 1
    flag_modified(character, "sheet")


def clear_linked_effects_for_caster(
    lobbies: LobbyRepository,
    caster_id: UUID,
) -> int:
    """Снять у союзников во всех лобби кастера эффекты, связанные с его Conc."""
    caster_key = str(caster_id)
    # Лобби, где кастер в составе (или владелец смотрит чужой лист — только членство)
    from sqlalchemy import select

    from app.models.lobby import LobbyMember

    lobby_ids = list(
        lobbies.db.scalars(
            select(LobbyMember.lobby_id).where(LobbyMember.character_id == caster_id)
        ).all()
    )
    if not lobby_ids:
        return 0

    removed = 0
    for lobby_id in lobby_ids:
        lobby = lobbies.get(lobby_id)
        if lobby is None:
            continue
        member_ids = [m.character_id for m in lobby.members]
        char_map = lobbies.get_characters_map(member_ids)
        for other_id, other in char_map.items():
            if other is None or str(other_id) == caster_key:
                continue
            sheet = dict(other.sheet or {})
            combat = dict(sheet.get("combat") or {})
            effects = parse_effects(combat.get("effects"))
            kept = [
                e
                for e in effects
                if not (
                    e.get("linked_concentration")
                    and e.get("source_character_id") == caster_key
                )
            ]
            if len(kept) == len(effects):
                continue
            removed += len(effects) - len(kept)
            combat["effects"] = kept
            sheet["combat"] = combat
            other.sheet = sheet
            other.sheet_version = int(other.sheet_version or 1) + 1
            flag_modified(other, "sheet")
    return removed


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
            known = spells.get("prepared") if isinstance(spells.get("prepared"), list) else []
        for item in known:
            if not isinstance(item, dict):
                continue
            prepared = item.get("prepared")
            level = item.get("level")
            # cantrips always ready; leveled need prepared
            if isinstance(level, int) and level > 0 and prepared is False:
                continue
            if item.get("concentration") or item.get("applies_to_allies"):
                add(str(item.get("name") or ""))

    return names
