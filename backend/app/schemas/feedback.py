"""Схемы обратной связи: форма игрока и очередь админки (ADM-04)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.feedback import FeedbackStatus, FeedbackTopic


class FeedbackCreateRequest(BaseModel):
    topic: FeedbackTopic
    body: str = Field(min_length=1, max_length=4000)
    is_anonymous: bool = False
    character_id: UUID | None = None
    lobby_id: UUID | None = None
    page_path: str | None = Field(default=None, max_length=300)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("Напишите текст сообщения")
        return text

    @field_validator("page_path")
    @classmethod
    def clean_page_path(cls, value: str | None) -> str | None:
        if value is None:
            return None
        path = value.strip().split("?", 1)[0].split("#", 1)[0]
        if not path:
            return None
        return path[:300]


class FeedbackCreateResponse(BaseModel):
    id: UUID
    message: str = "Сообщение принято"


class AdminFeedbackAuthor(BaseModel):
    id: UUID
    email: str | None = None
    display_name: str | None = None


class AdminFeedbackItem(BaseModel):
    id: UUID
    topic: str
    topic_label: str
    status: str
    status_label: str
    body: str
    is_anonymous: bool
    author: AdminFeedbackAuthor | None = None
    character_id: UUID | None = None
    character_name: str | None = None
    lobby_id: UUID | None = None
    lobby_name: str | None = None
    page_path: str | None = None
    admin_note: str | None = None
    created_at: datetime
    updated_at: datetime


class AdminFeedbackPage(BaseModel):
    items: list[AdminFeedbackItem]
    total: int
    page: int
    page_size: int
    new_count: int


class AdminFeedbackPatchRequest(BaseModel):
    status: FeedbackStatus | None = None
    admin_note: str | None = Field(default=None, max_length=4000)

    @field_validator("admin_note")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        text = value.strip()
        return text if text else None
