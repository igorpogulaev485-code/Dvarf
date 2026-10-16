from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError

from app.models.character import Character
from app.models.journal import CampaignJournalEntry
from app.models.lobby import Lobby, LobbyMember, PlaySession, Setting
from app.models.session_event import SessionEvent
from app.models.user import User
from app.realtime.session_hub import session_hub
from app.repositories.character import CharacterRepository
from app.repositories.lobby import LobbyRepository
from app.services.sheet_effects import (
    append_effect,
    clear_linked_effects_for_caster,
    effect_suggestions_from_sheet,
    parse_effects,
)
from app.repositories.catalog import CatalogRepository
from app.dnd.encounter_budget import EncounterDifficulty
from app.dnd.encounter_compose import compose_encounter
from app.dnd.encounter_pool import monster_from_catalog_entry
from app.dnd.sheet_signals import PartyMemberSnapshot
from app.dnd.xp import xp_from_cr
from app.schemas.lobby import (
    AddLobbyMemberRequest,
    CombatEntryOut,
    CombatPatchRequest,
    CombatStartRequest,
    CombatantActionOut,
    CombatantCreateRequest,
    CombatantMemberOut,
    CombatantPatchRequest,
    JoinLobbyRequest,
    SessionCombatOut,
    EncounterGenerateRequest,
    EncounterGenerateResult,
    EncounterMonsterOptionOut,
    EncounterRoleOut,
    EncounterWaveOut,
    EncounterTemplateCreateRequest,
    EncounterTemplateOut,
    EncounterTemplateSaveFromSessionRequest,
    EncounterEntryOut,
    InventoryTransferRequest,
    InventoryTransferResult,
    LootAwardRequest,
    LootAwardResult,
    XpAwardRequest,
    XpAwardResult,
    JournalEntryCreateRequest,
    JournalEntryOut,
    JournalEntryUpdateRequest,
    JournalPageOut,
    LobbyCreateRequest,
    LobbyDetail,
    LobbyMemberOut,
    LobbyShareEffectRequest,
    LobbyShareEffectResponse,
    LobbySummary,
    LobbyUpdateRequest,
    SeatCompanionCreateRequest,
    SeatCompanionOut,
    SeatCompanionPatchRequest,
    SeatCombatPatchRequest,
    SeatConcentrationOut,
    SeatConditionOut,
    SeatEffectOut,
    SeatRequest,
    SessionCloseRequest,
    SessionCloseResponse,
    SessionCombatantOut,
    SessionCreateRequest,
    SessionDetail,
    SessionEventOut,
    SessionRollCreateRequest,
    SessionSeatOut,
    SessionSummary,
    SessionUpdateRequest,
    SettingCreateRequest,
    SettingDetail,
    SettingPageCreateRequest,
    SettingPageLinkCreateRequest,
    SettingPageLinkOut,
    SettingPageOut,
    SettingPageUpdateRequest,
    SettingSummary,
    SettingUpdateRequest,
)

JOURNAL_ENTRY_TYPES = frozenset({"text", "chapter", "setting_link", "image", "session_summary"})


def _ability_mod(score: int | None) -> int:
    if score is None:
        return 0
    return (int(score) - 10) // 2


def _passive_from_sheet(sheet: dict, skill_key: str, ability_key: str) -> int | None:
    abilities = sheet.get("abilities") or {}
    skills = sheet.get("skills") or {}
    raw = abilities.get(ability_key)
    score: int | None
    if isinstance(raw, int):
        score = raw
    elif isinstance(raw, dict) and isinstance(raw.get("score"), int):
        score = raw["score"]
    else:
        score = None
    if score is None:
        return None
    skill = skills.get(skill_key) or {}
    bonus = _ability_mod(score)
    if skill.get("is_expertise"):
        bonus += 4
    elif skill.get("is_proficient"):
        bonus += 2
    return 10 + bonus


def _parse_conditions(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        slug = str(item.get("slug") or "").strip()
        name = str(item.get("name") or slug).strip()
        if not slug and not name:
            continue
        catalog_id = item.get("catalog_id")
        out.append(
            {
                "slug": slug or name.lower(),
                "name": name or slug,
                "catalog_id": str(catalog_id) if catalog_id else None,
            }
        )
    return out


def _parse_companions(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("id") or "").strip()
        name = str(item.get("name") or "").strip()
        if not cid or not name:
            continue
        out.append(
            {
                "id": cid,
                "name": name,
                "hp_current": item.get("hp_current") if isinstance(item.get("hp_current"), int) else None,
                "hp_max": item.get("hp_max") if isinstance(item.get("hp_max"), int) else None,
                "ac": item.get("ac") if isinstance(item.get("ac"), int) else None,
                "conditions": _parse_conditions(item.get("conditions")),
            }
        )
    return out


def _parse_concentration(raw: object) -> dict | None:
    if not isinstance(raw, dict):
        return None
    spell_id = str(raw.get("spell_id") or "").strip()
    name = str(raw.get("name") or "").strip()
    if not spell_id and not name:
        return None
    return {
        "spell_id": spell_id or f"conc-{name}",
        "name": name or "Заклинание",
    }


def _seat_combat_fields(character: Character | None) -> dict:
    if character is None:
        return {
            "ac": None,
            "speed": None,
            "inspiration": False,
            "conditions": [],
            "effects": [],
            "concentration": None,
            "effect_suggestions": [],
            "companions": [],
            "passive_perception": None,
            "passive_insight": None,
            "passive_investigation": None,
        }
    sheet = character.sheet or {}
    combat = sheet.get("combat") or {}
    return {
        "ac": combat.get("ac") if isinstance(combat.get("ac"), int) else None,
        "speed": combat.get("speed") if isinstance(combat.get("speed"), int) else None,
        "inspiration": bool(combat.get("inspiration")),
        "conditions": _parse_conditions(combat.get("conditions")),
        "effects": parse_effects(combat.get("effects")),
        "concentration": _parse_concentration(combat.get("concentration")),
        "effect_suggestions": effect_suggestions_from_sheet(sheet),
        "companions": _parse_companions(sheet.get("companions")),
        "passive_perception": _passive_from_sheet(sheet, "perception", "wis"),
        "passive_insight": _passive_from_sheet(sheet, "insight", "wis"),
        "passive_investigation": _passive_from_sheet(sheet, "investigation", "int"),
    }


def _member_out(member: LobbyMember, character: Character | None) -> LobbyMemberOut:
    return LobbyMemberOut(
        id=member.id,
        character_id=member.character_id,
        user_id=member.user_id,
        joined_at=member.joined_at,
        character_name=character.name if character else "Персонаж удалён",
        character_level=character.level if character else 1,
        character_class_name=character.class_name if character else None,
        character_race_name=character.race_name if character else None,
        hp_current=character.hp_current if character else None,
        hp_max=character.hp_max if character else None,
    )


def _action_blocks(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name_ru") or item.get("name") or "").strip()
        if not name:
            continue
        out.append(
            {
                "name_ru": name,
                "text_ru": str(item.get("text_ru") or item.get("text") or "").strip(),
                "name_en": (
                    str(item["name_en"]).strip()
                    if item.get("name_en")
                    else None
                ),
            }
        )
    return out


def _parse_members(raw: object, *, fallback_name: str, hp_current: int, hp_max: int) -> list[dict]:
    members: list[dict] = []
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            mid = str(item.get("id") or "").strip()
            mname = str(item.get("name") or "").strip()
            if not mid or not mname:
                continue
            m_max = max(1, int(item.get("hp_max") or hp_max or 1))
            m_cur = int(
                item.get("hp_current") if item.get("hp_current") is not None else m_max
            )
            members.append(
                {
                    "id": mid,
                    "name": mname,
                    "hp_current": max(0, min(m_max, m_cur)),
                    "hp_max": m_max,
                }
            )
    if not members:
        members.append(
            {
                "id": f"m-{uuid4()}",
                "name": fallback_name,
                "hp_current": max(0, min(max(1, hp_max), hp_current)),
                "hp_max": max(1, hp_max),
            }
        )
    return members


def _sync_combatant_summary(row: dict) -> None:
    members = row.get("members") or []
    alive = [m for m in members if int(m.get("hp_current") or 0) > 0]
    row["member_count"] = len(members)
    row["alive_count"] = len(alive)
    focus = alive[0] if alive else (members[0] if members else None)
    if focus is None:
        row["hp_current"] = 0
        row["hp_max"] = max(1, int(row.get("hp_max") or 1))
        return
    row["hp_current"] = int(focus["hp_current"])
    row["hp_max"] = int(focus["hp_max"])


def _apply_member_damage(member: dict, damage: int) -> None:
    hp_max = max(1, int(member.get("hp_max") or 1))
    next_hp = int(member.get("hp_current") or 0) - int(damage)
    member["hp_current"] = max(0, min(hp_max, next_hp))


def _parse_combatants(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("id") or "").strip()
        name = str(item.get("name") or "").strip()
        if not cid or not name:
            continue
        hp_max = max(1, int(item.get("hp_max") or 1))
        hp_current = int(item.get("hp_current") if item.get("hp_current") is not None else hp_max)
        members = _parse_members(
            item.get("members"),
            fallback_name=name,
            hp_current=hp_current,
            hp_max=hp_max,
        )
        row = {
            "id": cid,
            "name": name,
            "hp_current": hp_current,
            "hp_max": hp_max,
            "ac": item.get("ac") if isinstance(item.get("ac"), int) else None,
            "speed": item.get("speed") if isinstance(item.get("speed"), int) else None,
            "cr": str(item["cr"]) if item.get("cr") not in (None, "") else None,
            "catalog_id": str(item["catalog_id"]) if item.get("catalog_id") else None,
            "slug": str(item["slug"]) if item.get("slug") else None,
            "source_book": str(item["source_book"]) if item.get("source_book") else None,
            "type_ru": str(item["type_ru"]) if item.get("type_ru") else None,
            "custom": bool(item.get("custom")),
            "conditions": _parse_conditions(item.get("conditions")),
            "traits": _action_blocks(item.get("traits")),
            "actions": _action_blocks(item.get("actions")),
            "bonus_actions": _action_blocks(item.get("bonus_actions")),
            "reactions": _action_blocks(item.get("reactions")),
            "legendary_actions": _action_blocks(item.get("legendary_actions")),
            "dex_mod": (
                int(item["dex_mod"])
                if isinstance(item.get("dex_mod"), int)
                else None
            ),
            "xp": int(item["xp"]) if isinstance(item.get("xp"), int) else None,
            "xp_claimed_count": max(
                0,
                int(item["xp_claimed_count"])
                if isinstance(item.get("xp_claimed_count"), int)
                else (int(item.get("member_count") or 0) if item.get("xp_claimed") else 0),
            ),
            "members": members,
            "alive_count": 0,
            "member_count": 0,
        }
        _sync_combatant_summary(row)
        out.append(row)
    return out


def _combatant_out(row: dict) -> SessionCombatantOut:
    members = [
        CombatantMemberOut(
            id=m["id"],
            name=m["name"],
            hp_current=int(m["hp_current"]),
            hp_max=int(m["hp_max"]),
        )
        for m in row.get("members") or []
    ]
    return SessionCombatantOut(
        id=row["id"],
        name=row["name"],
        hp_current=row["hp_current"],
        hp_max=row["hp_max"],
        alive_count=int(row.get("alive_count") or 0),
        member_count=int(row.get("member_count") or len(members) or 1),
        ac=row.get("ac"),
        speed=row.get("speed"),
        cr=row.get("cr"),
        catalog_id=row.get("catalog_id"),
        slug=row.get("slug"),
        source_book=row.get("source_book"),
        type_ru=row.get("type_ru"),
        custom=bool(row.get("custom")),
        conditions=[SeatConditionOut(**c) for c in row.get("conditions") or []],
        traits=[CombatantActionOut(**a) for a in row.get("traits") or []],
        actions=[CombatantActionOut(**a) for a in row.get("actions") or []],
        bonus_actions=[CombatantActionOut(**a) for a in row.get("bonus_actions") or []],
        reactions=[CombatantActionOut(**a) for a in row.get("reactions") or []],
        legendary_actions=[CombatantActionOut(**a) for a in row.get("legendary_actions") or []],
        members=members,
        dex_mod=int(row["dex_mod"]) if isinstance(row.get("dex_mod"), int) else None,
        xp=int(row["xp"]) if isinstance(row.get("xp"), int) else None,
        xp_claimed_count=max(0, int(row.get("xp_claimed_count") or 0)),
    )


def _speed_walk(raw: object) -> int | None:
    if isinstance(raw, int):
        return raw
    if isinstance(raw, dict) and isinstance(raw.get("walk"), int):
        return raw["walk"]
    return None


def _dex_mod_from_abilities(raw: object) -> int | None:
    if not isinstance(raw, dict):
        return None
    dex = raw.get("dex")
    if isinstance(dex, int):
        return _ability_mod(dex)
    if isinstance(dex, dict) and isinstance(dex.get("score"), int):
        return _ability_mod(dex["score"])
    return None


def _dex_mod_from_character(character: Character | None) -> int | None:
    if character is None:
        return None
    sheet = character.sheet or {}
    abilities = sheet.get("abilities") or {}
    return _dex_mod_from_abilities(abilities)


def _sort_combat_entries(entries: list[dict]) -> list[dict]:
    return sorted(
        entries,
        key=lambda e: (
            -int(e.get("initiative") or 0),
            -(e.get("dex_mod") if isinstance(e.get("dex_mod"), int) else -99),
            str(e.get("name") or ""),
        ),
    )


def _parse_combat_state(raw: object) -> dict:
    if not isinstance(raw, dict):
        return {"active": False, "round": 1, "active_index": 0, "entries": []}
    entries: list[dict] = []
    raw_entries = raw.get("entries")
    if isinstance(raw_entries, list):
        for item in raw_entries:
            if not isinstance(item, dict):
                continue
            eid = str(item.get("id") or "").strip() or str(uuid4())
            kind = str(item.get("kind") or "").strip()
            ref_id = str(item.get("ref_id") or "").strip()
            name = str(item.get("name") or "").strip()
            if kind not in {"pc", "companion", "enemy"} or not ref_id or not name:
                continue
            companion_id = item.get("companion_id")
            dex_mod = item.get("dex_mod")
            entries.append(
                {
                    "id": eid,
                    "kind": kind,
                    "ref_id": ref_id,
                    "companion_id": str(companion_id) if companion_id else None,
                    "name": name,
                    "initiative": int(item.get("initiative") or 0),
                    "dex_mod": int(dex_mod) if isinstance(dex_mod, int) else None,
                }
            )
    active = bool(raw.get("active")) and len(entries) > 0
    active_index = int(raw.get("active_index") or 0)
    if entries:
        active_index = max(0, min(len(entries) - 1, active_index))
    else:
        active_index = 0
    return {
        "active": active,
        "round": max(1, int(raw.get("round") or 1)),
        "active_index": active_index,
        "entries": entries if active else [],
    }


def _combat_out(raw: object) -> SessionCombatOut:
    state = _parse_combat_state(raw)
    return SessionCombatOut(
        active=bool(state["active"]),
        round=int(state["round"]),
        active_index=int(state["active_index"]),
        entries=[CombatEntryOut(**e) for e in state["entries"]],
    )


def _parse_encounter_templates(raw: object) -> list[EncounterTemplateOut]:
    if not isinstance(raw, list):
        return []
    out: list[EncounterTemplateOut] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        tid = str(item.get("id") or "").strip()
        name = str(item.get("name") or "").strip()
        if not tid or not name:
            continue
        entries_raw = item.get("entries")
        entries: list[EncounterEntryOut] = []
        if isinstance(entries_raw, list):
            for entry in entries_raw:
                if not isinstance(entry, dict):
                    continue
                ename = str(entry.get("name") or "").strip()
                if not ename:
                    continue
                entries.append(
                    EncounterEntryOut(
                        catalog_id=str(entry["catalog_id"]) if entry.get("catalog_id") else None,
                        slug=str(entry["slug"]) if entry.get("slug") else None,
                        name=ename,
                        count=max(1, min(20, int(entry.get("count") or 1))),
                        hp_max=int(entry["hp_max"]) if isinstance(entry.get("hp_max"), int) else None,
                        ac=int(entry["ac"]) if isinstance(entry.get("ac"), int) else None,
                        speed=int(entry["speed"]) if isinstance(entry.get("speed"), int) else None,
                        xp=int(entry["xp"]) if isinstance(entry.get("xp"), int) else None,
                        custom=bool(entry.get("custom")),
                        actions=[
                            CombatantActionOut(**a)
                            for a in _action_blocks(entry.get("actions"))
                        ],
                    )
                )
        if not entries:
            continue
        out.append(
            EncounterTemplateOut(
                id=tid,
                name=name,
                entries=entries,
                updated_at=str(item["updated_at"]) if item.get("updated_at") else None,
            )
        )
    return out


def _templates_to_storage(templates: list[EncounterTemplateOut]) -> list[dict]:
    return [t.model_dump(mode="json") for t in templates]


class LobbyService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lobbies = LobbyRepository(db)
        self.characters = CharacterRepository(db)
        self.catalog = CatalogRepository(db)

    def _require_lobby(self, lobby_id: UUID) -> Lobby:
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        return lobby

    def _can_view(self, lobby: Lobby, user: User) -> bool:
        if lobby.owner_id == user.id:
            return True
        return any(m.user_id == user.id for m in lobby.members)

    def _require_view(self, lobby: Lobby, user: User) -> None:
        if not self._can_view(lobby, user):
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")

    def _require_owner(self, lobby: Lobby, user: User) -> None:
        if lobby.owner_id != user.id:
            raise AppError("Только мастер лобби", code="lobby_owner_required", status_code=403)

    def _to_summary(self, lobby: Lobby, user: User) -> LobbySummary:
        is_owner = lobby.owner_id == user.id
        return LobbySummary(
            id=lobby.id,
            name=lobby.name,
            invite_code=lobby.invite_code if is_owner else None,
            is_owner=is_owner,
            member_count=len(lobby.members),
            created_at=lobby.created_at,
            updated_at=lobby.updated_at,
        )

    def _to_detail(self, lobby: Lobby, user: User) -> LobbyDetail:
        is_owner = lobby.owner_id == user.id
        char_map = self.lobbies.get_characters_map([m.character_id for m in lobby.members])
        members = [_member_out(m, char_map.get(m.character_id)) for m in lobby.members]
        settings = [SettingSummary.model_validate(s) for s in lobby.settings]
        sessions = [
            SessionSummary(
                id=s.id,
                lobby_id=s.lobby_id,
                setting_id=s.setting_id,
                setting_name=s.setting.name if s.setting else None,
                name=s.name,
                seat_count=len(s.seats),
                closed_at=s.closed_at,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in lobby.sessions
        ]
        return LobbyDetail(
            id=lobby.id,
            name=lobby.name,
            invite_code=lobby.invite_code if is_owner else None,
            join_path=f"/join/{lobby.invite_code}" if is_owner else None,
            is_owner=is_owner,
            owner_id=lobby.owner_id,
            members=members,
            settings=settings,
            sessions=sessions,
            visibility_profile=lobby.visibility_profile or {},
            encounter_templates=(
                _parse_encounter_templates(getattr(lobby, "encounter_templates", None))
                if is_owner
                else []
            ),
            created_at=lobby.created_at,
            updated_at=lobby.updated_at,
        )

    def list_mine(self, user: User) -> list[LobbySummary]:
        return [self._to_summary(item, user) for item in self.lobbies.list_for_user(user.id)]

    def create(self, user: User, payload: LobbyCreateRequest) -> LobbyDetail:
        name = (payload.name or "Новое лобби").strip() or "Новое лобби"
        lobby = self.lobbies.create(owner_id=user.id, name=name)
        self.db.commit()
        lobby = self._require_lobby(lobby.id)
        return self._to_detail(lobby, user)

    def get(self, user: User, lobby_id: UUID) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        self._require_view(lobby, user)
        return self._to_detail(lobby, user)

    def update(self, user: User, lobby_id: UUID, payload: LobbyUpdateRequest) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        self._require_owner(lobby, user)
        if payload.name is not None:
            lobby.name = payload.name.strip() or "Новое лобби"
        if payload.visibility_profile is not None:
            if not isinstance(payload.visibility_profile, dict):
                raise AppError(
                    "Некорректный профиль видимости",
                    code="visibility_profile_invalid",
                    status_code=400,
                )
            lobby.visibility_profile = payload.visibility_profile
        self.db.commit()
        lobby = self._require_lobby(lobby_id)
        return self._to_detail(lobby, user)

    def delete(self, user: User, lobby_id: UUID) -> None:
        lobby = self._require_lobby(lobby_id)
        self._require_owner(lobby, user)
        self.lobbies.delete_lobby(lobby)
        self.db.commit()

    def join_with_character(self, user: User, payload: JoinLobbyRequest) -> LobbyDetail:
        code = payload.code.strip().upper()
        lobby = self.lobbies.get_by_invite_code(code)
        if lobby is None:
            raise NotFoundError("Код лобби не найден", code="invite_code_not_found")

        character = self.characters.get_for_user(payload.character_id, user.id)
        if character is None:
            raise NotFoundError("Персонаж не найден", code="character_not_found")

        existing = self.lobbies.get_member(lobby.id, character.id)
        if existing is None:
            self.lobbies.add_member(
                lobby_id=lobby.id,
                character_id=character.id,
                user_id=user.id,
            )
            self.db.commit()
        lobby = self._require_lobby(lobby.id)
        return self._to_detail(lobby, user)

    def add_own_member(
        self,
        user: User,
        lobby_id: UUID,
        payload: AddLobbyMemberRequest,
    ) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        self._require_owner(lobby, user)
        character = self.characters.get_for_user(payload.character_id, user.id)
        if character is None:
            raise NotFoundError("Персонаж не найден", code="character_not_found")
        if self.lobbies.get_member(lobby.id, character.id) is None:
            self.lobbies.add_member(
                lobby_id=lobby.id,
                character_id=character.id,
                user_id=user.id,
            )
            self.db.commit()
        lobby = self._require_lobby(lobby_id)
        return self._to_detail(lobby, user)

    def remove_member(self, user: User, lobby_id: UUID, character_id: UUID) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        member = self.lobbies.get_member(lobby_id, character_id)
        if member is None:
            raise NotFoundError("Персонаж не в лобби", code="lobby_member_not_found")
        if lobby.owner_id != user.id and member.user_id != user.id:
            raise AppError("Нельзя убрать чужого персонажа", code="forbidden", status_code=403)

        # снять со всех сессий этого лобби
        for session in lobby.sessions:
            seat = self.lobbies.get_seat(session.id, character_id)
            if seat is not None:
                self.lobbies.remove_seat(seat)

        self.lobbies.remove_member(member)
        self.db.commit()
        lobby = self._require_lobby(lobby_id)
        return self._to_detail(lobby, user)

    def create_setting(
        self,
        user: User,
        lobby_id: UUID,
        payload: SettingCreateRequest,
    ) -> SettingSummary:
        lobby = self._require_lobby(lobby_id)
        self._require_owner(lobby, user)
        setting = self.lobbies.create_setting(
            lobby_id=lobby.id,
            name=(payload.name or "Новый сеттинг").strip() or "Новый сеттинг",
            world_notes=(payload.world_notes or "").strip(),
        )
        self.db.commit()
        self.db.refresh(setting)
        return SettingSummary.model_validate(setting)

    def update_setting(
        self,
        user: User,
        setting_id: UUID,
        payload: SettingUpdateRequest,
    ) -> SettingSummary:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_owner(lobby, user)
        if payload.name is not None:
            setting.name = payload.name.strip() or "Новый сеттинг"
        if payload.world_notes is not None:
            setting.world_notes = payload.world_notes
        self.db.commit()
        self.db.refresh(setting)
        return SettingSummary.model_validate(setting)

    def delete_setting(self, user: User, setting_id: UUID) -> None:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_owner(lobby, user)
        self.lobbies.delete_setting(setting)
        self.db.commit()

    def get_setting(self, user: User, setting_id: UUID) -> SettingDetail:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_view(lobby, user)
        return self._setting_detail(setting, is_owner=lobby.owner_id == user.id)

    def _setting_detail(self, setting: Setting, *, is_owner: bool) -> SettingDetail:
        pages = self.lobbies.list_setting_pages(setting.id)
        links = self.lobbies.list_setting_page_links(setting.id)
        if not is_owner:
            pages = [p for p in pages if p.revealed]
            visible = {p.id for p in pages}
            links = [
                link
                for link in links
                if link.from_page_id in visible and link.to_page_id in visible
            ]
        title_by_id = {p.id: p.title for p in pages}
        base = SettingSummary.model_validate(setting)
        data = base.model_dump()
        if not is_owner:
            # не светить legacy notes целиком — у игрока только раскрытые страницы
            data["world_notes"] = ""
        return SettingDetail(
            **data,
            pages=[SettingPageOut.model_validate(p) for p in pages],
            links=[
                SettingPageLinkOut(
                    id=link.id,
                    from_page_id=link.from_page_id,
                    to_page_id=link.to_page_id,
                    from_title=title_by_id.get(link.from_page_id, ""),
                    to_title=title_by_id.get(link.to_page_id, ""),
                    label=link.label or "",
                    created_at=link.created_at,
                )
                for link in links
            ],
            is_owner=is_owner,
        )

    @staticmethod
    def _descendant_pages(pages: list, root_id) -> list:
        by_parent: dict = {}
        for p in pages:
            by_parent.setdefault(p.parent_id, []).append(p)
        out: list = []

        def walk(pid) -> None:
            for child in by_parent.get(pid, []):
                out.append(child)
                walk(child.id)

        walk(root_id)
        return out

    def create_setting_page(
        self,
        user: User,
        setting_id: UUID,
        payload: SettingPageCreateRequest,
    ) -> SettingDetail:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_owner(lobby, user)
        parent_id = payload.parent_id
        if parent_id is not None:
            parent = self.lobbies.get_setting_page(parent_id)
            if parent is None or parent.setting_id != setting.id:
                raise AppError(
                    "Родительская страница не из этого сеттинга",
                    code="page_parent_bad",
                    status_code=400,
                )
        siblings = [
            p
            for p in self.lobbies.list_setting_pages(setting.id)
            if p.parent_id == parent_id
        ]
        sort_order = (
            payload.sort_order
            if payload.sort_order is not None
            else (max((p.sort_order for p in siblings), default=-1) + 1)
        )
        self.lobbies.create_setting_page(
            setting_id=setting.id,
            title=(payload.title or "Новая страница").strip() or "Новая страница",
            body=payload.body or "",
            parent_id=parent_id,
            sort_order=sort_order,
        )
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, is_owner=True)

    def update_setting_page(
        self,
        user: User,
        page_id: UUID,
        payload: SettingPageUpdateRequest,
    ) -> SettingDetail:
        page = self.lobbies.get_setting_page(page_id)
        if page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_owner(lobby, user)

        if payload.title is not None:
            page.title = payload.title.strip() or "Без названия"
        if payload.body is not None:
            page.body = payload.body
        if payload.clear_parent:
            page.parent_id = None
        elif payload.parent_id is not None:
            if payload.parent_id == page.id:
                raise AppError(
                    "Страница не может быть родителем себе",
                    code="page_cycle",
                    status_code=400,
                )
            parent = self.lobbies.get_setting_page(payload.parent_id)
            if parent is None or parent.setting_id != setting.id:
                raise AppError(
                    "Родительская страница не из этого сеттинга",
                    code="page_parent_bad",
                    status_code=400,
                )
            page.parent_id = payload.parent_id
        if payload.sort_order is not None:
            page.sort_order = payload.sort_order

        if payload.revealed is not None:
            page.revealed = payload.revealed
            if payload.reveal_subtree:
                all_pages = self.lobbies.list_setting_pages(setting.id)
                for child in self._descendant_pages(all_pages, page.id):
                    child.revealed = payload.revealed

        if page.parent_id is None and payload.body is not None:
            roots = [
                p
                for p in self.lobbies.list_setting_pages(setting.id)
                if p.parent_id is None
            ]
            roots_sorted = sorted(roots, key=lambda p: (p.sort_order, str(p.created_at)))
            if roots_sorted and roots_sorted[0].id == page.id:
                setting.world_notes = page.body

        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, is_owner=True)

    def delete_setting_page(self, user: User, page_id: UUID) -> SettingDetail:
        page = self.lobbies.get_setting_page(page_id)
        if page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_owner(lobby, user)
        remaining = [
            p for p in self.lobbies.list_setting_pages(setting.id) if p.id != page_id
        ]
        if len(remaining) == 0:
            raise AppError(
                "Нельзя удалить последнюю страницу сеттинга",
                code="setting_page_last",
                status_code=400,
            )
        self.lobbies.delete_setting_page(page)
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, is_owner=True)

    def create_setting_page_link(
        self,
        user: User,
        page_id: UUID,
        payload: SettingPageLinkCreateRequest,
    ) -> SettingDetail:
        from_page = self.lobbies.get_setting_page(page_id)
        if from_page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(from_page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_owner(lobby, user)

        to_page = self.lobbies.get_setting_page(payload.to_page_id)
        if to_page is None or to_page.setting_id != setting.id:
            raise AppError(
                "Целевая страница не из этого сеттинга",
                code="page_link_target_bad",
                status_code=400,
            )
        if to_page.id == from_page.id:
            raise AppError(
                "Страница не может ссылаться на себя",
                code="page_link_self",
                status_code=400,
            )
        existing = [
            link
            for link in self.lobbies.list_setting_page_links(setting.id)
            if link.from_page_id == from_page.id and link.to_page_id == to_page.id
        ]
        if existing:
            raise AppError(
                "Такая связь уже есть",
                code="page_link_duplicate",
                status_code=400,
            )
        self.lobbies.create_setting_page_link(
            from_page_id=from_page.id,
            to_page_id=to_page.id,
            label=(payload.label or "").strip()[:120],
        )
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, is_owner=True)

    def delete_setting_page_link(self, user: User, link_id: UUID) -> SettingDetail:
        link = self.lobbies.get_setting_page_link(link_id)
        if link is None:
            raise NotFoundError("Связь не найдена", code="setting_page_link_not_found")
        from_page = self.lobbies.get_setting_page(link.from_page_id)
        if from_page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(from_page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_owner(lobby, user)
        self.lobbies.delete_setting_page_link(link)
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, is_owner=True)

    def create_session(
        self,
        user: User,
        lobby_id: UUID,
        payload: SessionCreateRequest,
    ) -> SessionDetail:
        lobby = self._require_lobby(lobby_id)
        self._require_owner(lobby, user)
        setting: Setting | None = None
        if payload.setting_id is not None:
            setting = self.lobbies.get_setting(payload.setting_id)
            if setting is None or setting.lobby_id != lobby.id:
                raise AppError("Сеттинг не из этого лобби", code="setting_lobby_mismatch")
        name = (payload.name or "").strip()
        if not name:
            name = f"{setting.name} — сессия" if setting else "Ваншот"
        session = self.lobbies.create_session(
            lobby_id=lobby.id,
            name=name,
            setting_id=setting.id if setting else None,
        )
        # Отметить присутствующих при создании (дубликаты игнорируем)
        seen: set[UUID] = set()
        for character_id in payload.character_ids:
            if character_id in seen:
                continue
            seen.add(character_id)
            member = self.lobbies.get_member(lobby.id, character_id)
            if member is None:
                raise AppError(
                    "Персонаж не в составе лобби",
                    code="character_not_in_lobby",
                    status_code=400,
                )
            self.lobbies.add_seat(session_id=session.id, character_id=character_id)
        self.db.commit()
        return self.get_session(user, session.id)

    def get_session(self, user: User, session_id: UUID) -> SessionDetail:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        return self._session_detail(session, lobby, user)

    def update_session(
        self,
        user: User,
        session_id: UUID,
        payload: SessionUpdateRequest,
    ) -> SessionDetail:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_owner(lobby, user)
        if payload.name is not None:
            session.name = payload.name.strip() or session.name
        if payload.clear_setting:
            session.setting_id = None
        elif payload.setting_id is not None:
            setting = self.lobbies.get_setting(payload.setting_id)
            if setting is None or setting.lobby_id != lobby.id:
                raise AppError("Сеттинг не из этого лобби", code="setting_lobby_mismatch")
            session.setting_id = setting.id
        self.db.commit()
        return self.get_session(user, session_id)

    def delete_session(self, user: User, session_id: UUID) -> None:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        self._require_owner(session.lobby, user)
        self.lobbies.delete_session(session)
        self.db.commit()

    def seat_character(
        self,
        user: User,
        session_id: UUID,
        payload: SeatRequest,
    ) -> SessionDetail:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)

        member = self.lobbies.get_member(lobby.id, payload.character_id)
        if member is None:
            raise AppError(
                "Сначала добавьте персонажа в лобби",
                code="character_not_in_lobby",
            )
        # сажать может мастер или владелец персонажа
        if lobby.owner_id != user.id and member.user_id != user.id:
            raise AppError("Нельзя посадить чужого персонажа", code="forbidden", status_code=403)

        if self.lobbies.get_seat(session.id, payload.character_id) is None:
            self.lobbies.add_seat(session_id=session.id, character_id=payload.character_id)
            self.db.commit()
        return self.get_session(user, session_id)

    def unseat_character(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
    ) -> SessionDetail:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        seat = self.lobbies.get_seat(session.id, character_id)
        if seat is None:
            raise NotFoundError("Персонаж не за столом", code="seat_not_found")
        member = self.lobbies.get_member(lobby.id, character_id)
        if lobby.owner_id != user.id and (member is None or member.user_id != user.id):
            raise AppError("Нельзя убрать чужого персонажа", code="forbidden", status_code=403)
        self.lobbies.remove_seat(seat)
        self.db.commit()
        return self.get_session(user, session_id)

    def _session_detail(self, session: PlaySession, lobby: Lobby, user: User) -> SessionDetail:
        member_ids = [m.character_id for m in lobby.members]
        seat_ids = [s.character_id for s in session.seats]
        char_map = self.lobbies.get_characters_map([*member_ids, *seat_ids])
        seats: list[SessionSeatOut] = []
        for seat in session.seats:
            character = char_map.get(seat.character_id)
            extras = _seat_combat_fields(character)
            seats.append(
                SessionSeatOut(
                    character_id=seat.character_id,
                    character_name=character.name if character else "Персонаж удалён",
                    character_level=character.level if character else 1,
                    character_class_name=character.class_name if character else None,
                    character_race_name=character.race_name if character else None,
                    hp_current=character.hp_current if character else None,
                    hp_max=character.hp_max if character else None,
                    ac=extras["ac"],
                    speed=extras["speed"],
                    inspiration=extras["inspiration"],
                    conditions=[SeatConditionOut(**c) for c in extras["conditions"]],
                    effects=[SeatEffectOut(**e) for e in extras["effects"]],
                    concentration=(
                        SeatConcentrationOut(**extras["concentration"])
                        if extras["concentration"]
                        else None
                    ),
                    effect_suggestions=list(extras.get("effect_suggestions") or []),
                    companions=[SeatCompanionOut(**c) for c in extras["companions"]],
                    passive_perception=extras["passive_perception"],
                    passive_insight=extras["passive_insight"],
                    passive_investigation=extras["passive_investigation"],
                    dex_mod=_dex_mod_from_character(character),
                    seated_at=seat.seated_at,
                )
            )
        members = [_member_out(m, char_map.get(m.character_id)) for m in lobby.members]
        combatants = [_combatant_out(c) for c in _parse_combatants(session.combatants)]
        return SessionDetail(
            id=session.id,
            lobby_id=lobby.id,
            lobby_name=lobby.name,
            setting_id=session.setting_id,
            setting_name=session.setting.name if session.setting else None,
            name=session.name,
            is_owner=lobby.owner_id == user.id,
            seats=seats,
            combatants=combatants,
            combat=_combat_out(getattr(session, "combat", None) or {}),
            lobby_members=members,
            visibility_profile=lobby.visibility_profile or {},
            closed_at=session.closed_at,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    def _journal_out(self, entry: CampaignJournalEntry) -> JournalEntryOut:
        setting_name: str | None = None
        session_name: str | None = None
        if entry.setting_id is not None:
            setting = self.lobbies.get_setting(entry.setting_id)
            setting_name = setting.name if setting else None
        if entry.from_session_id is not None:
            session = self.lobbies.get_session(entry.from_session_id)
            session_name = session.name if session else None
        return JournalEntryOut(
            id=entry.id,
            lobby_id=entry.lobby_id,
            author_user_id=entry.author_user_id,
            entry_type=entry.entry_type,
            title=entry.title,
            body=entry.body,
            image_url=entry.image_url,
            setting_id=entry.setting_id,
            setting_name=setting_name,
            from_session_id=entry.from_session_id,
            from_session_name=session_name,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
        )

    def list_journal(
        self,
        user: User,
        lobby_id: UUID,
        *,
        offset: int = 0,
        limit: int = 20,
    ) -> JournalPageOut:
        lobby = self._require_lobby(lobby_id)
        self._require_view(lobby, user)
        limit = max(1, min(limit, 50))
        offset = max(0, offset)
        total = self.lobbies.count_journal_entries(lobby_id)
        items = self.lobbies.list_journal_entries(lobby_id, offset=offset, limit=limit)
        return JournalPageOut(
            items=[self._journal_out(e) for e in items],
            total=total,
            offset=offset,
            limit=limit,
        )

    def create_journal_entry(
        self,
        user: User,
        lobby_id: UUID,
        payload: JournalEntryCreateRequest,
    ) -> JournalEntryOut:
        lobby = self._require_lobby(lobby_id)
        self._require_owner(lobby, user)
        entry_type = (payload.entry_type or "text").strip().lower()
        if entry_type == "session_summary":
            raise AppError(
                "Итог сессии создаётся через «Закрыть сессию»",
                code="journal_type_forbidden",
                status_code=400,
            )
        if entry_type not in JOURNAL_ENTRY_TYPES:
            raise AppError("Неизвестный тип поста", code="journal_type_invalid", status_code=400)

        setting_id = payload.setting_id
        if entry_type == "setting_link":
            if setting_id is None:
                raise AppError(
                    "Укажите сеттинг",
                    code="setting_required",
                    status_code=400,
                )
            setting = self.lobbies.get_setting(setting_id)
            if setting is None or setting.lobby_id != lobby.id:
                raise AppError("Сеттинг не найден", code="setting_not_found", status_code=400)
        elif setting_id is not None:
            setting = self.lobbies.get_setting(setting_id)
            if setting is None or setting.lobby_id != lobby.id:
                raise AppError("Сеттинг не найден", code="setting_not_found", status_code=400)

        image_url = (payload.image_url or "").strip() or None
        if entry_type == "image" and not image_url:
            raise AppError("Укажите URL картинки", code="image_url_required", status_code=400)
        if image_url and not (
            image_url.startswith("https://") or image_url.startswith("http://")
        ):
            raise AppError("URL картинки должен начинаться с http(s)", code="image_url_invalid", status_code=400)

        title = (payload.title or "").strip()
        body = payload.body or ""
        if entry_type == "chapter" and not title:
            raise AppError("У главы нужен заголовок", code="title_required", status_code=400)
        if entry_type == "text" and not title and not body.strip():
            raise AppError("Пустой пост", code="empty_post", status_code=400)

        entry = CampaignJournalEntry(
            lobby_id=lobby.id,
            author_user_id=user.id,
            entry_type=entry_type,
            title=title,
            body=body,
            image_url=image_url if entry_type == "image" else None,
            setting_id=setting_id if entry_type == "setting_link" else None,
        )
        self.lobbies.add_journal_entry(entry)
        self.db.commit()
        self.db.refresh(entry)
        return self._journal_out(entry)

    def update_journal_entry(
        self,
        user: User,
        entry_id: UUID,
        payload: JournalEntryUpdateRequest,
    ) -> JournalEntryOut:
        entry = self.lobbies.get_journal_entry(entry_id)
        if entry is None:
            raise NotFoundError("Пост не найден", code="journal_not_found")
        lobby = self._require_lobby(entry.lobby_id)
        self._require_owner(lobby, user)
        if payload.title is not None:
            entry.title = payload.title.strip()
        if payload.body is not None:
            entry.body = payload.body
        if payload.clear_image:
            entry.image_url = None
        elif payload.image_url is not None:
            url = payload.image_url.strip()
            if url and not (url.startswith("https://") or url.startswith("http://")):
                raise AppError(
                    "URL картинки должен начинаться с http(s)",
                    code="image_url_invalid",
                    status_code=400,
                )
            entry.image_url = url or None
        if payload.clear_setting:
            entry.setting_id = None
        elif payload.setting_id is not None:
            setting = self.lobbies.get_setting(payload.setting_id)
            if setting is None or setting.lobby_id != lobby.id:
                raise AppError("Сеттинг не найден", code="setting_not_found", status_code=400)
            entry.setting_id = payload.setting_id
        self.db.commit()
        self.db.refresh(entry)
        return self._journal_out(entry)

    def delete_journal_entry(self, user: User, entry_id: UUID) -> None:
        entry = self.lobbies.get_journal_entry(entry_id)
        if entry is None:
            raise NotFoundError("Пост не найден", code="journal_not_found")
        lobby = self._require_lobby(entry.lobby_id)
        self._require_owner(lobby, user)
        self.lobbies.delete_journal_entry(entry)
        self.db.commit()

    def close_session(
        self,
        user: User,
        session_id: UUID,
        payload: SessionCloseRequest,
    ) -> SessionCloseResponse:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_owner(lobby, user)
        if session.closed_at is not None:
            raise AppError("Сессия уже закрыта", code="session_already_closed", status_code=400)

        session.closed_at = datetime.now(timezone.utc)
        journal_out: JournalEntryOut | None = None
        if payload.write_journal:
            summary = (payload.summary or "").strip()
            title = (payload.title or "").strip() or f"Итог: {session.name}"
            if not summary:
                summary = f"Сессия «{session.name}» закрыта."
            entry = CampaignJournalEntry(
                lobby_id=lobby.id,
                author_user_id=user.id,
                entry_type="session_summary",
                title=title,
                body=summary,
                from_session_id=session.id,
                setting_id=session.setting_id,
            )
            self.lobbies.add_journal_entry(entry)
            self.db.commit()
            self.db.refresh(entry)
            self.db.refresh(session)
            journal_out = self._journal_out(entry)
        else:
            self.db.commit()
            self.db.refresh(session)

        return SessionCloseResponse(
            session=self._session_detail(session, lobby, user),
            journal_entry=journal_out,
        )

    def list_session_events(
        self,
        user: User,
        session_id: UUID,
        *,
        rolls_only: bool = False,
    ) -> list[SessionEventOut]:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        events = self.lobbies.list_session_events(
            session_id,
            rolls_only=rolls_only,
            limit=100,
        )
        is_owner = lobby.owner_id == user.id
        profile = lobby.visibility_profile or {}
        history_mode = profile.get("event_history") or "active"
        out: list[SessionEventOut] = []
        for event in events:
            if not is_owner and history_mode == "off":
                continue
            if (
                not is_owner
                and history_mode == "hide_master_rolls"
                and event.is_master_roll
            ):
                continue
            out.append(SessionEventOut.model_validate(event))
        return out

    async def create_manual_roll(
        self,
        user: User,
        session_id: UUID,
        payload: SessionRollCreateRequest,
    ) -> SessionEventOut:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)

        character_name: str | None = None
        character_id = payload.character_id
        is_master_roll = payload.is_master_roll
        if character_id is not None:
            member = self.lobbies.get_member(lobby.id, character_id)
            if member is None:
                raise AppError(
                    "Персонаж не в лобби",
                    code="character_not_in_lobby",
                    status_code=400,
                )
            if lobby.owner_id != user.id and member.user_id != user.id:
                raise AppError(
                    "Нельзя бросить за чужого персонажа",
                    code="forbidden",
                    status_code=403,
                )
            char_map = self.lobbies.get_characters_map([character_id])
            character = char_map.get(character_id)
            character_name = character.name if character else None
            if self.lobbies.get_seat(session.id, character_id) is None:
                raise AppError(
                    "Персонаж не за столом этой сессии",
                    code="character_not_seated",
                    status_code=400,
                )
        elif lobby.owner_id != user.id:
            raise AppError(
                "Только мастер может бросать без персонажа",
                code="forbidden",
                status_code=403,
            )
        else:
            is_master_roll = True
            character_name = "Мастер"

        event = SessionEvent(
            session_id=session.id,
            event_type="roll",
            character_id=character_id,
            actor_user_id=user.id,
            character_name=character_name,
            title=payload.title.strip() or "Бросок",
            formula=payload.formula,
            breakdown=payload.breakdown,
            total=payload.total,
            is_master_roll=is_master_roll,
            payload={},
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)
        out = SessionEventOut.model_validate(event)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out.model_dump(mode="json")},
        )
        return out

    def _require_seat_actor(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
    ) -> tuple[PlaySession, Lobby, Character]:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        if self.lobbies.get_seat(session.id, character_id) is None:
            raise AppError(
                "Персонаж не за столом",
                code="character_not_seated",
                status_code=400,
            )
        member = self.lobbies.get_member(lobby.id, character_id)
        if member is None:
            raise AppError("Персонаж не в лобби", code="character_not_in_lobby", status_code=400)
        is_owner = lobby.owner_id == user.id
        is_char_owner = member.user_id == user.id
        if not is_owner and not is_char_owner:
            raise AppError(
                "Только мастер или владелец персонажа",
                code="forbidden",
                status_code=403,
            )
        char_map = self.lobbies.get_characters_map([character_id])
        character = char_map.get(character_id)
        if character is None:
            raise NotFoundError("Персонаж не найден", code="character_not_found")
        return session, lobby, character

    def _mutate_sheet_combat(self, character: Character) -> dict:
        sheet = dict(character.sheet or {})
        combat = dict(sheet.get("combat") or {})
        sheet["combat"] = combat
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        return combat

    async def patch_seat_combat(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
        payload: SeatCombatPatchRequest,
    ) -> SessionDetail:
        session, lobby, character = self._require_seat_actor(user, session_id, character_id)
        combat = self._mutate_sheet_combat(character)
        if payload.inspiration is not None:
            combat["inspiration"] = bool(payload.inspiration)
        if payload.conditions is not None:
            combat["conditions"] = [
                {
                    "slug": c.slug,
                    "name": c.name,
                    "catalog_id": c.catalog_id,
                }
                for c in payload.conditions
            ]
        if payload.effects is not None:
            combat["effects"] = [
                {
                    "id": e.id,
                    "name": e.name,
                    "source_character_id": e.source_character_id,
                    "source_name": e.source_name,
                    "linked_concentration": bool(e.linked_concentration),
                }
                for e in payload.effects
            ]
        if payload.concentration is not None:
            combat["concentration"] = {
                "spell_id": payload.concentration.spell_id,
                "name": payload.concentration.name,
            }
        cleared_concentration = False
        if payload.clear_concentration:
            combat["concentration"] = None
            cleared_concentration = True
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(character, "sheet")

        if cleared_concentration:
            clear_linked_effects_for_caster(self.lobbies, character_id)

        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

    def share_effect(
        self,
        user: User,
        lobby_id: UUID,
        payload: LobbyShareEffectRequest,
    ) -> LobbyShareEffectResponse:
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        source_member = self.lobbies.get_member(lobby.id, payload.source_character_id)
        if source_member is None or (
            source_member.user_id != user.id and lobby.owner_id != user.id
        ):
            raise AppError(
                "Нельзя раздать эффект от этого персонажа",
                code="forbidden",
                status_code=403,
            )

        char_map = self.lobbies.get_characters_map(
            [payload.source_character_id, *payload.target_character_ids]
        )
        source = char_map.get(payload.source_character_id)
        if source is None:
            raise NotFoundError("Персонаж-источник не найден", code="character_not_found")

        name = payload.name.strip()
        if not name:
            raise AppError("Укажите название эффекта", code="effect_name_required", status_code=400)

        linked = bool(payload.linked_concentration)
        source_combat = (
            (source.sheet or {}).get("combat") if isinstance(source.sheet, dict) else None
        )
        source_conc = (
            source_combat.get("concentration") if isinstance(source_combat, dict) else None
        )
        if linked and not _parse_concentration(source_conc):
            linked = False

        applied = 0
        seen: set[UUID] = set()
        for target_id in payload.target_character_ids:
            if target_id in seen:
                continue
            seen.add(target_id)
            member = self.lobbies.get_member(lobby.id, target_id)
            if member is None:
                continue
            target = char_map.get(target_id)
            if target is None:
                continue
            append_effect(
                target,
                effect_id=str(uuid4()),
                name=name,
                source_character_id=str(payload.source_character_id),
                source_name=source.name,
                linked_concentration=linked,
            )
            applied += 1

        self.db.commit()
        detail = self.get(user, lobby_id)
        return LobbyShareEffectResponse(applied=applied, lobby=detail)

    async def add_seat_companion(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
        payload: SeatCompanionCreateRequest,
    ) -> SessionDetail:
        session, lobby, character = self._require_seat_actor(user, session_id, character_id)
        sheet = dict(character.sheet or {})
        companions = _parse_companions(sheet.get("companions"))
        companions.append(
            {
                "id": str(uuid4()),
                "name": payload.name.strip(),
                "hp_current": payload.hp_current if payload.hp_current is not None else payload.hp_max,
                "hp_max": payload.hp_max,
                "ac": payload.ac,
                "conditions": [],
            }
        )
        sheet["companions"] = companions
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(character, "sheet")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

    async def patch_seat_companion(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
        companion_id: str,
        payload: SeatCompanionPatchRequest,
    ) -> SessionDetail:
        session, lobby, character = self._require_seat_actor(user, session_id, character_id)
        sheet = dict(character.sheet or {})
        companions = _parse_companions(sheet.get("companions"))
        found = False
        for item in companions:
            if item["id"] != companion_id:
                continue
            found = True
            if payload.name is not None:
                item["name"] = payload.name.strip()
            if payload.hp_current is not None:
                item["hp_current"] = payload.hp_current
            if payload.hp_max is not None:
                item["hp_max"] = payload.hp_max
            if payload.ac is not None:
                item["ac"] = payload.ac
            if payload.conditions is not None:
                item["conditions"] = [
                    {"slug": c.slug, "name": c.name, "catalog_id": c.catalog_id}
                    for c in payload.conditions
                ]
        if not found:
            raise NotFoundError("Напарник не найден", code="companion_not_found")
        sheet["companions"] = companions
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(character, "sheet")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

    async def delete_seat_companion(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
        companion_id: str,
    ) -> SessionDetail:
        session, lobby, character = self._require_seat_actor(user, session_id, character_id)
        sheet = dict(character.sheet or {})
        companions = _parse_companions(sheet.get("companions"))
        next_list = [c for c in companions if c["id"] != companion_id]
        if len(next_list) == len(companions):
            raise NotFoundError("Напарник не найден", code="companion_not_found")
        sheet["companions"] = next_list
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(character, "sheet")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

    def _require_session_owner(self, user: User, session_id: UUID) -> tuple[PlaySession, Lobby]:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_owner(lobby, user)
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)
        return session, lobby

    async def add_combatants(
        self,
        user: User,
        session_id: UUID,
        payload: CombatantCreateRequest,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from app.models.catalog import CatalogKind
        from sqlalchemy.orm.attributes import flag_modified

        template: dict | None = None
        catalog_id: str | None = None
        slug: str | None = None
        custom = False

        if payload.catalog_id is not None or (payload.slug and payload.slug.strip()):
            entry = None
            if payload.catalog_id is not None:
                entry = self.catalog.get_by_id(payload.catalog_id)
            if entry is None and payload.slug:
                entry = self.catalog.get_by_kind_slug(
                    kind=CatalogKind.bestiary,
                    slug=payload.slug.strip(),
                    edition="2014",
                )
            if entry is None or entry.kind != CatalogKind.bestiary:
                raise NotFoundError("Карточка бестиария не найдена", code="bestiary_not_found")
            data = entry.data if isinstance(entry.data, dict) else {}
            catalog_id = str(entry.id)
            slug = entry.slug
            hp = int(data.get("hp_average") or payload.hp_max or 1)
            template = {
                "name": payload.name.strip() if payload.name else entry.name_ru,
                "hp_max": int(payload.hp_max or hp),
                "hp_current": int(payload.hp_max or hp),
                "ac": payload.ac if payload.ac is not None else data.get("ac"),
                "speed": payload.speed if payload.speed is not None else _speed_walk(data.get("speed")),
                "cr": str(data.get("cr") or "") or None,
                "catalog_id": catalog_id,
                "slug": slug,
                "source_book": str(data.get("source_book") or "") or None,
                "type_ru": str(data.get("type_ru") or "") or None,
                "custom": False,
                "conditions": [],
                "traits": _action_blocks(data.get("traits")),
                "actions": _action_blocks(data.get("actions")),
                "bonus_actions": _action_blocks(data.get("bonus_actions")),
                "reactions": _action_blocks(data.get("reactions")),
                "legendary_actions": _action_blocks(data.get("legendary_actions")),
                "dex_mod": _dex_mod_from_abilities(data.get("abilities")),
                "xp": (
                    int(payload.xp)
                    if payload.xp is not None
                    else xp_from_cr(data.get("cr"))
                ),
                "xp_claimed_count": 0,
            }
        else:
            name = (payload.name or "").strip()
            if not name:
                raise AppError("Укажите имя НПС или карточку бестиария", code="combatant_name_required", status_code=400)
            if payload.hp_max is None:
                raise AppError("Укажите максимум HP", code="combatant_hp_required", status_code=400)
            custom = True
            template = {
                "name": name,
                "hp_max": int(payload.hp_max),
                "hp_current": int(payload.hp_max),
                "ac": payload.ac,
                "speed": payload.speed,
                "cr": None,
                "catalog_id": None,
                "slug": None,
                "source_book": None,
                "type_ru": "НПС",
                "custom": True,
                "conditions": [],
                "traits": [],
                "actions": _action_blocks([a.model_dump() for a in payload.actions]),
                "bonus_actions": [],
                "reactions": [],
                "legendary_actions": [],
                "dex_mod": None,
                "xp": int(payload.xp) if payload.xp is not None else None,
                "xp_claimed_count": 0,
            }

        combatants = _parse_combatants(session.combatants)
        count = max(1, min(20, int(payload.count or 1)))
        base_name = str(template["name"])
        hp_max = max(1, int(template["hp_max"]))
        members = []
        for i in range(count):
            members.append(
                {
                    "id": str(uuid4()),
                    "name": f"{base_name} {i + 1}" if count > 1 else base_name,
                    "hp_current": hp_max,
                    "hp_max": hp_max,
                }
            )
        row = {
            **template,
            "id": str(uuid4()),
            "name": base_name,
            "members": members,
            "custom": custom,
        }
        _sync_combatant_summary(row)
        combatants.append(row)

        session.combatants = combatants
        flag_modified(session, "combatants")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

    async def patch_combatant(
        self,
        user: User,
        session_id: UUID,
        combatant_id: str,
        payload: CombatantPatchRequest,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        combatants = _parse_combatants(session.combatants)
        target = next((c for c in combatants if c["id"] == combatant_id), None)
        if target is None:
            raise NotFoundError("Противник не найден", code="combatant_not_found")

        if payload.name is not None:
            target["name"] = payload.name.strip()
        if payload.ac is not None:
            target["ac"] = int(payload.ac)
        if payload.conditions is not None:
            target["conditions"] = [
                {"slug": c.slug, "name": c.name, "catalog_id": c.catalog_id}
                for c in payload.conditions
            ]

        members: list[dict] = list(target.get("members") or [])
        if payload.hp_max is not None:
            new_max = max(1, int(payload.hp_max))
            target["hp_max"] = new_max
            # Если один боец — синхронизируем его max; в пачке max задаётся на member.
            if len(members) == 1:
                members[0]["hp_max"] = new_max
                members[0]["hp_current"] = min(int(members[0]["hp_current"]), new_max)

        if payload.member_damages:
            by_id = {m["id"]: m for m in members}
            for entry in payload.member_damages:
                member = by_id.get(entry.member_id)
                if member is None:
                    raise NotFoundError(
                        "Боец пачки не найден",
                        code="combatant_member_not_found",
                    )
                _apply_member_damage(member, entry.damage)
        elif payload.damage is not None:
            # Без member_id — первый живой; с member_id — выбранный в составе.
            member = None
            if payload.member_id:
                member = next((m for m in members if m["id"] == payload.member_id), None)
                if member is None:
                    raise NotFoundError(
                        "Боец пачки не найден",
                        code="combatant_member_not_found",
                    )
            else:
                member = next((m for m in members if int(m["hp_current"]) > 0), None)
                if member is None and members:
                    member = members[0]
            if member is None:
                raise AppError("В пачке нет бойцов", code="combatant_empty", status_code=400)
            _apply_member_damage(member, payload.damage)
        elif payload.hp_current is not None and len(members) == 1:
            m = members[0]
            m_max = max(1, int(m["hp_max"]))
            m["hp_current"] = max(0, min(m_max, int(payload.hp_current)))

        target["members"] = members
        _sync_combatant_summary(target)

        session.combatants = combatants
        flag_modified(session, "combatants")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

    async def delete_combatant(
        self,
        user: User,
        session_id: UUID,
        combatant_id: str,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        combatants = _parse_combatants(session.combatants)
        next_list = [c for c in combatants if c["id"] != combatant_id]
        if len(next_list) == len(combatants):
            raise NotFoundError("Противник не найден", code="combatant_not_found")
        session.combatants = next_list
        flag_modified(session, "combatants")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

    async def start_combat(
        self,
        user: User,
        session_id: UUID,
        payload: CombatStartRequest,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        entries: list[dict] = []
        for item in payload.entries:
            entries.append(
                {
                    "id": str(uuid4()),
                    "kind": item.kind,
                    "ref_id": item.ref_id.strip(),
                    "companion_id": item.companion_id,
                    "name": item.name.strip(),
                    "initiative": int(item.initiative),
                    "dex_mod": item.dex_mod,
                }
            )
        entries = _sort_combat_entries(entries)
        session.combat = {
            "active": True,
            "round": 1,
            "active_index": 0,
            "entries": entries,
        }
        flag_modified(session, "combat")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

    async def patch_combat(
        self,
        user: User,
        session_id: UUID,
        payload: CombatPatchRequest,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        state = _parse_combat_state(session.combat)

        if payload.action == "end":
            session.combat = {
                "active": False,
                "round": 1,
                "active_index": 0,
                "entries": [],
            }
            flag_modified(session, "combat")
            self.db.commit()
            detail = self._session_detail(session, lobby, user)
            await session_hub.broadcast(
                session.id,
                {"type": "session_update", "session": detail.model_dump(mode="json")},
            )
            return detail

        if payload.entries is not None:
            entries = []
            for item in payload.entries:
                entries.append(
                    {
                        "id": str(uuid4()),
                        "kind": item.kind,
                        "ref_id": item.ref_id.strip(),
                        "companion_id": item.companion_id,
                        "name": item.name.strip(),
                        "initiative": int(item.initiative),
                        "dex_mod": item.dex_mod,
                    }
                )
            state["entries"] = _sort_combat_entries(entries)
            state["active"] = len(state["entries"]) > 0
            state["active_index"] = 0
            state["round"] = 1

        if not state["entries"]:
            raise AppError("Бой не начат", code="combat_inactive", status_code=400)

        n = len(state["entries"])
        idx = int(state["active_index"])
        round_no = int(state["round"])

        if payload.action == "next":
            idx += 1
            if idx >= n:
                idx = 0
                round_no += 1
        elif payload.action == "prev":
            idx -= 1
            if idx < 0:
                idx = n - 1
                round_no = max(1, round_no - 1)
        elif payload.action not in (None, ""):
            raise AppError("Неизвестное действие боя", code="combat_bad_action", status_code=400)

        if payload.active_index is not None:
            idx = max(0, min(n - 1, int(payload.active_index)))
        if payload.round is not None:
            round_no = max(1, int(payload.round))

        session.combat = {
            "active": True,
            "round": round_no,
            "active_index": idx,
            "entries": state["entries"],
        }
        flag_modified(session, "combat")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

    async def award_xp(
        self,
        user: User,
        session_id: UUID,
        payload: XpAwardRequest,
    ) -> XpAwardResult:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        seat_ids = {s.character_id for s in session.seats}
        targets = []
        for cid in payload.character_ids:
            if cid not in seat_ids:
                raise AppError(
                    "XP только персонажам за столом",
                    code="xp_not_seated",
                    status_code=400,
                )
            targets.append(cid)
        # unique preserve order
        seen: set[UUID] = set()
        unique_targets: list[UUID] = []
        for cid in targets:
            if cid in seen:
                continue
            seen.add(cid)
            unique_targets.append(cid)
        if not unique_targets:
            raise AppError("Нет получателей XP", code="xp_no_recipients", status_code=400)

        if payload.per_character_xp is not None:
            each = int(payload.per_character_xp)
            total = each * len(unique_targets)
        elif payload.total_xp is not None:
            total = int(payload.total_xp)
            each = total // len(unique_targets)
            total = each * len(unique_targets)  # без остатка «в стол» — ровная раздача
        else:
            raise AppError(
                "Укажите total_xp или per_character_xp",
                code="xp_amount_required",
                status_code=400,
            )
        if each < 0:
            raise AppError("XP не может быть отрицательным", code="xp_negative", status_code=400)

        char_map = self.lobbies.get_characters_map(unique_targets)
        recipient_names: list[str] = []
        for cid in unique_targets:
            character = char_map.get(cid)
            if character is None:
                raise NotFoundError("Персонаж не найден", code="character_not_found")
            sheet = dict(character.sheet or {})
            identity = dict(sheet.get("identity") or {})
            current = identity.get("experience")
            try:
                cur_xp = int(current or 0)
            except (TypeError, ValueError):
                cur_xp = 0
            identity["experience"] = max(0, cur_xp + each)
            sheet["identity"] = identity
            character.sheet = sheet
            character.sheet_version = int(character.sheet_version or 1) + 1
            flag_modified(character, "sheet")
            recipient_names.append(character.name)

        if payload.claim_combatant_ids:
            combatants = _parse_combatants(session.combatants)
            claim = {str(x) for x in payload.claim_combatant_ids}
            changed = False
            for row in combatants:
                if row["id"] not in claim:
                    continue
                members = row.get("members") or []
                dead = (
                    sum(1 for m in members if int(m.get("hp_current") or 0) <= 0)
                    if members
                    else (1 if int(row.get("hp_current") or 0) <= 0 else 0)
                )
                # Фиксируем, сколько поверженных уже учли — следующие убийства дораздадут.
                row["xp_claimed_count"] = max(int(row.get("xp_claimed_count") or 0), dead)
                changed = True
            if changed:
                session.combatants = combatants
                flag_modified(session, "combatants")

        source = (payload.source or "manual").strip()[:32] or "manual"
        note = (payload.note or "").strip()
        title = "Опыт" if source == "combat" else "Опыт (вручную)"
        breakdown = ", ".join(recipient_names)
        if note:
            breakdown = f"{breakdown} · {note}"
        event = SessionEvent(
            session_id=session.id,
            event_type="xp",
            character_id=None,
            actor_user_id=user.id,
            character_name="Мастер",
            title=title[:200],
            formula=f"+{each} XP" if len(unique_targets) == 1 else f"+{each} XP × {len(unique_targets)}",
            breakdown=breakdown[:200],
            total=total if total > 0 else None,
            is_master_roll=False,
            payload={
                "source": source,
                "awarded_each": each,
                "awarded_total": total,
                "character_ids": [str(c) for c in unique_targets],
                "names": recipient_names,
                "note": note or None,
                "claim_combatant_ids": list(payload.claim_combatant_ids or []),
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)

        detail = self._session_detail(session, lobby, user)
        out_event = SessionEventOut.model_validate(event)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        return XpAwardResult(
            session=detail,
            awarded_each=each,
            awarded_total=total,
            recipients=recipient_names,
        )

    async def award_loot(
        self,
        user: User,
        session_id: UUID,
        payload: LootAwardRequest,
    ) -> LootAwardResult:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        seat_ids = {s.character_id for s in session.seats}
        coin_keys = ("cp", "sp", "ep", "gp", "pp")
        coin_labels = {"cp": "мм", "sp": "см", "ep": "эм", "gp": "зм", "pp": "пм"}

        # Aggregate grants per character
        by_char: dict[UUID, dict] = {}
        lines: list[str] = []
        for grant in payload.grants:
            if grant.character_id not in seat_ids:
                raise AppError(
                    "Лут только персонажам за столом",
                    code="loot_not_seated",
                    status_code=400,
                )
            if grant.item is None and grant.coins is None:
                raise AppError(
                    "В доле нужен предмет или монеты",
                    code="loot_empty_grant",
                    status_code=400,
                )
            bucket = by_char.setdefault(
                grant.character_id,
                {"items": [], "coins": {k: 0 for k in coin_keys}},
            )
            if grant.item is not None:
                name = grant.item.name.strip()
                if not name:
                    raise AppError("Укажите имя предмета", code="loot_item_name", status_code=400)
                qty = max(1, int(grant.item.qty))
                bucket["items"].append(
                    {
                        "name": name,
                        "qty": qty,
                        "notes": (grant.item.notes or "").strip() or None,
                    }
                )
                lines.append(f"{name}×{qty}" if qty > 1 else name)
            if grant.coins is not None:
                raw = grant.coins.model_dump()
                parts = []
                for key in coin_keys:
                    amount = max(0, int(raw.get(key) or 0))
                    if amount <= 0:
                        continue
                    bucket["coins"][key] += amount
                    parts.append(f"{amount} {coin_labels[key]}")
                if parts:
                    lines.append(" + ".join(parts))

        if not by_char:
            raise AppError("Нет долей лута", code="loot_empty", status_code=400)

        char_map = self.lobbies.get_characters_map(list(by_char.keys()))
        recipient_names: list[str] = []
        for cid, bucket in by_char.items():
            character = char_map.get(cid)
            if character is None:
                raise NotFoundError("Персонаж не найден", code="character_not_found")
            sheet = dict(character.sheet or {})
            inventory = dict(sheet.get("inventory") or {})
            coins = dict(inventory.get("coins") or {})
            for key in coin_keys:
                try:
                    cur = int(coins.get(key) or 0)
                except (TypeError, ValueError):
                    cur = 0
                coins[key] = max(0, cur + int(bucket["coins"][key]))
            items = list(inventory.get("items") or [])
            if not isinstance(items, list):
                items = []
            for entry in bucket["items"]:
                items.append(
                    {
                        "id": str(uuid4()),
                        "name": entry["name"],
                        "catalog_id": None,
                        "qty": entry["qty"],
                        "weight_lb": None,
                        "equipped": False,
                        "armor_kind": "none",
                        "base_ac": None,
                        "notes": entry["notes"] or "",
                    }
                )
            inventory["coins"] = {k: int(coins.get(k) or 0) for k in coin_keys}
            inventory["items"] = items
            sheet["inventory"] = inventory
            character.sheet = sheet
            character.sheet_version = int(character.sheet_version or 1) + 1
            flag_modified(character, "sheet")
            recipient_names.append(character.name)

        note = (payload.note or "").strip()
        summary_bits = lines[:8]
        summary = ", ".join(summary_bits)
        if len(lines) > 8:
            summary = f"{summary}…"
        if note:
            summary = f"{summary} · {note}" if summary else note
        summary = summary[:200] or "Лут"

        event = SessionEvent(
            session_id=session.id,
            event_type="loot",
            character_id=None,
            actor_user_id=user.id,
            character_name="Мастер",
            title="Лут",
            formula=None,
            breakdown=", ".join(recipient_names)[:200],
            total=None,
            is_master_roll=False,
            payload={
                "note": note or None,
                "lines": lines,
                "character_ids": [str(c) for c in by_char.keys()],
                "names": recipient_names,
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)

        detail = self._session_detail(session, lobby, user)
        out_event = SessionEventOut.model_validate(event)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        return LootAwardResult(
            session=detail,
            summary=summary,
            recipient_names=recipient_names,
        )

    async def transfer_inventory(
        self,
        user: User,
        lobby_id: UUID,
        payload: InventoryTransferRequest,
    ) -> InventoryTransferResult:
        lobby = self._require_lobby(lobby_id)
        self._require_view(lobby, user)

        if payload.from_character_id == payload.to_character_id:
            raise AppError(
                "Нельзя передать самому себе",
                code="transfer_self",
                status_code=400,
            )

        from_member = self.lobbies.get_member(lobby.id, payload.from_character_id)
        to_member = self.lobbies.get_member(lobby.id, payload.to_character_id)
        if from_member is None or to_member is None:
            raise AppError(
                "Оба персонажа должны быть в этом лобби",
                code="transfer_not_in_lobby",
                status_code=400,
            )
        if from_member.user_id != user.id and lobby.owner_id != user.id:
            raise AppError(
                "Передавать можно только со своего листа",
                code="forbidden",
                status_code=403,
            )

        char_map = self.lobbies.get_characters_map(
            [payload.from_character_id, payload.to_character_id]
        )
        sender = char_map.get(payload.from_character_id)
        receiver = char_map.get(payload.to_character_id)
        if sender is None or receiver is None:
            raise NotFoundError("Персонаж не найден", code="character_not_found")

        from sqlalchemy.orm.attributes import flag_modified

        sender_sheet = dict(sender.sheet or {})
        receiver_sheet = dict(receiver.sheet or {})
        s_inv = dict(sender_sheet.get("inventory") or {})
        r_inv = dict(receiver_sheet.get("inventory") or {})
        s_coins = dict(s_inv.get("coins") or {})
        r_coins = dict(r_inv.get("coins") or {})
        s_items = list(s_inv.get("items") or []) if isinstance(s_inv.get("items"), list) else []
        r_items = list(r_inv.get("items") or []) if isinstance(r_inv.get("items"), list) else []

        coin_labels = {"cp": "мм", "sp": "см", "ep": "эм", "gp": "зм", "pp": "пм"}
        summary: str

        if payload.item_id:
            idx = next(
                (i for i, it in enumerate(s_items) if str(it.get("id") or "") == payload.item_id),
                None,
            )
            if idx is None:
                raise NotFoundError("Предмет не найден у отправителя", code="transfer_item_missing")
            item = dict(s_items[idx])
            have = max(0, int(item.get("qty") or 0))
            move_qty = int(payload.qty or have)
            if move_qty <= 0 or move_qty > have:
                raise AppError(
                    "Недостаточно предметов",
                    code="transfer_qty",
                    status_code=400,
                )
            name = str(item.get("name") or "Предмет").strip() or "Предмет"
            if move_qty >= have:
                s_items.pop(idx)
            else:
                item["qty"] = have - move_qty
                s_items[idx] = item
            # stack into receiver same name+catalog if present
            catalog_id = item.get("catalog_id")
            stacked = False
            for j, rit in enumerate(r_items):
                if (
                    str(rit.get("name") or "") == name
                    and (rit.get("catalog_id") or None) == (catalog_id or None)
                    and not bool(rit.get("equipped"))
                ):
                    rit = dict(rit)
                    rit["qty"] = max(0, int(rit.get("qty") or 0)) + move_qty
                    r_items[j] = rit
                    stacked = True
                    break
            if not stacked:
                gifted = {
                    "id": str(uuid4()),
                    "name": name,
                    "catalog_id": catalog_id,
                    "qty": move_qty,
                    "weight_lb": item.get("weight_lb"),
                    "equipped": False,
                    "armor_kind": item.get("armor_kind") or "none",
                    "base_ac": item.get("base_ac"),
                    "notes": item.get("notes") or "",
                }
                r_items.append(gifted)
            summary = (
                f"{sender.name} → {receiver.name}: {name}"
                + (f" ×{move_qty}" if move_qty > 1 else "")
            )
        elif payload.coin_currency and payload.coin_amount:
            currency = payload.coin_currency
            amount = int(payload.coin_amount)
            try:
                have = int(s_coins.get(currency) or 0)
            except (TypeError, ValueError):
                have = 0
            if amount > have:
                raise AppError(
                    "Недостаточно монет",
                    code="transfer_coins",
                    status_code=400,
                )
            s_coins[currency] = have - amount
            try:
                recv = int(r_coins.get(currency) or 0)
            except (TypeError, ValueError):
                recv = 0
            r_coins[currency] = recv + amount
            label = coin_labels.get(currency, currency)
            summary = f"{sender.name} → {receiver.name}: {amount} {label}"
        else:
            raise AppError(
                "Укажите предмет или монеты",
                code="transfer_empty",
                status_code=400,
            )

        for key in ("cp", "sp", "ep", "gp", "pp"):
            s_coins.setdefault(key, int(s_coins.get(key) or 0))
            r_coins.setdefault(key, int(r_coins.get(key) or 0))

        s_inv["coins"] = s_coins
        s_inv["items"] = s_items
        r_inv["coins"] = r_coins
        r_inv["items"] = r_items
        sender_sheet["inventory"] = s_inv
        receiver_sheet["inventory"] = r_inv
        sender.sheet = sender_sheet
        receiver.sheet = receiver_sheet
        sender.sheet_version = int(sender.sheet_version or 1) + 1
        receiver.sheet_version = int(receiver.sheet_version or 1) + 1
        flag_modified(sender, "sheet")
        flag_modified(receiver, "sheet")

        # Лента: если указана сессия и оба за столом — событие туда.
        session_id = payload.session_id
        if session_id is not None:
            session = self.lobbies.get_session(session_id)
            if (
                session is not None
                and session.lobby_id == lobby.id
                and session.closed_at is None
                and self.lobbies.get_seat(session.id, payload.from_character_id) is not None
                and self.lobbies.get_seat(session.id, payload.to_character_id) is not None
            ):
                event = SessionEvent(
                    session_id=session.id,
                    event_type="transfer",
                    character_id=payload.from_character_id,
                    actor_user_id=user.id,
                    character_name=sender.name,
                    title="Передача",
                    formula=None,
                    breakdown=summary[:200],
                    total=None,
                    is_master_roll=False,
                    payload={
                        "from_character_id": str(payload.from_character_id),
                        "to_character_id": str(payload.to_character_id),
                        "to_character_name": receiver.name,
                    },
                )
                self.lobbies.add_session_event(event)

        self.db.commit()
        return InventoryTransferResult(
            summary=summary,
            from_character_id=payload.from_character_id,
            to_character_id=payload.to_character_id,
            to_character_name=receiver.name,
        )

    def create_encounter_template(
        self,
        user: User,
        lobby_id: UUID,
        payload: EncounterTemplateCreateRequest,
    ) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        self._require_owner(lobby, user)
        from sqlalchemy.orm.attributes import flag_modified

        templates = _parse_encounter_templates(getattr(lobby, "encounter_templates", None))
        templates.append(
            EncounterTemplateOut(
                id=str(uuid4()),
                name=payload.name.strip(),
                entries=payload.entries,
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        )
        lobby.encounter_templates = _templates_to_storage(templates)
        flag_modified(lobby, "encounter_templates")
        self.db.commit()
        return self._to_detail(self._require_lobby(lobby.id), user)

    def save_encounter_from_session(
        self,
        user: User,
        session_id: UUID,
        payload: EncounterTemplateSaveFromSessionRequest,
    ) -> LobbyDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        combatants = _parse_combatants(session.combatants)
        if not combatants:
            raise AppError(
                "На столе нет противников для шаблона",
                code="encounter_empty",
                status_code=400,
            )
        entries: list[EncounterEntryOut] = []
        for row in combatants:
            members = row.get("members") or []
            count = len(members) if members else 1
            entries.append(
                EncounterEntryOut(
                    catalog_id=row.get("catalog_id"),
                    slug=row.get("slug"),
                    name=str(row.get("name") or "Противник"),
                    count=max(1, min(20, count)),
                    hp_max=int(row["hp_max"]) if isinstance(row.get("hp_max"), int) else None,
                    ac=int(row["ac"]) if isinstance(row.get("ac"), int) else None,
                    speed=int(row["speed"]) if isinstance(row.get("speed"), int) else None,
                    xp=int(row["xp"]) if isinstance(row.get("xp"), int) else None,
                    custom=bool(row.get("custom")),
                    actions=[
                        CombatantActionOut(**a) for a in (row.get("actions") or []) if isinstance(a, dict)
                    ],
                )
            )
        templates = _parse_encounter_templates(getattr(lobby, "encounter_templates", None))
        templates.append(
            EncounterTemplateOut(
                id=str(uuid4()),
                name=payload.name.strip(),
                entries=entries,
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        )
        lobby.encounter_templates = _templates_to_storage(templates)
        flag_modified(lobby, "encounter_templates")
        self.db.commit()
        return self._to_detail(self._require_lobby(lobby.id), user)

    def delete_encounter_template(
        self,
        user: User,
        lobby_id: UUID,
        template_id: str,
    ) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        self._require_owner(lobby, user)
        from sqlalchemy.orm.attributes import flag_modified

        templates = _parse_encounter_templates(getattr(lobby, "encounter_templates", None))
        next_list = [t for t in templates if t.id != template_id]
        if len(next_list) == len(templates):
            raise NotFoundError("Шаблон не найден", code="encounter_not_found")
        lobby.encounter_templates = _templates_to_storage(next_list)
        flag_modified(lobby, "encounter_templates")
        self.db.commit()
        return self._to_detail(self._require_lobby(lobby.id), user)

    def generate_encounter(
        self,
        user: User,
        session_id: UUID,
        payload: EncounterGenerateRequest,
    ) -> EncounterGenerateResult:
        """B8: предложить босс+пачку по листам за столом (UI draft)."""
        session, lobby = self._require_session_owner(user, session_id)
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)
        if not session.seats:
            raise AppError(
                "За столом никого нет — нечего анализировать",
                code="encounter_no_seats",
                status_code=400,
            )

        seat_ids = [s.character_id for s in session.seats]
        chars = self.lobbies.get_characters_map(seat_ids)

        members: list[PartyMemberSnapshot] = []
        for seat in session.seats:
            ch = chars.get(seat.character_id)
            if ch is None:
                continue
            sheet = ch.sheet if isinstance(ch.sheet, dict) else {}
            extras = _seat_combat_fields(ch)
            effects = extras.get("effects") or []
            effect_names = tuple(
                str(e.get("name") or "")
                for e in effects
                if isinstance(e, dict)
            )
            members.append(
                PartyMemberSnapshot(
                    level=int(ch.level or 1),
                    hp_max=ch.hp_max if isinstance(ch.hp_max, int) else None,
                    sheet=sheet,
                    seat_effects=effect_names,
                    race_name=ch.race_name,
                    class_name=ch.class_name,
                )
            )
        if not members:
            raise AppError(
                "Не удалось прочитать листы за столом",
                code="encounter_no_sheets",
                status_code=400,
            )

        catalog_rows = self.catalog.list_bestiary_for_generator(edition="2014")
        monsters = []
        for row in catalog_rows:
            ref = monster_from_catalog_entry(
                {
                    "slug": row.slug,
                    "name_ru": row.name_ru,
                    "data": row.data if isinstance(row.data, dict) else {},
                }
            )
            if ref is not None:
                monsters.append(ref)

        try:
            difficulty = EncounterDifficulty(payload.difficulty)
        except ValueError as exc:
            raise AppError("Неизвестная сложность", code="bad_difficulty", status_code=400) from exc

        proposal = compose_encounter(
            members=members,
            monsters=monsters,
            difficulty=difficulty,
            environments=list(payload.environments or []),
            theme_ids=list(payload.theme_ids),
            similar=bool(payload.similar),
            waves=int(payload.waves),
        )

        def _role(role) -> EncounterRoleOut:
            return EncounterRoleOut(
                role=role.role,  # type: ignore[arg-type]
                suggested_count=role.suggested_count,
                options=[
                    EncounterMonsterOptionOut(
                        slug=o.slug,
                        name_ru=o.name_ru,
                        cr=o.cr,
                        xp=o.xp,
                        type=o.type_en or None,
                        subtype=o.subtype,
                        fly=o.fly,
                    )
                    for o in role.options
                ],
            )

        return EncounterGenerateResult(
            difficulty=proposal.difficulty.value,
            party_power=round(proposal.party_power, 4),
            budget_total=proposal.budget_total,
            anti_air_ok=proposal.anti_air_ok,
            notes=list(proposal.notes),
            theme_ids=list(payload.theme_ids),
            similar=bool(payload.similar),
            environments=list(payload.environments or []),
            waves=[
                EncounterWaveOut(
                    wave_index=w.wave_index,
                    budget_xp=w.budget_xp,
                    boss=_role(w.boss),
                    pack=_role(w.pack),
                )
                for w in proposal.waves
            ],
        )

    async def deploy_encounter_template(
        self,
        user: User,
        session_id: UUID,
        template_id: str,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)
        templates = _parse_encounter_templates(getattr(lobby, "encounter_templates", None))
        template = next((t for t in templates if t.id == template_id), None)
        if template is None:
            raise NotFoundError("Шаблон не найден", code="encounter_not_found")

        # Посадить каждую позицию шаблона через существующий add_combatants.
        detail = self._session_detail(session, lobby, user)
        for entry in template.entries:
            req = CombatantCreateRequest(
                catalog_id=UUID(entry.catalog_id) if entry.catalog_id else None,
                slug=entry.slug,
                name=entry.name if entry.custom or not entry.catalog_id else None,
                hp_max=entry.hp_max if entry.custom or not entry.catalog_id else None,
                ac=entry.ac if entry.custom else None,
                speed=entry.speed if entry.custom else None,
                count=entry.count,
                actions=entry.actions if entry.custom else [],
                xp=entry.xp if entry.custom else None,
            )
            if not entry.catalog_id and not entry.slug and not (entry.name and entry.hp_max):
                continue
            detail = await self.add_combatants(user, session_id, req)
        return detail
