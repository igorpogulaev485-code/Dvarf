from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.chat import ChatChannel, ChatMessage, MasterLetter, MasterLetterMessage


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
