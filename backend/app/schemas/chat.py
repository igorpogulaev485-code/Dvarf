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
