from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.character import RulesEdition


class CharacterSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    avatar_url: str | None = None
    level: int
    class_name: str | None = None
    race_name: str | None = None
    hp_current: int | None = None
    hp_max: int | None = None
    rules_edition: RulesEdition
    sheet_version: int
    is_draft: bool = False
    created_at: datetime
    updated_at: datetime


class CharacterDetail(CharacterSummary):
    sheet: dict[str, Any]


class CharacterCreateRequest(BaseModel):
    rules_edition: RulesEdition
    name: str | None = Field(default=None, min_length=1, max_length=120)
    is_draft: bool = False


class CharacterUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_url: str | None = None
    level: int | None = Field(default=None, ge=1, le=30)
    class_name: str | None = Field(default=None, max_length=120)
    race_name: str | None = Field(default=None, max_length=120)
    hp_current: int | None = None
    hp_max: int | None = None
    rules_edition: RulesEdition | None = None
    is_draft: bool | None = None
    sheet: dict[str, Any] | None = None
    sheet_version: int = Field(ge=1)
