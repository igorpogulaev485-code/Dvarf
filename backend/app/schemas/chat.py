from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChatChannelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    name: str
    created_by_user_id: UUID | None = None
    created_at: datetime
    message_count: int = 0


class ChatChannelCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    channel_id: UUID
    author_user_id: UUID | None = None
    character_id: UUID | None = None
    character_name: str | None = None
    body: str
    created_at: datetime


class ChatMessageCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    character_id: UUID | None = None


class MasterLetterMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    letter_id: UUID
    author_user_id: UUID | None = None
    is_master: bool
    body: str
    created_at: datetime


class MasterLetterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    author_user_id: UUID
    character_id: UUID | None = None
    character_name: str
    subject: str
    status: str
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime
    messages: list[MasterLetterMessageOut] = Field(default_factory=list)


class MasterLetterSummary(BaseModel):
    id: UUID
    lobby_id: UUID
    character_id: UUID | None = None
    character_name: str
    subject: str
    status: str
    last_message_at: datetime
    preview: str = ""


class MasterLetterCreateRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=4000)
    character_id: UUID | None = None


class MasterLetterReplyRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MasterLetterBadgeOut(BaseModel):
    count: int
    items: list[MasterLetterSummary] = Field(default_factory=list)


class WhisperPeerOut(BaseModel):
    user_id: UUID
    label: str
    is_master: bool = False


class WhisperThreadOut(BaseModel):
    id: UUID
    lobby_id: UUID
    peer_user_id: UUID
    peer_label: str
    peer_is_master: bool = False
    last_message_at: datetime
    unread_count: int = 0
    created_at: datetime


class WhisperMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    thread_id: UUID
    author_user_id: UUID | None = None
    character_id: UUID | None = None
    character_name: str | None = None
    body: str
    created_at: datetime


class WhisperCreateRequest(BaseModel):
    peer_user_id: UUID


class WhisperMessageCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    character_id: UUID | None = None


class WhisperFactOut(BaseModel):
    """Факт шёпота игрок↔игрок для мастера/сомастера — без текста."""

    thread_id: UUID
    lobby_id: UUID
    user_a_id: UUID
    user_b_id: UUID
    label_a: str
    label_b: str
    last_message_at: datetime


class ChatsBadgeOut(BaseModel):
    letters: int = 0
    channels: int = 0
    whispers: int = 0
    total: int = 0


class ChatReadRequest(BaseModel):
    target_kind: str = Field(pattern="^(channel|whisper|letter)$")
    target_id: UUID
