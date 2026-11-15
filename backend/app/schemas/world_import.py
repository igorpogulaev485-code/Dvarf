"""W-API-01/03/05: схемы токенов импорта, заданий, сверки и подтверждения."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

WorldImportSourceKindIn = Literal["api", "zip", "git", "mcp"]
WorldImportDiffStatus = Literal[
    "new",
    "update",
    "unchanged",
    "conflict",
    "missing_in_source",
    "ai_suggestion",
    "error",
]
WorldImportConfirmActorKind = Literal["user", "ai_token"]


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
    last_confirmed_at: datetime | None = None
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


class WorldImportUpsertRequest(BaseModel):
    """W-API-05: создать/обновить задание и сразу разобрать файлы."""

    rules_edition: str | None = Field(default=None, max_length=16)
    source_kind: WorldImportSourceKindIn = "api"
    source_ref: str | None = Field(default=None, max_length=2000)
    files: list[WorldVaultFileIn] = Field(default_factory=list)


class WorldImportValidateRequest(BaseModel):
    """Проверка пакета без записи в канон и без устойчивого задания."""

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
    office_title: str | None = None
    office_holder_status: str | None = None
    succession_order: int | None = None
    tenure_from: str | None = None
    tenure_to: str | None = None
    hint: str | None = None
    created_at: datetime


class WorldVaultParseResultOut(BaseModel):
    job: WorldImportJobOut
    items: list[WorldImportDraftItemOut]
    skipped: list[dict[str, str]] = Field(default_factory=list)
    created_count: int = 0
    updated_count: int = 0
    links: list[WorldImportDraftLinkOut] = Field(default_factory=list)
    links_count: int = 0


class WorldImportValidateIssue(BaseModel):
    code: str
    path: str = ""
    message: str
    hint: str = ""


class WorldImportValidateOut(BaseModel):
    """Отчёт validate: счётчики, предупреждения, квота — без записи в вики."""

    rules_edition: str
    type_counts: dict[str, int] = Field(default_factory=dict)
    file_count: int = 0
    text_bytes: int = 0
    skipped: list[dict[str, str]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    errors: list[WorldImportValidateIssue] = Field(default_factory=list)
    media_quota_bytes: int = 200 * 1024 * 1024
    media_used_bytes: int = 0
    media_free_bytes: int = 0
    limits: dict[str, int] = Field(default_factory=dict)
    ok: bool = True


class WorldImportDiffEntryOut(BaseModel):
    draft_item_id: UUID | None = None
    source_key: str
    item_type: str
    status: WorldImportDiffStatus
    title: str = ""
    page_id: UUID | None = None
    message: str = ""
    hint: str = ""


class WorldImportDiffOut(BaseModel):
    job_id: UUID
    setting_id: UUID
    entries: list[WorldImportDiffEntryOut] = Field(default_factory=list)
    counts: dict[str, int] = Field(default_factory=dict)


class WorldImportConfirmRequest(BaseModel):
    """Список id пунктов черновика. Пусто / нет поля — все proposed/conflict."""

    item_ids: list[UUID] | None = None


class WorldImportConfirmOut(BaseModel):
    job: WorldImportJobOut
    confirmation_id: UUID
    actor_kind: WorldImportConfirmActorKind
    confirmed_item_ids: list[UUID] = Field(default_factory=list)
    created_page_ids: list[UUID] = Field(default_factory=list)
    updated_page_ids: list[UUID] = Field(default_factory=list)
    created_creature_ids: list[UUID] = Field(default_factory=list)
    updated_creature_ids: list[UUID] = Field(default_factory=list)
    created_artifact_ids: list[UUID] = Field(default_factory=list)
    updated_artifact_ids: list[UUID] = Field(default_factory=list)
    journal_entry_ids: list[UUID] = Field(default_factory=list)
    links_created: int = 0


class WorldImportCancelOut(BaseModel):
    job: WorldImportJobOut


class WorldImportSettingsOut(BaseModel):
    setting_id: UUID
    lobby_id: UUID
    ai_can_confirm: bool = False


class WorldImportSettingsPatch(BaseModel):
    ai_can_confirm: bool


class WorldImportConfirmationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    setting_id: UUID
    lobby_id: UUID
    actor_kind: str
    actor_user_id: UUID | None = None
    actor_token_id: UUID | None = None
    item_ids: list[Any] = Field(default_factory=list)
    confirmed_at: datetime
    undone_at: datetime | None = None
