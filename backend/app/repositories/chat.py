from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.chat import (
    ChatChannel,
    ChatMessage,
    ChatReadCursor,
    MasterLetter,
    MasterLetterMessage,
    WhisperMessage,
    WhisperThread,
)


class ChatRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_channels(self, lobby_id: UUID) -> list[ChatChannel]:
        return list(
            self.db.scalars(
                select(ChatChannel)
                .where(ChatChannel.lobby_id == lobby_id)
                .order_by(ChatChannel.created_at.asc())
            ).all()
        )

    def get_channel(self, channel_id: UUID) -> ChatChannel | None:
        return self.db.scalar(select(ChatChannel).where(ChatChannel.id == channel_id))

    def create_channel(self, *, lobby_id: UUID, name: str, user_id: UUID) -> ChatChannel:
        channel = ChatChannel(lobby_id=lobby_id, name=name, created_by_user_id=user_id)
        self.db.add(channel)
        self.db.flush()
        return channel

    def count_messages(self, channel_id: UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(ChatMessage)
                .where(ChatMessage.channel_id == channel_id)
            )
            or 0
        )

    def count_unread_channel_messages(
        self,
        channel_id: UUID,
        *,
        user_id: UUID,
        since: datetime | None,
    ) -> int:
        stmt = select(func.count()).select_from(ChatMessage).where(
            ChatMessage.channel_id == channel_id,
            ChatMessage.author_user_id.is_distinct_from(user_id),
        )
        if since is not None:
            stmt = stmt.where(ChatMessage.created_at > since)
        return int(self.db.scalar(stmt) or 0)

    def list_messages(
        self,
        channel_id: UUID,
        *,
        limit: int = 50,
        before: datetime | None = None,
    ) -> list[ChatMessage]:
        stmt = select(ChatMessage).where(ChatMessage.channel_id == channel_id)
        if before is not None:
            stmt = stmt.where(ChatMessage.created_at < before)
        stmt = stmt.order_by(ChatMessage.created_at.desc()).limit(limit)
        rows = list(self.db.scalars(stmt).all())
        rows.reverse()
        return rows

    def add_message(self, message: ChatMessage) -> ChatMessage:
        self.db.add(message)
        self.db.flush()
        return message

    def list_letters_for_lobby(self, lobby_id: UUID) -> list[MasterLetter]:
        return list(
            self.db.scalars(
                select(MasterLetter)
                .where(MasterLetter.lobby_id == lobby_id)
                .order_by(MasterLetter.last_message_at.desc())
            ).all()
        )

    def list_letters_for_user(self, lobby_id: UUID, user_id: UUID) -> list[MasterLetter]:
        return list(
            self.db.scalars(
                select(MasterLetter)
                .where(
                    MasterLetter.lobby_id == lobby_id,
                    MasterLetter.author_user_id == user_id,
                )
                .order_by(MasterLetter.last_message_at.desc())
            ).all()
        )

    def list_waiting_master(self, lobby_id: UUID) -> list[MasterLetter]:
        return list(
            self.db.scalars(
                select(MasterLetter)
                .where(
                    MasterLetter.lobby_id == lobby_id,
                    MasterLetter.status == "waiting_master",
                )
                .order_by(MasterLetter.last_message_at.desc())
            ).all()
        )

    def get_letter(self, letter_id: UUID) -> MasterLetter | None:
        return self.db.scalar(
            select(MasterLetter)
            .where(MasterLetter.id == letter_id)
            .options(selectinload(MasterLetter.messages))
        )

    def add_letter(self, letter: MasterLetter) -> MasterLetter:
        self.db.add(letter)
        self.db.flush()
        return letter

    def add_letter_message(self, message: MasterLetterMessage) -> MasterLetterMessage:
        self.db.add(message)
        self.db.flush()
        return message

    def get_whisper_thread(self, thread_id: UUID) -> WhisperThread | None:
        return self.db.scalar(
            select(WhisperThread)
            .where(WhisperThread.id == thread_id)
            .options(selectinload(WhisperThread.messages))
        )

    def get_whisper_thread_by_pair(
        self,
        lobby_id: UUID,
        user_low_id: UUID,
        user_high_id: UUID,
    ) -> WhisperThread | None:
        return self.db.scalar(
            select(WhisperThread).where(
                WhisperThread.lobby_id == lobby_id,
                WhisperThread.user_low_id == user_low_id,
                WhisperThread.user_high_id == user_high_id,
            )
        )

    def list_whisper_threads_for_user(
        self,
        lobby_id: UUID,
        user_id: UUID,
    ) -> list[WhisperThread]:
        return list(
            self.db.scalars(
                select(WhisperThread)
                .where(
                    WhisperThread.lobby_id == lobby_id,
                    or_(
                        WhisperThread.user_low_id == user_id,
                        WhisperThread.user_high_id == user_id,
                    ),
                )
                .order_by(WhisperThread.last_message_at.desc())
            ).all()
        )

    def list_whisper_threads_for_lobby(self, lobby_id: UUID) -> list[WhisperThread]:
        return list(
            self.db.scalars(
                select(WhisperThread)
                .where(WhisperThread.lobby_id == lobby_id)
                .order_by(WhisperThread.last_message_at.desc())
            ).all()
        )

    def create_whisper_thread(
        self,
        *,
        lobby_id: UUID,
        user_low_id: UUID,
        user_high_id: UUID,
    ) -> WhisperThread:
        thread = WhisperThread(
            lobby_id=lobby_id,
            user_low_id=user_low_id,
            user_high_id=user_high_id,
        )
        self.db.add(thread)
        self.db.flush()
        return thread

    def list_whisper_messages(
        self,
        thread_id: UUID,
        *,
        limit: int = 50,
    ) -> list[WhisperMessage]:
        stmt = (
            select(WhisperMessage)
            .where(WhisperMessage.thread_id == thread_id)
            .order_by(WhisperMessage.created_at.desc())
            .limit(limit)
        )
        rows = list(self.db.scalars(stmt).all())
        rows.reverse()
        return rows

    def count_unread_whisper_messages(
        self,
        thread_id: UUID,
        *,
        user_id: UUID,
        since: datetime | None,
    ) -> int:
        stmt = select(func.count()).select_from(WhisperMessage).where(
            WhisperMessage.thread_id == thread_id,
            WhisperMessage.author_user_id.is_distinct_from(user_id),
        )
        if since is not None:
            stmt = stmt.where(WhisperMessage.created_at > since)
        return int(self.db.scalar(stmt) or 0)

    def add_whisper_message(self, message: WhisperMessage) -> WhisperMessage:
        self.db.add(message)
        self.db.flush()
        return message

    def get_read_cursor(
        self,
        *,
        user_id: UUID,
        target_kind: str,
        target_id: UUID,
    ) -> ChatReadCursor | None:
        return self.db.scalar(
            select(ChatReadCursor).where(
                ChatReadCursor.user_id == user_id,
                ChatReadCursor.target_kind == target_kind,
                ChatReadCursor.target_id == target_id,
            )
        )

    def upsert_read_cursor(
        self,
        *,
        lobby_id: UUID,
        user_id: UUID,
        target_kind: str,
        target_id: UUID,
        last_read_at: datetime,
    ) -> ChatReadCursor:
        row = self.get_read_cursor(
            user_id=user_id,
            target_kind=target_kind,
            target_id=target_id,
        )
        if row is None:
            row = ChatReadCursor(
                lobby_id=lobby_id,
                user_id=user_id,
                target_kind=target_kind,
                target_id=target_id,
                last_read_at=last_read_at,
            )
            self.db.add(row)
        else:
            row.last_read_at = last_read_at
            row.lobby_id = lobby_id
        self.db.flush()
        return row

    def list_read_cursors_for_user(
        self,
        lobby_id: UUID,
        user_id: UUID,
        *,
        target_kind: str | None = None,
    ) -> list[ChatReadCursor]:
        stmt = select(ChatReadCursor).where(
            ChatReadCursor.lobby_id == lobby_id,
            ChatReadCursor.user_id == user_id,
        )
        if target_kind is not None:
            stmt = stmt.where(ChatReadCursor.target_kind == target_kind)
        return list(self.db.scalars(stmt).all())

    def count_unread_letter_messages(
        self,
        letter_id: UUID,
        *,
        user_id: UUID,
        since: datetime | None,
    ) -> int:
        stmt = select(func.count()).select_from(MasterLetterMessage).where(
            MasterLetterMessage.letter_id == letter_id,
            MasterLetterMessage.author_user_id.is_distinct_from(user_id),
        )
        if since is not None:
            stmt = stmt.where(MasterLetterMessage.created_at > since)
        return int(self.db.scalar(stmt) or 0)

    def letter_has_unread_for_author(
        self,
        letter: MasterLetter,
        *,
        user_id: UUID,
        since: datetime | None,
    ) -> bool:
        if letter.author_user_id != user_id:
            return False
        if letter.status == "waiting_player":
            return True
        return self.count_unread_letter_messages(letter.id, user_id=user_id, since=since) > 0
