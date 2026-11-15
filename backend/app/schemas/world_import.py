"""W-API-01/03: схемы токенов импорта, заданий и предложенных связей."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

WorldImportSourceKindIn = Literal["api", "zip", "git", "mcp"]


class WorldApiTokenCreateRequest(BaseModel):
    can_read: bool = True
    can_write: bool = True


class WorldApiTokenCreated(BaseModel):
    """Ответ создания: секрет показывается один раз."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    setting_id: UUID
    owner_id: UUID
    token_prefix: str
    secret: str
    can_read: bool
    can_write: bool
    revoked_at: datetime | None = None
    last_used_at: datetime | None = None
    created_at: datetime


class WorldApiTokenOut(BaseModel):
    """Список / повторный GET — без секрета."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    setting_id: UUID
    owner_id: UUID
    token_prefix: str
    can_read: bool
    can_write: bool
    revoked_at: datetime | None = None
    last_used_at: datetime | None = None
    created_at: datetime


class WorldImportCreateRequest(BaseModel):
    rules_edition: str | None = Field(default=None, max_length=16)
    source_kind: WorldImportSourceKindIn = "api"
    source_ref: str | None = Field(default=None, max_length=2000)


class WorldImportJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    setting_id: UUID
    lobby_id: UUID
    author_id: UUID
    status: str
    rules_edition: str
    source_kind: str
    idempotency_key: str | None = None
    source_ref: str | None = None
    created_at: datetime
    updated_at: datetime


class WorldVaultFileIn(BaseModel):
    """Один файл хранилища: относительный путь + текст."""

    path: str = Field(..., min_length=1, max_length=512)
    content: str = Field(..., max_length=2_000_000)


class WorldVaultParseRequest(BaseModel):
    """JSON-заливка набора файлов в уже созданное задание."""

    rules_edition: str | None = Field(default=None, max_length=16)
    files: list[WorldVaultFileIn] = Field(default_factory=list)


class WorldImportDraftItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    item_type: str
    source_key: str
    status: str
    proposal: dict
    created_at: datetime
    updated_at: datetime


class WorldImportDraftLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    from_source_key: str
    to_source_key: str | None = None
    to_alias: str | None = None
    kind: str
    label: str
    confidence: str
    status: str
    created_at: datetime


class WorldVaultParseResultOut(BaseModel):
    job: WorldImportJobOut
    items: list[WorldImportDraftItemOut]
    skipped: list[dict[str, str]] = Field(default_factory=list)
    created_count: int = 0
    updated_count: int = 0
    links: list[WorldImportDraftLinkOut] = Field(default_factory=list)
    links_count: int = 0
