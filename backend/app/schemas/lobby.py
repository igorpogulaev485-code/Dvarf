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
    closed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class SeatConditionOut(BaseModel):
    slug: str
    name: str
    catalog_id: str | None = None


class SeatCompanionOut(BaseModel):
    id: str
    name: str
    hp_current: int | None = None
    hp_max: int | None = None
    ac: int | None = None
    conditions: list[SeatConditionOut] = Field(default_factory=list)


class SeatConcentrationOut(BaseModel):
    spell_id: str
    name: str


class SeatEffectOut(BaseModel):
    """Баф/эффект на союзнике (не SRD-состояние)."""

    id: str
    name: str
    source_character_id: str | None = None
    source_name: str | None = None
    linked_concentration: bool = False


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
    conditions: list[SeatConditionOut] = Field(default_factory=list)
    effects: list[SeatEffectOut] = Field(default_factory=list)
    concentration: SeatConcentrationOut | None = None
    companions: list[SeatCompanionOut] = Field(default_factory=list)
    passive_perception: int | None = None
    passive_insight: int | None = None
    passive_investigation: int | None = None
    seated_at: datetime


class SeatCombatPatchRequest(BaseModel):
    """Жесты за столом: вдохновение / состояния / эффекты / концентрация."""

    inspiration: bool | None = None
    conditions: list[SeatConditionOut] | None = None
    effects: list[SeatEffectOut] | None = None
    concentration: SeatConcentrationOut | None = None
    clear_concentration: bool = False


class SeatCompanionCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    hp_current: int | None = Field(default=None, ge=0, le=9999)
    hp_max: int | None = Field(default=None, ge=0, le=9999)
    ac: int | None = Field(default=None, ge=0, le=40)


class SeatCompanionPatchRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    hp_current: int | None = Field(default=None, ge=0, le=9999)
    hp_max: int | None = Field(default=None, ge=0, le=9999)
    ac: int | None = Field(default=None, ge=0, le=40)
    conditions: list[SeatConditionOut] | None = None


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
    closed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class JournalEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    author_user_id: UUID | None = None
    entry_type: str
    title: str
    body: str
    image_url: str | None = None
    setting_id: UUID | None = None
    setting_name: str | None = None
    from_session_id: UUID | None = None
    from_session_name: str | None = None
    created_at: datetime
    updated_at: datetime


class JournalPageOut(BaseModel):
    items: list[JournalEntryOut]
    total: int
    offset: int
    limit: int


class JournalEntryCreateRequest(BaseModel):
    entry_type: str = Field(default="text", max_length=32)
    title: str = Field(default="", max_length=200)
    body: str = Field(default="", max_length=20000)
    image_url: str | None = Field(default=None, max_length=500)
    setting_id: UUID | None = None


class JournalEntryUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=20000)
    image_url: str | None = Field(default=None, max_length=500)
    setting_id: UUID | None = None
    clear_setting: bool = False
    clear_image: bool = False


class SessionCloseRequest(BaseModel):
    """Закрыть сессию и опционально записать итог в дневник."""

    title: str | None = Field(default=None, max_length=200)
    summary: str = Field(default="", max_length=20000)
    write_journal: bool = True


class SessionCloseResponse(BaseModel):
    session: SessionDetail
    journal_entry: JournalEntryOut | None = None


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
