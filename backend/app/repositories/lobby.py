from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.character import Character
from app.models.lobby import (
    Lobby,
    LobbyMember,
    PlaySession,
    SessionSeat,
    Setting,
    generate_invite_code,
)


class LobbyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, lobby_id: UUID) -> Lobby | None:
        return self.db.scalar(
            select(Lobby)
            .where(Lobby.id == lobby_id)
            .options(
                selectinload(Lobby.members),
                selectinload(Lobby.settings),
                selectinload(Lobby.sessions).selectinload(PlaySession.seats),
                selectinload(Lobby.sessions).selectinload(PlaySession.setting),
            )
        )

    def get_by_invite_code(self, code: str) -> Lobby | None:
        return self.db.scalar(select(Lobby).where(Lobby.invite_code == code.upper()))

    def list_for_user(self, user_id: UUID) -> list[Lobby]:
        member_lobby_ids = select(LobbyMember.lobby_id).where(LobbyMember.user_id == user_id)
        return list(
            self.db.scalars(
                select(Lobby)
                .where(or_(Lobby.owner_id == user_id, Lobby.id.in_(member_lobby_ids)))
                .options(selectinload(Lobby.members))
                .order_by(Lobby.updated_at.desc())
            ).all()
        )

    def create(self, *, owner_id: UUID, name: str) -> Lobby:
        code = generate_invite_code()
        # редкий коллизионный ретрай
        for _ in range(8):
            exists = self.db.scalar(select(Lobby.id).where(Lobby.invite_code == code))
            if exists is None:
                break
            code = generate_invite_code()
        lobby = Lobby(owner_id=owner_id, name=name, invite_code=code)
        self.db.add(lobby)
        self.db.flush()
        return lobby

    def get_member(self, lobby_id: UUID, character_id: UUID) -> LobbyMember | None:
        return self.db.scalar(
            select(LobbyMember).where(
                LobbyMember.lobby_id == lobby_id,
                LobbyMember.character_id == character_id,
            )
        )

    def add_member(
        self,
        *,
        lobby_id: UUID,
        character_id: UUID,
        user_id: UUID,
    ) -> LobbyMember:
        member = LobbyMember(
            lobby_id=lobby_id,
            character_id=character_id,
            user_id=user_id,
        )
        self.db.add(member)
        self.db.flush()
        return member

    def remove_member(self, member: LobbyMember) -> None:
        self.db.delete(member)
        self.db.flush()

    def get_setting(self, setting_id: UUID) -> Setting | None:
        return self.db.scalar(select(Setting).where(Setting.id == setting_id))

    def create_setting(self, *, lobby_id: UUID, name: str, world_notes: str) -> Setting:
        setting = Setting(lobby_id=lobby_id, name=name, world_notes=world_notes)
        self.db.add(setting)
        self.db.flush()
        return setting

    def delete_setting(self, setting: Setting) -> None:
        self.db.delete(setting)
        self.db.flush()

    def get_session(self, session_id: UUID) -> PlaySession | None:
        return self.db.scalar(
            select(PlaySession)
            .where(PlaySession.id == session_id)
            .options(
                selectinload(PlaySession.seats),
                selectinload(PlaySession.setting),
                selectinload(PlaySession.lobby).selectinload(Lobby.members),
            )
        )

    def create_session(
        self,
        *,
        lobby_id: UUID,
        name: str,
        setting_id: UUID | None,
    ) -> PlaySession:
        session = PlaySession(lobby_id=lobby_id, name=name, setting_id=setting_id)
        self.db.add(session)
        self.db.flush()
        return session

    def delete_session(self, session: PlaySession) -> None:
        self.db.delete(session)
        self.db.flush()

    def get_seat(self, session_id: UUID, character_id: UUID) -> SessionSeat | None:
        return self.db.scalar(
            select(SessionSeat).where(
                SessionSeat.session_id == session_id,
                SessionSeat.character_id == character_id,
            )
        )

    def add_seat(self, *, session_id: UUID, character_id: UUID) -> SessionSeat:
        seat = SessionSeat(session_id=session_id, character_id=character_id)
        self.db.add(seat)
        self.db.flush()
        return seat

    def remove_seat(self, seat: SessionSeat) -> None:
        self.db.delete(seat)
        self.db.flush()

    def get_characters_map(self, character_ids: list[UUID]) -> dict[UUID, Character]:
        if not character_ids:
            return {}
        rows = self.db.scalars(
            select(Character).where(
                Character.id.in_(character_ids),
                Character.deleted_at.is_(None),
            )
        ).all()
        return {row.id: row for row in rows}

    def delete_lobby(self, lobby: Lobby) -> None:
        self.db.delete(lobby)
        self.db.flush()
