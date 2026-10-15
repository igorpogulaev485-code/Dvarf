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
    ac: int | None = None
    speed: int | None = None
    inspiration: bool = False
    passive_perception: int | None = None
    passive_insight: int | None = None
    passive_investigation: int | None = None
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
    visibility_profile: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class LobbyCreateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)


class LobbyUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    visibility_profile: dict | None = None


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
    # Кто пришёл на сессию → сразу seats (посещаемость = состав за столом в A2)
    character_ids: list[UUID] = Field(default_factory=list)


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
    visibility_profile: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class SessionEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    event_type: str
    character_id: UUID | None = None
    actor_user_id: UUID | None = None
    character_name: str | None = None
    title: str
    formula: str | None = None
    breakdown: str | None = None
    total: int | None = None
    is_master_roll: bool = False
    payload: dict = Field(default_factory=dict)
    created_at: datetime


class SessionRollCreateRequest(BaseModel):
    """Ввод результата с физического куба / ручной бросок за стол."""

    character_id: UUID | None = None
    title: str = Field(default="Бросок", min_length=1, max_length=200)
    formula: str | None = Field(default=None, max_length=120)
    breakdown: str | None = Field(default=None, max_length=200)
    total: int = Field(ge=-999, le=9999)
    # если true — скрываем от игроков при режиме «Без бросков мастера»
    is_master_roll: bool = False


class SeatRequest(BaseModel):
    character_id: UUID
