from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.note import Note
from app.models.user import User
from app.realtime.hub import lobby_hub
from app.repositories.lobby import LobbyRepository
from app.repositories.note import NoteRepository
from app.schemas.note import NoteCreateRequest, NoteOut, NoteUpdateRequest

NOTE_SCOPES = frozenset({"personal", "party", "master"})


class NoteService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.notes = NoteRepository(db)
        self.lobbies = LobbyRepository(db)

    def _require_lobby(self, lobby_id: UUID, user: User):
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        if lobby.owner_id != user.id and not any(m.user_id == user.id for m in lobby.members):
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        return lobby

    def _can_edit(self, note: Note, user: User, is_owner: bool) -> bool:
        if is_owner and note.scope in {"party", "master"}:
            return True
        return note.author_user_id == user.id

    def _out(self, note: Note, user: User, is_owner: bool) -> NoteOut:
        return NoteOut(
            id=note.id,
            lobby_id=note.lobby_id,
            scope=note.scope,
            author_user_id=note.author_user_id,
            character_id=note.character_id,
            character_name=note.character_name,
            title=note.title,
            body=note.body,
            created_at=note.created_at,
            updated_at=note.updated_at,
            can_edit=self._can_edit(note, user, is_owner),
        )

    def _character_label(
        self,
        lobby_id: UUID,
        user: User,
        character_id: UUID | None,
    ) -> tuple[UUID | None, str | None]:
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            return None, None
        if character_id is None:
            for member in lobby.members:
                if member.user_id == user.id:
                    char_map = self.lobbies.get_characters_map([member.character_id])
                    character = char_map.get(member.character_id)
                    return member.character_id, character.name if character else "Персонаж"
            return None, None
        member = self.lobbies.get_member(lobby_id, character_id)
        if member is None or member.user_id != user.id:
            raise AppError("Чужой персонаж", code="forbidden", status_code=403)
        char_map = self.lobbies.get_characters_map([character_id])
        character = char_map.get(character_id)
        return character_id, character.name if character else "Персонаж"

    def list_notes(
        self,
        user: User,
        lobby_id: UUID,
        *,
        scope: str | None = None,
    ) -> list[NoteOut]:
        lobby = self._require_lobby(lobby_id, user)
        is_owner = lobby.owner_id == user.id
        if scope and scope not in NOTE_SCOPES:
            raise AppError("Неизвестный scope", code="scope_invalid", status_code=400)
        notes = self.notes.list_visible(
            lobby_id,
            user_id=user.id,
            is_owner=is_owner,
            scope=scope,
        )
        return [self._out(n, user, is_owner) for n in notes]

    async def create_note(
        self,
        user: User,
        lobby_id: UUID,
        payload: NoteCreateRequest,
    ) -> NoteOut:
        lobby = self._require_lobby(lobby_id, user)
        is_owner = lobby.owner_id == user.id
        scope = (payload.scope or "personal").strip().lower()
        if scope not in NOTE_SCOPES:
            raise AppError("Неизвестный scope", code="scope_invalid", status_code=400)
        if scope == "master" and not is_owner:
            raise AppError("Только мастер пишет мастерские заметки", code="forbidden", status_code=403)

        title = (payload.title or "").strip()
        body = payload.body or ""
        if not title and not body.strip():
            raise AppError("Пустая заметка", code="empty_note", status_code=400)

        character_id: UUID | None = None
        character_name: str | None = None
        if scope == "personal":
            character_id, character_name = self._character_label(
                lobby_id,
                user,
                payload.character_id,
            )
            if character_name is None and not is_owner:
                raise AppError(
                    "Нужен персонаж в лобби для личного блокнота",
                    code="character_required",
                    status_code=400,
                )
            if character_name is None and is_owner:
                character_name = "Мастер"

        note = Note(
            lobby_id=lobby_id,
            scope=scope,
            author_user_id=user.id,
            character_id=character_id,
            character_name=character_name,
            title=title,
            body=body,
        )
        self.notes.add(note)
        self.db.commit()
        self.db.refresh(note)
        out = self._out(note, user, is_owner)
        await lobby_hub.broadcast(
            lobby_id,
            {"type": "note_upsert", "note": out.model_dump(mode="json")},
        )
        return out

    async def update_note(
        self,
        user: User,
        note_id: UUID,
        payload: NoteUpdateRequest,
    ) -> NoteOut:
        note = self.notes.get(note_id)
        if note is None:
            raise NotFoundError("Заметка не найдена", code="note_not_found")
        lobby = self._require_lobby(note.lobby_id, user)
        is_owner = lobby.owner_id == user.id
        if not self._can_edit(note, user, is_owner):
            raise AppError("Нельзя править чужую заметку", code="forbidden", status_code=403)
        if payload.title is not None:
            note.title = payload.title.strip()
        if payload.body is not None:
            note.body = payload.body
        if not note.title and not (note.body or "").strip():
            raise AppError("Пустая заметка", code="empty_note", status_code=400)
        self.db.commit()
        self.db.refresh(note)
        out = self._out(note, user, is_owner)
        await lobby_hub.broadcast(
            note.lobby_id,
            {"type": "note_upsert", "note": out.model_dump(mode="json")},
        )
        return out

    async def delete_note(self, user: User, note_id: UUID) -> None:
        note = self.notes.get(note_id)
        if note is None:
            raise NotFoundError("Заметка не найдена", code="note_not_found")
        lobby = self._require_lobby(note.lobby_id, user)
        is_owner = lobby.owner_id == user.id
        if not self._can_edit(note, user, is_owner):
            raise AppError("Нельзя удалить чужую заметку", code="forbidden", status_code=403)
        lobby_id = note.lobby_id
        nid = note.id
        self.notes.delete(note)
        self.db.commit()
        await lobby_hub.broadcast(
            lobby_id,
            {"type": "note_delete", "note_id": str(nid)},
        )
