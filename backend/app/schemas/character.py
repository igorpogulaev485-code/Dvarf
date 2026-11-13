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
    # True для владельца; False если мастер лобби смотрит чужой лист
    can_edit: bool = True
    # L-08: если персонаж в лобби — правила кампании для листа (мультикласс, нагрузка…)
    lobby_id: UUID | None = None
    campaign_rules: dict | None = None


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


class EffectModIn(BaseModel):
    target: str = Field(min_length=1, max_length=64)
    op: str = Field(default="add", min_length=1, max_length=32)
    value: float | int | None = None
    dice: str | None = Field(default=None, max_length=32)
    condition: str | None = Field(default=None, max_length=64)
    once: bool | None = None


class EffectDurationIn(BaseModel):
    unit: str = Field(min_length=1, max_length=40)
    value: float | int | None = None
    started_at: str | None = None
    started_round: int | None = None
    remaining_rounds: int | None = None


class ActiveEffectIn(BaseModel):
    """B-01 effect payload written onto target sheets."""

    id: str | None = None
    name: str = Field(min_length=1, max_length=160)
    kind: str | None = None
    slug: str | None = None
    origin: str | None = None
    linked_concentration: bool = False
    ac_bonus: int | None = Field(default=None, ge=0, le=40)
    charges: int | None = Field(default=None, ge=0, le=99)
    mods: list[EffectModIn] = Field(default_factory=list)
    duration: EffectDurationIn | None = None
    source_character_id: str | None = None
    source_name: str | None = None


class ApplyEffectsRequest(BaseModel):
    """Р25: цели — участники того же лобби или собственные персонажи игрока."""

    target_character_ids: list[UUID] = Field(min_length=1)
    effect: ActiveEffectIn
    linked_concentration: bool | None = None


class ApplyEffectsResponse(BaseModel):
    applied: int
    character_ids: list[UUID] = Field(default_factory=list)


class ClearConcentrationEffectsRequest(BaseModel):
    """If clear_concentration is false — only drop linked effects on targets (B03 swap)."""

    clear_concentration: bool = True


class ClearConcentrationEffectsResponse(BaseModel):
    removed: int
