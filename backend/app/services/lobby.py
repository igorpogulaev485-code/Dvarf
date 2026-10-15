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
from app.schemas.lobby import (
    AddLobbyMemberRequest,
    JoinLobbyRequest,
    JournalEntryCreateRequest,
    JournalEntryOut,
    JournalEntryUpdateRequest,
    JournalPageOut,
    LobbyCreateRequest,
    LobbyDetail,
    LobbyMemberOut,
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
    SessionCreateRequest,
    SessionDetail,
    SessionEventOut,
    SessionRollCreateRequest,
    SessionSeatOut,
    SessionSummary,
    SessionUpdateRequest,
    SettingCreateRequest,
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


def _parse_effects(raw: object) -> list[dict]:
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


def _seat_combat_fields(character: Character | None) -> dict:
    if character is None:
        return {
            "ac": None,
            "speed": None,
            "inspiration": False,
            "conditions": [],
            "effects": [],
            "concentration": None,
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
        "effects": _parse_effects(combat.get("effects")),
        "concentration": _parse_concentration(combat.get("concentration")),
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


class LobbyService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lobbies = LobbyRepository(db)
        self.characters = CharacterRepository(db)

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

    def get_setting(self, user: User, setting_id: UUID) -> SettingSummary:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_view(lobby, user)
        return SettingSummary.model_validate(setting)

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
                    companions=[SeatCompanionOut(**c) for c in extras["companions"]],
                    passive_perception=extras["passive_perception"],
                    passive_insight=extras["passive_insight"],
                    passive_investigation=extras["passive_investigation"],
                    seated_at=seat.seated_at,
                )
            )
        members = [_member_out(m, char_map.get(m.character_id)) for m in lobby.members]
        return SessionDetail(
            id=session.id,
            lobby_id=lobby.id,
            lobby_name=lobby.name,
            setting_id=session.setting_id,
            setting_name=session.setting.name if session.setting else None,
            name=session.name,
            is_owner=lobby.owner_id == user.id,
            seats=seats,
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
            caster_id = str(character_id)
            seat_ids = [s.character_id for s in session.seats]
            char_map = self.lobbies.get_characters_map(seat_ids)
            for other_id, other in char_map.items():
                if other is None or str(other_id) == caster_id:
                    continue
                other_sheet = dict(other.sheet or {})
                other_combat = dict(other_sheet.get("combat") or {})
                effects = _parse_effects(other_combat.get("effects"))
                kept = [
                    e
                    for e in effects
                    if not (
                        e.get("linked_concentration")
                        and e.get("source_character_id") == caster_id
                    )
                ]
                if len(kept) == len(effects):
                    continue
                other_combat["effects"] = kept
                other_sheet["combat"] = other_combat
                other.sheet = other_sheet
                other.sheet_version = int(other.sheet_version or 1) + 1
                flag_modified(other, "sheet")

        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await session_hub.broadcast(
            session.id,
            {"type": "session_update", "session": detail.model_dump(mode="json")},
        )
        return detail

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
