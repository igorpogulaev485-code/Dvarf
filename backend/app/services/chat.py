from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.chat import ChatMessage, MasterLetter, MasterLetterMessage, WhisperMessage
from app.models.lobby import Lobby
from app.models.user import User
from app.realtime.hub import lobby_hub
from app.repositories.chat import ChatRepository
from app.repositories.lobby import LobbyRepository
from app.schemas.chat import (
    ChatChannelCreateRequest,
    ChatChannelOut,
    ChatMessageCreateRequest,
    ChatMessageOut,
    ChatReadRequest,
    ChatsBadgeOut,
    MasterLetterBadgeOut,
    MasterLetterCreateRequest,
    MasterLetterMessageOut,
    MasterLetterOut,
    MasterLetterReplyRequest,
    MasterLetterSummary,
    WhisperCreateRequest,
    WhisperFactOut,
    WhisperMessageCreateRequest,
    WhisperMessageOut,
    WhisperPeerOut,
    WhisperThreadOut,
)
from app.services import lobby_roles as roles


def _ordered_pair(a: UUID, b: UUID) -> tuple[UUID, UUID]:
    return (a, b) if a.hex < b.hex else (b, a)


class ChatService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.chats = ChatRepository(db)
        self.lobbies = LobbyRepository(db)

    def _require_lobby_view(self, lobby_id: UUID, user: User):
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        roles.require_view(self.db, lobby, user)
        return lobby

    def _require_board_actor(self, lobby: Lobby, user: User) -> None:
        roles.require_can_act_on_board(self.db, lobby, user)

    def _is_letter_master(self, lobby: Lobby, user: User) -> bool:
        return roles.can_manage_journal(self.db, lobby, user)

    def _journal_manager_ids(self, lobby: Lobby) -> set[UUID]:
        ids: set[UUID] = {lobby.owner_id}
        for row in self.lobbies.list_roles(lobby.id):
            if row.role == "comaster":
                ids.add(row.user_id)
        return ids

    def _user_label(self, user_id: UUID, lobby: Lobby) -> str:
        for member in lobby.members:
            if member.user_id == user_id:
                char_map = self.lobbies.get_characters_map([member.character_id])
                character = char_map.get(member.character_id)
                if character is not None:
                    return character.name
        user = self.db.get(User, user_id)
        if user is None:
            return "Участник"
        return user.display_name or user.login or user.email or "Участник"

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

    def _peer_is_reachable(self, lobby: Lobby, peer_id: UUID) -> bool:
        if peer_id == lobby.owner_id:
            return True
        if any(m.user_id == peer_id for m in lobby.members):
            return True
        for row in self.lobbies.list_roles(lobby.id):
            if row.user_id == peer_id and row.role == "comaster":
                return True
        return False

    def _thread_peer_id(self, thread, user_id: UUID) -> UUID:
        if thread.user_low_id == user_id:
            return thread.user_high_id
        return thread.user_low_id

    def _is_thread_participant(self, thread, user_id: UUID) -> bool:
        return user_id in {thread.user_low_id, thread.user_high_id}

    def _is_player_player_thread(self, lobby: Lobby, thread) -> bool:
        managers = self._journal_manager_ids(lobby)
        return thread.user_low_id not in managers and thread.user_high_id not in managers

    def list_channels(self, user: User, lobby_id: UUID) -> list[ChatChannelOut]:
        self._require_lobby_view(lobby_id, user)
        channels = self.chats.list_channels(lobby_id)
        cursors = {
            c.target_id: c.last_read_at
            for c in self.chats.list_read_cursors_for_user(
                lobby_id, user.id, target_kind="channel"
            )
        }
        out: list[ChatChannelOut] = []
        for ch in channels:
            out.append(
                ChatChannelOut(
                    id=ch.id,
                    lobby_id=ch.lobby_id,
                    name=ch.name,
                    created_by_user_id=ch.created_by_user_id,
                    created_at=ch.created_at,
                    message_count=self.chats.count_messages(ch.id),
                )
            )
        # unread is exposed via chats_badge; keep channel payload stable
        _ = cursors
        return out

    def create_channel(
        self,
        user: User,
        lobby_id: UUID,
        payload: ChatChannelCreateRequest,
    ) -> ChatChannelOut:
        lobby = self._require_lobby_view(lobby_id, user)
        self._require_board_actor(lobby, user)
        name = payload.name.strip()
        if not name:
            raise AppError("Укажите название канала", code="name_required", status_code=400)
        channel = self.chats.create_channel(lobby_id=lobby_id, name=name, user_id=user.id)
        self.db.commit()
        self.db.refresh(channel)
        return ChatChannelOut(
            id=channel.id,
            lobby_id=channel.lobby_id,
            name=channel.name,
            created_by_user_id=channel.created_by_user_id,
            created_at=channel.created_at,
            message_count=0,
        )

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
        self._require_board_actor(lobby, user)
        body = payload.body.strip()
        if not body:
            raise AppError("Пустое сообщение", code="empty_message", status_code=400)

        character_id, character_name = None, None
        can_master = roles.can_edit_wiki(self.db, lobby, user)
        if can_master and payload.character_id is None:
            character_name = "Мастер"
        else:
            character_id, character_name = self._member_character_label(
                channel.lobby_id,
                user,
                payload.character_id,
            )
            if character_name is None and can_master:
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

    def _can_access_letter(self, lobby: Lobby, user: User, letter: MasterLetter) -> bool:
        if self._is_letter_master(lobby, user):
            return True
        return letter.author_user_id == user.id

    def list_letters(self, user: User, lobby_id: UUID) -> list[MasterLetterSummary]:
        lobby = self._require_lobby_view(lobby_id, user)
        if self._is_letter_master(lobby, user):
            letters = self.chats.list_letters_for_lobby(lobby_id)
        else:
            self._require_board_actor(lobby, user)
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
        if not self._is_letter_master(lobby, user):
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
        if self._is_letter_master(lobby, user):
            pass
        else:
            self._require_board_actor(lobby, user)
            if letter.author_user_id != user.id:
                raise AppError("Нет доступа к письму", code="forbidden", status_code=403)
        return self._letter_out(letter)

    async def create_letter(
        self,
        user: User,
        lobby_id: UUID,
        payload: MasterLetterCreateRequest,
    ) -> MasterLetterOut:
        lobby = self._require_lobby_view(lobby_id, user)
        self._require_board_actor(lobby, user)
        if self._is_letter_master(lobby, user):
            raise AppError(
                "Мастер не пишет письмо сам себе — ответьте в тикете или откройте шёпот",
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
        await lobby_hub.broadcast(lobby_id, {"type": "letters_changed"})
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
        is_master = self._is_letter_master(lobby, user)
        is_author = letter.author_user_id == user.id
        if not is_master and not is_author:
            raise AppError("Нет доступа к письму", code="forbidden", status_code=403)
        if not is_master:
            self._require_board_actor(lobby, user)
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
        await lobby_hub.broadcast(letter.lobby_id, {"type": "letters_changed"})
        return out

    async def close_letter(self, user: User, letter_id: UUID) -> MasterLetterOut:
        letter = self.chats.get_letter(letter_id)
        if letter is None:
            raise NotFoundError("Письмо не найдено", code="letter_not_found")
        lobby = self._require_lobby_view(letter.lobby_id, user)
        is_master = self._is_letter_master(lobby, user)
        is_author = letter.author_user_id == user.id
        if not is_master and not is_author:
            raise AppError("Нет доступа к письму", code="forbidden", status_code=403)
        if not is_master:
            self._require_board_actor(lobby, user)
        letter.status = "closed"
        self.db.commit()
        letter = self.chats.get_letter(letter_id)
        assert letter is not None
        await lobby_hub.broadcast(letter.lobby_id, {"type": "letters_changed"})
        return self._letter_out(letter)

    def list_whisper_peers(self, user: User, lobby_id: UUID) -> list[WhisperPeerOut]:
        lobby = self._require_lobby_view(lobby_id, user)
        self._require_board_actor(lobby, user)
        peers: dict[UUID, WhisperPeerOut] = {}
        managers = self._journal_manager_ids(lobby)
        for mid in managers:
            if mid == user.id:
                continue
            if mid == lobby.owner_id:
                label = "Мастер"
            else:
                label = f"Сомастер · {self._user_label(mid, lobby)}"
            peers[mid] = WhisperPeerOut(user_id=mid, label=label, is_master=True)
        for member in lobby.members:
            if member.user_id == user.id or member.user_id in managers:
                continue
            peers[member.user_id] = WhisperPeerOut(
                user_id=member.user_id,
                label=self._user_label(member.user_id, lobby),
                is_master=False,
            )
        return sorted(peers.values(), key=lambda p: (not p.is_master, p.label.lower()))

    def _thread_out(self, lobby: Lobby, thread, user: User) -> WhisperThreadOut:
        peer_id = self._thread_peer_id(thread, user.id)
        managers = self._journal_manager_ids(lobby)
        peer_is_master = peer_id in managers
        peer_label = "Мастер" if peer_id == lobby.owner_id else self._user_label(peer_id, lobby)
        if peer_is_master and peer_id != lobby.owner_id:
            peer_label = f"Сомастер · {peer_label}"
        cursor = self.chats.get_read_cursor(
            user_id=user.id,
            target_kind="whisper",
            target_id=thread.id,
        )
        unread = self.chats.count_unread_whisper_messages(
            thread.id,
            user_id=user.id,
            since=cursor.last_read_at if cursor else None,
        )
        return WhisperThreadOut(
            id=thread.id,
            lobby_id=thread.lobby_id,
            peer_user_id=peer_id,
            peer_label=peer_label,
            peer_is_master=peer_is_master,
            last_message_at=thread.last_message_at,
            unread_count=unread,
            created_at=thread.created_at,
        )

    def list_whispers(self, user: User, lobby_id: UUID) -> list[WhisperThreadOut]:
        lobby = self._require_lobby_view(lobby_id, user)
        self._require_board_actor(lobby, user)
        threads = self.chats.list_whisper_threads_for_user(lobby_id, user.id)
        return [self._thread_out(lobby, t, user) for t in threads]

    def list_whisper_facts(self, user: User, lobby_id: UUID) -> list[WhisperFactOut]:
        lobby = self._require_lobby_view(lobby_id, user)
        if not self._is_letter_master(lobby, user):
            raise AppError("Нет доступа к фактам шёпота", code="forbidden", status_code=403)
        out: list[WhisperFactOut] = []
        for thread in self.chats.list_whisper_threads_for_lobby(lobby_id):
            if not self._is_player_player_thread(lobby, thread):
                continue
            out.append(
                WhisperFactOut(
                    thread_id=thread.id,
                    lobby_id=thread.lobby_id,
                    user_a_id=thread.user_low_id,
                    user_b_id=thread.user_high_id,
                    label_a=self._user_label(thread.user_low_id, lobby),
                    label_b=self._user_label(thread.user_high_id, lobby),
                    last_message_at=thread.last_message_at,
                )
            )
        return out

    def open_whisper(
        self,
        user: User,
        lobby_id: UUID,
        payload: WhisperCreateRequest,
    ) -> WhisperThreadOut:
        lobby = self._require_lobby_view(lobby_id, user)
        self._require_board_actor(lobby, user)
        peer_id = payload.peer_user_id
        if peer_id == user.id:
            raise AppError("Нельзя шептать самому себе", code="invalid_peer", status_code=400)
        if not self._peer_is_reachable(lobby, peer_id):
            raise AppError("Собеседник не найден в лобби", code="peer_not_found", status_code=404)
        peer_user = self.db.get(User, peer_id)
        if peer_user is None:
            raise AppError("Собеседник не найден в лобби", code="peer_not_found", status_code=404)
        managers = self._journal_manager_ids(lobby)
        if peer_id not in managers and not roles.can_act_on_board(self.db, lobby, peer_user):
            raise AppError(
                "Нельзя шептать наблюдателю",
                code="peer_forbidden",
                status_code=403,
            )
        low, high = _ordered_pair(user.id, peer_id)
        thread = self.chats.get_whisper_thread_by_pair(lobby_id, low, high)
        if thread is None:
            thread = self.chats.create_whisper_thread(
                lobby_id=lobby_id,
                user_low_id=low,
                user_high_id=high,
            )
            self.db.commit()
            self.db.refresh(thread)
        return self._thread_out(lobby, thread, user)

    def list_whisper_messages(
        self,
        user: User,
        thread_id: UUID,
        *,
        limit: int = 50,
    ) -> list[WhisperMessageOut]:
        thread = self.chats.get_whisper_thread(thread_id)
        if thread is None:
            raise NotFoundError("Шёпот не найден", code="whisper_not_found")
        lobby = self._require_lobby_view(thread.lobby_id, user)
        if self._is_thread_participant(thread, user.id):
            self._require_board_actor(lobby, user)
        else:
            # мастер/сомастер без участия — 403 на тело; lead_today/observer тоже
            raise AppError("Нет доступа к шёпоту", code="forbidden", status_code=403)
        limit = max(1, min(limit, 100))
        messages = self.chats.list_whisper_messages(thread_id, limit=limit)
        return [WhisperMessageOut.model_validate(m) for m in messages]

    async def post_whisper_message(
        self,
        user: User,
        thread_id: UUID,
        payload: WhisperMessageCreateRequest,
    ) -> WhisperMessageOut:
        thread = self.chats.get_whisper_thread(thread_id)
        if thread is None:
            raise NotFoundError("Шёпот не найден", code="whisper_not_found")
        lobby = self._require_lobby_view(thread.lobby_id, user)
        self._require_board_actor(lobby, user)
        if not self._is_thread_participant(thread, user.id):
            raise AppError("Нет доступа к шёпоту", code="forbidden", status_code=403)
        body = payload.body.strip()
        if not body:
            raise AppError("Пустое сообщение", code="empty_message", status_code=400)

        character_id, character_name = None, None
        if self._is_letter_master(lobby, user) and payload.character_id is None:
            character_name = "Мастер"
        else:
            character_id, character_name = self._member_character_label(
                thread.lobby_id,
                user,
                payload.character_id,
            )
            if character_name is None and self._is_letter_master(lobby, user):
                character_name = "Мастер"

        now = datetime.now(timezone.utc)
        message = WhisperMessage(
            thread_id=thread.id,
            author_user_id=user.id,
            character_id=character_id,
            character_name=character_name,
            body=body,
        )
        self.chats.add_whisper_message(message)
        thread.last_message_at = now
        self.db.commit()
        self.db.refresh(message)

        participants = {thread.user_low_id, thread.user_high_id}
        await lobby_hub.broadcast(
            thread.lobby_id,
            {"type": "whisper_changed", "thread_id": str(thread.id)},
            only_user_ids=participants,
        )
        if self._is_player_player_thread(lobby, thread):
            managers = self._journal_manager_ids(lobby)
            await lobby_hub.broadcast(
                thread.lobby_id,
                {
                    "type": "whisper_fact",
                    "thread_id": str(thread.id),
                    "user_a_id": str(thread.user_low_id),
                    "user_b_id": str(thread.user_high_id),
                    "label_a": self._user_label(thread.user_low_id, lobby),
                    "label_b": self._user_label(thread.user_high_id, lobby),
                },
                only_user_ids=managers,
            )
        return WhisperMessageOut.model_validate(message)

    def mark_read(self, user: User, lobby_id: UUID, payload: ChatReadRequest) -> ChatsBadgeOut:
        lobby = self._require_lobby_view(lobby_id, user)
        kind = payload.target_kind
        target_id = payload.target_id
        now = datetime.now(timezone.utc)

        if kind == "channel":
            channel = self.chats.get_channel(target_id)
            if channel is None or channel.lobby_id != lobby_id:
                raise NotFoundError("Канал не найден", code="channel_not_found")
        elif kind == "whisper":
            thread = self.chats.get_whisper_thread(target_id)
            if thread is None or thread.lobby_id != lobby_id:
                raise NotFoundError("Шёпот не найден", code="whisper_not_found")
            if not self._is_thread_participant(thread, user.id):
                raise AppError("Нет доступа к шёпоту", code="forbidden", status_code=403)
            self._require_board_actor(lobby, user)
        elif kind == "letter":
            letter = self.chats.get_letter(target_id)
            if letter is None or letter.lobby_id != lobby_id:
                raise NotFoundError("Письмо не найдено", code="letter_not_found")
            if not self._can_access_letter(lobby, user, letter):
                raise AppError("Нет доступа к письму", code="forbidden", status_code=403)
        else:
            raise AppError("Неизвестный тип", code="invalid_kind", status_code=400)

        self.chats.upsert_read_cursor(
            lobby_id=lobby_id,
            user_id=user.id,
            target_kind=kind,
            target_id=target_id,
            last_read_at=now,
        )
        self.db.commit()
        return self.chats_badge(user, lobby_id)

    def chats_badge(self, user: User, lobby_id: UUID) -> ChatsBadgeOut:
        lobby = self._require_lobby_view(lobby_id, user)
        letters = 0
        channels = 0
        whispers = 0

        if self._is_letter_master(lobby, user):
            letters = len(self.chats.list_waiting_master(lobby_id))
        elif roles.can_act_on_board(self.db, lobby, user):
            for letter in self.chats.list_letters_for_user(lobby_id, user.id):
                cursor = self.chats.get_read_cursor(
                    user_id=user.id,
                    target_kind="letter",
                    target_id=letter.id,
                )
                if self.chats.letter_has_unread_for_author(
                    letter,
                    user_id=user.id,
                    since=cursor.last_read_at if cursor else None,
                ):
                    letters += 1

        if roles.can_view_lobby(self.db, lobby, user):
            for channel in self.chats.list_channels(lobby_id):
                cursor = self.chats.get_read_cursor(
                    user_id=user.id,
                    target_kind="channel",
                    target_id=channel.id,
                )
                channels += self.chats.count_unread_channel_messages(
                    channel.id,
                    user_id=user.id,
                    since=cursor.last_read_at if cursor else None,
                )

        if roles.can_act_on_board(self.db, lobby, user):
            for thread in self.chats.list_whisper_threads_for_user(lobby_id, user.id):
                cursor = self.chats.get_read_cursor(
                    user_id=user.id,
                    target_kind="whisper",
                    target_id=thread.id,
                )
                whispers += self.chats.count_unread_whisper_messages(
                    thread.id,
                    user_id=user.id,
                    since=cursor.last_read_at if cursor else None,
                )

        total = letters + channels + whispers
        return ChatsBadgeOut(
            letters=letters,
            channels=channels,
            whispers=whispers,
            total=total,
        )
