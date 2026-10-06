from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LobbyMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    character_id: UUID
    user_id: UUID
    joined_at: datetime
    character_name: str
    character_level: int
    character_class_name: str | None = None
    character_race_name: str | None = None
    hp_current: int | None = None
    hp_max: int | None = None


class SettingSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    name: str
    world_notes: str
    created_at: datetime
    updated_at: datetime


class SessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    setting_id: UUID | None
    setting_name: str | None = None
    name: str
    seat_count: int = 0
    created_at: datetime
    updated_at: datetime


class SessionSeatOut(BaseModel):
    character_id: UUID
    character_name: str
    character_level: int
    character_class_name: str | None = None
    character_race_name: str | None = None
    hp_current: int | None = None
    hp_max: int | None = None
    seated_at: datetime


class LobbySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    invite_code: str | None = None
    is_owner: bool
    member_count: int
    created_at: datetime
    updated_at: datetime


class LobbyDetail(BaseModel):
    id: UUID
    name: str
    invite_code: str | None = None
    join_path: str | None = None
    is_owner: bool
    owner_id: UUID
    members: list[LobbyMemberOut]
    settings: list[SettingSummary]
    sessions: list[SessionSummary]
    created_at: datetime
    updated_at: datetime


class LobbyCreateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)


class LobbyUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class JoinLobbyRequest(BaseModel):
    code: str = Field(min_length=4, max_length=16)
    character_id: UUID


class AddLobbyMemberRequest(BaseModel):
    character_id: UUID


class SettingCreateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    world_notes: str | None = None


class SettingUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    world_notes: str | None = None


class SessionCreateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    setting_id: UUID | None = None


class SessionUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    setting_id: UUID | None = None
    clear_setting: bool = False


class SessionDetail(BaseModel):
    id: UUID
    lobby_id: UUID
    lobby_name: str
    setting_id: UUID | None
    setting_name: str | None
    name: str
    is_owner: bool
    seats: list[SessionSeatOut]
    lobby_members: list[LobbyMemberOut]
    created_at: datetime
    updated_at: datetime


class SeatRequest(BaseModel):
    character_id: UUID
