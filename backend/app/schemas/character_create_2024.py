"""P24-M03: request/response schemas for 2024 character creation."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CharacterCreate2024Request(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    gender: str | None = Field(default=None, max_length=40)
    is_draft: bool = False
    # Internal wizard / tests / preview — does not open the player CTA (M06).
    is_preview: bool = False

    class_slug: str = Field(min_length=1, max_length=80)
    background_slug: str = Field(min_length=1, max_length=80)
    species_slug: str = Field(min_length=1, max_length=80)

    ability_method: Literal["standard_array", "point_buy", "roll", "manual"] = "standard_array"
    base_abilities: dict[str, int]
    background_asi_mode: Literal["+2/+1", "+1/+1/+1"]
    background_asi: dict[str, int]
    language_ids: list[str] = Field(min_length=2, max_length=2)

    class_skill_ids: list[str] = Field(default_factory=list)
    weapon_mastery_ids: list[str] = Field(default_factory=list)
    fighting_style_slug: str | None = None
    background_tool_id: str | None = None
    background_equipment: Literal["pack", "gold"] = "pack"
    class_equipment: str = "a"

    species_size: str | None = None
    species_lineage_id: str | None = None
    species_ancestry_id: str | None = None

    origin_feat_list: str | None = None
    origin_feat_cantrips: list[str] = Field(default_factory=list)
    origin_feat_spell_id: str | None = None
    origin_feat_skilled: list[str] = Field(default_factory=list)

    cantrip_ids: list[str] = Field(default_factory=list)
    prepared_spell_ids: list[str] = Field(default_factory=list)
    class_option_picks: dict[str, Any] = Field(default_factory=dict)

    # Must stay empty at level 1.
    subclass_slug: str | None = None


class CharacterCreate2024ValidateResponse(BaseModel):
    ok: bool = True
    name: str
    level: int
    class_name: str
    race_name: str
    hp_max: int
    sheet: dict[str, Any]
    warnings: list[str] = Field(default_factory=list)


class Languages2024Response(BaseModel):
    common_id: str
    choice_count: int
    languages: list[dict[str, str]]
    class_special: list[dict[str, str]]
