"""W-API-04: схемы существ и предметов сеттинга (2014, только внутри мира)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

CreatureSourceIn = Literal["master", "extracted"]
ArtifactItemKindIn = Literal["ordinary", "magic"]


class SettingCreatureCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    import_key: str = Field(..., min_length=1, max_length=128)
    data: dict[str, Any] = Field(default_factory=dict)
    source: CreatureSourceIn = "master"
    rules_edition: str | None = Field(default=None, max_length=16)


class SettingCreatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    setting_id: UUID
    name: str
    import_key: str
    rules_edition: str
    source: str
    data: dict[str, Any] = Field(default_factory=dict)
    incomplete: bool = False
    incompleteness_notes: str = ""
    created_at: datetime
    updated_at: datetime


class SettingItemCreateRequest(BaseModel):
    """Предмет сеттинга через SettingArtifact (+ kind ordinary/magic)."""

    name: str = Field(..., min_length=1, max_length=120)
    item_kind: ArtifactItemKindIn = "ordinary"
    rarity: str = Field(default="", max_length=40)
    description: str = Field(default="", max_length=4000)
    requires_attunement: bool = False
    import_key: str | None = Field(default=None, max_length=128)
    rules_edition: str | None = Field(default=None, max_length=16)
    abilities: list[dict[str, Any]] = Field(default_factory=list)
    attack_damage: str = Field(default="", max_length=40)
    attack_damage_type: str = Field(default="", max_length=40)
    attack_ability: Literal["str", "dex", "con", "int", "wis", "cha"] = "str"
    attack_range_kind: Literal["melee", "ranged", "reach", "thrown"] = "melee"
    weight_lb: float | None = Field(default=None, ge=0, le=1000)


class SettingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    setting_id: UUID
    name: str
    item_kind: str = "magic"
    rarity: str = ""
    description: str = ""
    requires_attunement: bool = False
    rules_edition: str = "2014"
    import_key: str | None = None
    abilities: list[dict[str, Any]] = Field(default_factory=list)
    attack_damage: str = ""
    attack_damage_type: str = ""
    attack_ability: str = "str"
    attack_range_kind: str = "melee"
    weight_lb: float | None = None
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime


class CreatureValidationIssue(BaseModel):
    code: str
    path: str
    message: str
    hint: str = ""


class CreatureValidationResult(BaseModel):
    """Результат проверки статблока: мусор — в errors; дыры — incomplete."""

    valid: bool
    incomplete: bool
    missing_fields: list[str] = Field(default_factory=list)
    incompleteness_notes: str = ""
    errors: list[CreatureValidationIssue] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    normalized_data: dict[str, Any] = Field(default_factory=dict)
