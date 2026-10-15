from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    scope: str
    author_user_id: UUID
    character_id: UUID | None = None
    character_name: str | None = None
    title: str
    body: str
    created_at: datetime
    updated_at: datetime
    can_edit: bool = False


class NoteCreateRequest(BaseModel):
    scope: str = Field(default="personal", max_length=16)
    title: str = Field(default="", max_length=200)
    body: str = Field(default="", max_length=20000)
    character_id: UUID | None = None


class NoteUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=20000)
