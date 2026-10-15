from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.note import Note


class NoteRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_visible(
        self,
        lobby_id: UUID,
        *,
        user_id: UUID,
        is_owner: bool,
        scope: str | None = None,
    ) -> list[Note]:
        stmt = select(Note).where(Note.lobby_id == lobby_id)
        if scope:
            stmt = stmt.where(Note.scope == scope)
        if is_owner:
            # мастер: всё
            pass
        else:
            stmt = stmt.where(
                or_(
                    Note.scope == "party",
                    Note.author_user_id == user_id,
                )
            )
            # игроки не видят master-заметки
            stmt = stmt.where(Note.scope != "master")
        stmt = stmt.order_by(Note.updated_at.desc())
        return list(self.db.scalars(stmt).all())

    def get(self, note_id: UUID) -> Note | None:
        return self.db.scalar(select(Note).where(Note.id == note_id))

    def add(self, note: Note) -> Note:
        self.db.add(note)
        self.db.flush()
        return note

    def delete(self, note: Note) -> None:
        self.db.delete(note)
        self.db.flush()
