from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.chat import ChatMessage, MasterLetter, MasterLetterMessage
from app.models.user import User
from app.realtime.hub import lobby_hub
from app.repositories.chat import ChatRepository
from app.repositories.lobby import LobbyRepository
from app.schemas.chat import (
    ChatChannelCreateRequest,
    ChatChannelOut,
    ChatMessageCreateRequest,
    ChatMessageOut,
    MasterLetterBadgeOut,
    MasterLetterCreateRequest,
    MasterLetterMessageOut,
    MasterLetterOut,
    MasterLetterReplyRequest,
    MasterLetterSummary,
)


class ChatService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.chats = ChatRepository(db)
        self.lobbies = LobbyRepository(db)

    def _require_lobby_view(self, lobby_id: UUID, user: User):
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        if lobby.owner_id != user.id and not any(m.user_id == user.id for m in lobby.members):
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        return lobby

    def _member_character_label(
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
            raise AppError(
                "Нельзя писать от чужого персонажа",
                code="forbidden",
                status_code=403,
            )
        char_map = self.lobbies.get_characters_map([character_id])
        character = char_map.get(character_id)
        return character_id, character.name if character else "Персонаж"

    def list_channels(self, user: User, lobby_id: UUID) -> list[ChatChannelOut]:
        self._require_lobby_view(lobby_id, user)
        channels = self.chats.list_channels(lobby_id)
        return [
            ChatChannelOut(
                id=ch.id,
                lobby_id=ch.lobby_id,
                name=ch.name,
                created_by_user_id=ch.created_by_user_id,
                created_at=ch.created_at,
                message_count=self.chats.count_messages(ch.id),
            )
            for ch in channels
        ]

    def create_channel(
        self,
        user: User,
        lobby_id: UUID,
        payload: ChatChannelCreateRequest,
    ) -> ChatChannelOut:
        self._require_lobby_view(lobby_id, user)
        name = payload.name.strip()
        if not name:
            raise AppError("Укажите название канала", code="name_required", status_code=400)
        channel = self.chats.create_channel(lobby_id=lobby_id, name=name, user_id=user.id)
        self.db.commit()
        self.db.refresh(channel)
        out = ChatChannelOut(
            id=channel.id,
            lobby_id=channel.lobby_id,
            name=channel.name,
            created_by_user_id=channel.created_by_user_id,
            created_at=channel.created_at,
            message_count=0,
        )
        return out

    def list_messages(
        self,
        user: User,
        channel_id: UUID,
        *,
        limit: int = 50,
    ) -> list[ChatMessageOut]:
        channel = self.chats.get_channel(channel_id)
        if channel is None:
            raise NotFoundError("Канал не найден", code="channel_not_found")
        self._require_lobby_view(channel.lobby_id, user)
        limit = max(1, min(limit, 100))
        messages = self.chats.list_messages(channel_id, limit=limit)
        return [ChatMessageOut.model_validate(m) for m in messages]

    async def post_message(
        self,
        user: User,
        channel_id: UUID,
        payload: ChatMessageCreateRequest,
    ) -> ChatMessageOut:
        channel = self.chats.get_channel(channel_id)
        if channel is None:
            raise NotFoundError("Канал не найден", code="channel_not_found")
        lobby = self._require_lobby_view(channel.lobby_id, user)
        body = payload.body.strip()
        if not body:
            raise AppError("Пустое сообщение", code="empty_message", status_code=400)

        character_id, character_name = None, None
        if lobby.owner_id == user.id and payload.character_id is None:
            character_name = "Мастер"
        else:
            character_id, character_name = self._member_character_label(
                channel.lobby_id,
                user,
                payload.character_id,
            )
            if character_name is None and lobby.owner_id == user.id:
                character_name = "Мастер"

        message = ChatMessage(
            channel_id=channel.id,
            author_user_id=user.id,
            character_id=character_id,
            character_name=character_name,
            body=body,
        )
        self.chats.add_message(message)
        self.db.commit()
        self.db.refresh(message)
        out = ChatMessageOut.model_validate(message)
        await lobby_hub.broadcast(
            channel.lobby_id,
            {"type": "chat_message", "message": out.model_dump(mode="json")},
        )
        return out

    def _letter_summary(self, letter: MasterLetter, preview: str = "") -> MasterLetterSummary:
        if not preview and letter.messages:
            preview = letter.messages[-1].body[:120]
        return MasterLetterSummary(
            id=letter.id,
            lobby_id=letter.lobby_id,
            character_id=letter.character_id,
            character_name=letter.character_name,
            subject=letter.subject,
            status=letter.status,
            last_message_at=letter.last_message_at,
            preview=preview,
        )

    def _letter_out(self, letter: MasterLetter) -> MasterLetterOut:
        return MasterLetterOut(
            id=letter.id,
            lobby_id=letter.lobby_id,
            author_user_id=letter.author_user_id,
            character_id=letter.character_id,
            character_name=letter.character_name,
            subject=letter.subject,
            status=letter.status,
            created_at=letter.created_at,
            updated_at=letter.updated_at,
            last_message_at=letter.last_message_at,
            messages=[MasterLetterMessageOut.model_validate(m) for m in letter.messages],
        )

    def list_letters(self, user: User, lobby_id: UUID) -> list[MasterLetterSummary]:
        lobby = self._require_lobby_view(lobby_id, user)
        if lobby.owner_id == user.id:
            letters = self.chats.list_letters_for_lobby(lobby_id)
        else:
            letters = self.chats.list_letters_for_user(lobby_id, user.id)
        out: list[MasterLetterSummary] = []
        for letter in letters:
            full = self.chats.get_letter(letter.id)
            preview = ""
            if full and full.messages:
                preview = full.messages[-1].body[:120]
            out.append(self._letter_summary(letter, preview))
        return out

    def letter_badge(self, user: User, lobby_id: UUID) -> MasterLetterBadgeOut:
        lobby = self._require_lobby_view(lobby_id, user)
        if lobby.owner_id != user.id:
            return MasterLetterBadgeOut(count=0, items=[])
        waiting = self.chats.list_waiting_master(lobby_id)
        items: list[MasterLetterSummary] = []
        for letter in waiting:
            full = self.chats.get_letter(letter.id)
            preview = full.messages[-1].body[:120] if full and full.messages else ""
            items.append(self._letter_summary(letter, preview))
        return MasterLetterBadgeOut(count=len(items), items=items)

    def get_letter(self, user: User, letter_id: UUID) -> MasterLetterOut:
        letter = self.chats.get_letter(letter_id)
        if letter is None:
            raise NotFoundError("Письмо не найдено", code="letter_not_found")
        lobby = self._require_lobby_view(letter.lobby_id, user)
        if lobby.owner_id != user.id and letter.author_user_id != user.id:
            raise AppError("Нет доступа к письму", code="forbidden", status_code=403)
        return self._letter_out(letter)

    async def create_letter(
        self,
        user: User,
        lobby_id: UUID,
        payload: MasterLetterCreateRequest,
    ) -> MasterLetterOut:
        lobby = self._require_lobby_view(lobby_id, user)
        if lobby.owner_id == user.id:
            raise AppError(
                "Мастер не пишет письмо сам себе — ответьте в тикете",
                code="master_cannot_create_letter",
                status_code=400,
            )
        character_id, character_name = self._member_character_label(
            lobby_id,
            user,
            payload.character_id,
        )
        if character_name is None:
            raise AppError(
                "Нужен персонаж в лобби, чтобы писать мастеру",
                code="character_required",
                status_code=400,
            )
        now = datetime.now(timezone.utc)
        letter = MasterLetter(
            lobby_id=lobby_id,
            author_user_id=user.id,
            character_id=character_id,
            character_name=character_name,
            subject=payload.subject.strip(),
            status="waiting_master",
            last_message_at=now,
        )
        self.chats.add_letter(letter)
        msg = MasterLetterMessage(
            letter_id=letter.id,
            author_user_id=user.id,
            is_master=False,
            body=payload.body.strip(),
        )
        self.chats.add_letter_message(msg)
        self.db.commit()
        letter = self.chats.get_letter(letter.id)
        assert letter is not None
        out = self._letter_out(letter)
        await lobby_hub.broadcast(
            lobby_id,
            {
                "type": "master_letter",
                "letter": self._letter_summary(letter, payload.body.strip()[:120]).model_dump(
                    mode="json"
                ),
            },
        )
        return out

    async def reply_letter(
        self,
        user: User,
        letter_id: UUID,
        payload: MasterLetterReplyRequest,
    ) -> MasterLetterOut:
        letter = self.chats.get_letter(letter_id)
        if letter is None:
            raise NotFoundError("Письмо не найдено", code="letter_not_found")
        lobby = self._require_lobby_view(letter.lobby_id, user)
        is_master = lobby.owner_id == user.id
        is_author = letter.author_user_id == user.id
        if not is_master and not is_author:
            raise AppError("Нет доступа к письму", code="forbidden", status_code=403)
        if letter.status == "closed":
            raise AppError("Письмо закрыто", code="letter_closed", status_code=400)

        body = payload.body.strip()
        if not body:
            raise AppError("Пустое сообщение", code="empty_message", status_code=400)

        msg = MasterLetterMessage(
            letter_id=letter.id,
            author_user_id=user.id,
            is_master=is_master,
            body=body,
        )
        self.chats.add_letter_message(msg)
        letter.last_message_at = datetime.now(timezone.utc)
        letter.status = "waiting_player" if is_master else "waiting_master"
        self.db.commit()
        letter = self.chats.get_letter(letter_id)
        assert letter is not None
        out = self._letter_out(letter)
        await lobby_hub.broadcast(
            letter.lobby_id,
            {
                "type": "master_letter_message",
                "letter_id": str(letter.id),
                "message": MasterLetterMessageOut.model_validate(msg).model_dump(mode="json"),
                "status": letter.status,
            },
        )
        return out

    def close_letter(self, user: User, letter_id: UUID) -> MasterLetterOut:
        letter = self.chats.get_letter(letter_id)
        if letter is None:
            raise NotFoundError("Письмо не найдено", code="letter_not_found")
        lobby = self._require_lobby_view(letter.lobby_id, user)
        if lobby.owner_id != user.id and letter.author_user_id != user.id:
            raise AppError("Нет доступа к письму", code="forbidden", status_code=403)
        letter.status = "closed"
        self.db.commit()
        letter = self.chats.get_letter(letter_id)
        assert letter is not None
        return self._letter_out(letter)
