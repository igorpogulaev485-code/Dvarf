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
    shared_with_master: bool = False
    pinned: bool = False
    updated_by_user_id: UUID | None = None
    updated_by_name: str | None = None
    created_at: datetime
    updated_at: datetime
    can_edit: bool = False
    can_delete: bool = False
    can_pin: bool = False
    can_share_with_master: bool = False
    can_send_to_journal: bool = False


class NoteCreateRequest(BaseModel):
    scope: str = Field(default="personal", max_length=16)
    title: str = Field(default="", max_length=200)
    body: str = Field(default="", max_length=20000)
    character_id: UUID | None = None
    pinned: bool | None = None


class NoteUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=20000)
    shared_with_master: bool | None = None
    pinned: bool | None = None
    # Client's known updated_at; if server is newer → 409
    updated_at: datetime | None = None


class NotesExportOut(BaseModel):
    filename: str
    content: str
