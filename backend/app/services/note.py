from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.models.note import Note
from app.models.user import User
from app.realtime.hub import lobby_hub
from app.repositories.lobby import LobbyRepository
from app.repositories.note import NoteRepository
from app.schemas.note import NoteCreateRequest, NoteOut, NotesExportOut, NoteUpdateRequest
from app.services import lobby_roles as roles

NOTE_SCOPES = frozenset({"personal", "party", "master"})

_SCOPE_EXPORT_HEADERS = {
    "personal": "Личные",
    "party": "Общая доска",
    "master": "Блокнот мастера",
}


class NoteService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.notes = NoteRepository(db)
        self.lobbies = LobbyRepository(db)

    def _require_lobby(self, lobby_id: UUID, user: User):
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        roles.require_view(self.db, lobby, user)
        return lobby

    def _journal_mgr(self, lobby, user: User) -> bool:
        return roles.can_manage_journal(self.db, lobby, user)

    def _can_edit(self, note: Note, user: User, lobby) -> bool:
        if note.scope == "party":
            return roles.can_act_on_board(self.db, lobby, user)
        if note.scope == "master":
            return self._journal_mgr(lobby, user)
        # personal — только автор
        return note.author_user_id == user.id

    def _can_delete(self, note: Note, user: User, lobby) -> bool:
        if note.author_user_id == user.id:
            return True
        if note.scope in {"party", "master"} and self._journal_mgr(lobby, user):
            return True
        return False

    def _can_pin(self, note: Note, user: User, lobby) -> bool:
        if note.scope != "party":
            return False
        return self._can_delete(note, user, lobby)

    def _user_display(self, user_id: UUID | None) -> str | None:
        if user_id is None:
            return None
        row = self.db.get(User, user_id)
        if row is None:
            return None
        return row.display_name or row.login or row.email

    def _out(self, note: Note, user: User, lobby) -> NoteOut:
        journal_mgr = self._journal_mgr(lobby, user)
        can_edit = self._can_edit(note, user, lobby)
        can_delete = self._can_delete(note, user, lobby)
        return NoteOut(
            id=note.id,
            lobby_id=note.lobby_id,
            scope=note.scope,
            author_user_id=note.author_user_id,
            character_id=note.character_id,
            character_name=note.character_name,
            title=note.title,
            body=note.body,
            shared_with_master=bool(note.shared_with_master),
            pinned=bool(note.pinned),
            updated_by_user_id=note.updated_by_user_id,
            updated_by_name=self._user_display(note.updated_by_user_id or note.author_user_id),
            created_at=note.created_at,
            updated_at=note.updated_at,
            can_edit=can_edit,
            can_delete=can_delete,
            can_pin=self._can_pin(note, user, lobby),
            can_share_with_master=note.scope == "personal" and note.author_user_id == user.id,
            can_send_to_journal=note.scope == "party" and journal_mgr,
        )

    def _is_visible(self, note: Note, user: User, lobby) -> bool:
        if note.author_user_id == user.id:
            return True
        if note.scope == "party":
            return True
        if note.scope == "master":
            return self._journal_mgr(lobby, user)
        if note.scope == "personal" and note.shared_with_master:
            return self._journal_mgr(lobby, user)
        return False

    def _character_label(
        self,
        lobby_id: UUID,
        user: User,
        character_id: UUID | None,
    ) -> tuple[UUID | None, str | None]:
        """Опциональная подпись персонажа; доступ не проверяет (владение — author+lobby)."""
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
            return None, None
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
        journal_mgr = self._journal_mgr(lobby, user)
        if scope and scope not in NOTE_SCOPES:
            raise AppError("Неизвестный scope", code="scope_invalid", status_code=400)
        notes = self.notes.list_visible(
            lobby_id,
            user_id=user.id,
            can_manage_journal=journal_mgr,
            scope=scope,
        )
        return [self._out(n, user, lobby) for n in notes]

    async def create_note(
        self,
        user: User,
        lobby_id: UUID,
        payload: NoteCreateRequest,
    ) -> NoteOut:
        lobby = self._require_lobby(lobby_id, user)
        roles.require_can_act_on_board(self.db, lobby, user)
        journal_mgr = self._journal_mgr(lobby, user)
        scope = (payload.scope or "personal").strip().lower()
        if scope not in NOTE_SCOPES:
            raise AppError("Неизвестный scope", code="scope_invalid", status_code=400)
        if scope == "master" and not journal_mgr:
            raise AppError(
                "Только владелец или сомастер пишет мастерские заметки",
                code="forbidden",
                status_code=403,
            )

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
            # L-05: character_id больше не обязателен; владение — author_user_id + lobby_id.

        pinned = bool(payload.pinned) if scope == "party" and payload.pinned else False

        note = Note(
            lobby_id=lobby_id,
            scope=scope,
            author_user_id=user.id,
            character_id=character_id,
            character_name=character_name,
            title=title,
            body=body,
            shared_with_master=False,
            pinned=pinned,
            updated_by_user_id=user.id,
        )
        self.notes.add(note)
        self.db.commit()
        self.db.refresh(note)
        out = self._out(note, user, lobby)
        await lobby_hub.broadcast(lobby_id, {"type": "notes_changed"})
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
        if not self._is_visible(note, user, lobby):
            raise NotFoundError("Заметка не найдена", code="note_not_found")

        # shared_with_master — только автор личной
        if payload.shared_with_master is not None:
            if note.scope != "personal" or note.author_user_id != user.id:
                raise AppError(
                    "Только автор личной заметки может показать её мастеру",
                    code="forbidden",
                    status_code=403,
                )

        # pinned — автор или journal mgr, только party
        if payload.pinned is not None:
            if not self._can_pin(note, user, lobby):
                raise AppError("Нельзя закрепить эту заметку", code="forbidden", status_code=403)

        content_change = payload.title is not None or payload.body is not None
        if content_change and not self._can_edit(note, user, lobby):
            raise AppError("Нельзя править эту заметку", code="forbidden", status_code=403)

        if (
            payload.shared_with_master is None
            and payload.pinned is None
            and not content_change
        ):
            raise AppError("Нечего обновлять", code="empty_patch", status_code=400)

        if content_change and payload.updated_at is not None:
            known = payload.updated_at
            if known.tzinfo is None:
                known = known.replace(tzinfo=timezone.utc)
            server = note.updated_at
            if server.tzinfo is None:
                server = server.replace(tzinfo=timezone.utc)
            if (server - known).total_seconds() > 0.001:
                raise ConflictError(
                    "Запись изменилась, обновить?",
                    code="note_conflict",
                )

        if payload.title is not None:
            note.title = payload.title.strip()
        if payload.body is not None:
            note.body = payload.body
        if payload.shared_with_master is not None:
            note.shared_with_master = bool(payload.shared_with_master)
        if payload.pinned is not None:
            note.pinned = bool(payload.pinned)

        if content_change:
            if not note.title and not (note.body or "").strip():
                raise AppError("Пустая заметка", code="empty_note", status_code=400)
            note.updated_by_user_id = user.id
            # bump updated_at even if onupdate missed (SQLite tests)
            note.updated_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(note)
        out = self._out(note, user, lobby)
        await lobby_hub.broadcast(note.lobby_id, {"type": "notes_changed"})
        return out

    async def delete_note(self, user: User, note_id: UUID) -> None:
        note = self.notes.get(note_id)
        if note is None:
            raise NotFoundError("Заметка не найдена", code="note_not_found")
        lobby = self._require_lobby(note.lobby_id, user)
        if not self._is_visible(note, user, lobby):
            raise NotFoundError("Заметка не найдена", code="note_not_found")
        if not self._can_delete(note, user, lobby):
            raise AppError("Нельзя удалить эту заметку", code="forbidden", status_code=403)
        lobby_id = note.lobby_id
        self.notes.delete(note)
        self.db.commit()
        await lobby_hub.broadcast(lobby_id, {"type": "notes_changed"})

    def export_notes(self, user: User, lobby_id: UUID) -> NotesExportOut:
        lobby = self._require_lobby(lobby_id, user)
        journal_mgr = self._journal_mgr(lobby, user)
        notes = self.notes.list_for_export(
            lobby_id,
            user_id=user.id,
            can_manage_journal=journal_mgr,
        )
        lobby_name = getattr(lobby, "name", None) or "лобби"
        safe_name = "".join(c if c.isalnum() or c in "._- " else "_" for c in lobby_name).strip()
        filename = f"zametki-{safe_name or 'lobby'}.md"

        by_scope: dict[str, list[Note]] = {"personal": [], "party": [], "master": []}
        for note in notes:
            if note.scope in by_scope:
                by_scope[note.scope].append(note)

        lines: list[str] = [f"# Заметки — {lobby_name}", ""]
        for scope_key in ("personal", "party", "master"):
            bucket = by_scope[scope_key]
            if not bucket:
                continue
            header = _SCOPE_EXPORT_HEADERS[scope_key]
            if scope_key == "personal" and journal_mgr:
                # Разделим свои и чужие открытые
                own = [n for n in bucket if n.author_user_id == user.id]
                shared = [n for n in bucket if n.author_user_id != user.id]
                if own:
                    lines.append(f"## {header}")
                    lines.append("")
                    for n in own:
                        lines.extend(self._export_note_lines(n))
                if shared:
                    lines.append("## Чужие личные (показаны мастеру)")
                    lines.append("")
                    for n in shared:
                        lines.extend(self._export_note_lines(n, with_author=True))
            else:
                lines.append(f"## {header}")
                lines.append("")
                for n in bucket:
                    lines.extend(
                        self._export_note_lines(
                            n,
                            with_author=scope_key == "party",
                        )
                    )
        if len(lines) <= 2:
            lines.append("(пусто)")
            lines.append("")
        return NotesExportOut(filename=filename, content="\n".join(lines).rstrip() + "\n")

    def _export_note_lines(self, note: Note, *, with_author: bool = False) -> list[str]:
        lines = [f"### {note.title or 'Без названия'}"]
        meta: list[str] = []
        if note.pinned:
            meta.append("закреплено")
        if with_author:
            name = self._user_display(note.updated_by_user_id or note.author_user_id)
            if name:
                meta.append(name)
        if note.updated_at:
            meta.append(note.updated_at.isoformat())
        if meta:
            lines.append(f"*{' · '.join(meta)}*")
        if note.body:
            lines.append("")
            lines.append(note.body)
        lines.append("")
        return lines
