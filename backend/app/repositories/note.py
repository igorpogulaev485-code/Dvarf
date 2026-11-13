from __future__ import annotations

from uuid import UUID

from sqlalchemy import and_, or_, select
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
        can_manage_journal: bool,
        scope: str | None = None,
    ) -> list[Note]:
        """Видимость L-05: чужие personal скрыты, кроме shared_with_master для journal mgr."""
        stmt = select(Note).where(Note.lobby_id == lobby_id)
        if scope:
            stmt = stmt.where(Note.scope == scope)

        own = Note.author_user_id == user_id
        party = Note.scope == "party"
        if can_manage_journal:
            master_block = Note.scope == "master"
            shared_personal = and_(
                Note.scope == "personal",
                Note.shared_with_master.is_(True),
            )
            stmt = stmt.where(or_(own, party, master_block, shared_personal))
        else:
            stmt = stmt.where(or_(own, party))
            stmt = stmt.where(Note.scope != "master")

        stmt = stmt.order_by(Note.pinned.desc(), Note.updated_at.desc())
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

    def list_personal_for_author(self, lobby_id: UUID, user_id: UUID) -> list[Note]:
        """Личные заметки автора в лобби (ключ возврата — author + lobby, без character_id)."""
        return list(
            self.db.scalars(
                select(Note)
                .where(
                    Note.lobby_id == lobby_id,
                    Note.author_user_id == user_id,
                    Note.scope == "personal",
                )
                .order_by(Note.updated_at.desc())
            ).all()
        )

    def list_for_export(
        self,
        lobby_id: UUID,
        *,
        user_id: UUID,
        can_manage_journal: bool,
    ) -> list[Note]:
        """Те же правила видимости, что list_visible, для текстового экспорта."""
        return self.list_visible(
            lobby_id,
            user_id=user_id,
            can_manage_journal=can_manage_journal,
            scope=None,
        )

    def delete_personal_for_author(self, lobby_id: UUID, user_id: UUID) -> int:
        notes = self.list_personal_for_author(lobby_id, user_id)
        for note in notes:
            self.db.delete(note)
        if notes:
            self.db.flush()
        return len(notes)
