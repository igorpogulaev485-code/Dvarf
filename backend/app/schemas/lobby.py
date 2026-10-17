from __future__ import annotations

from datetime import datetime
from typing import Literal
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


SettingPageKind = Literal[
    "location",
    "npc",
    "faction",
    "quest",
    "item_lore",
    "note",
]

QuestStatus = Literal["planned", "active", "done", "failed"]


class SettingPageTemplateField(BaseModel):
    key: str
    label: str
    type: Literal["text", "long", "select", "number", "url"] = "text"
    gm_only: bool = False
    options: list[str] | None = None


class SettingPageTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    setting_id: UUID | None = None
    page_kind: SettingPageKind
    name: str
    body_seed: str = ""
    schema: list[SettingPageTemplateField] = Field(default_factory=list)
    enabled: bool = True
    is_system: bool = False


class SettingPageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    setting_id: UUID
    parent_id: UUID | None = None
    title: str
    body: str
    sort_order: int = 0
    revealed: bool = False
    page_kind: SettingPageKind = "note"
    template_id: UUID | None = None
    fields: dict[str, str | int | float | bool | None] = Field(default_factory=dict)
    quest_status: QuestStatus | None = None
    created_at: datetime
    updated_at: datetime


class SettingPageLinkOut(BaseModel):
    """C2: ребро графа; заголовки удобны клиенту для бэклинков."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    from_page_id: UUID
    to_page_id: UUID
    from_title: str = ""
    to_title: str = ""
    label: str = ""
    created_at: datetime


class SettingDetail(SettingSummary):
    """C1–C5: страницы + связи + шаблоны; игрокам — только revealed."""

    pages: list[SettingPageOut] = Field(default_factory=list)
    links: list[SettingPageLinkOut] = Field(default_factory=list)
    templates: list[SettingPageTemplateOut] = Field(default_factory=list)
    is_owner: bool = False


class SettingPageCreateRequest(BaseModel):
    title: str = Field(default="Новая страница", max_length=200)
    body: str = ""
    parent_id: UUID | None = None
    sort_order: int | None = None
    page_kind: SettingPageKind = "note"
    template_id: UUID | None = None
    fields: dict[str, str | int | float | bool | None] | None = None
    quest_status: QuestStatus | None = None


class SettingPageBulkCreateRequest(BaseModel):
    """C5 quick create: несколько имён одного типа/шаблона."""

    titles: list[str] = Field(min_length=1, max_length=50)
    page_kind: SettingPageKind = "npc"
    template_id: UUID | None = None
    parent_id: UUID | None = None
    body: str = ""


class SettingPageUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str | None = None
    parent_id: UUID | None = None
    sort_order: int | None = None
    # clear_parent: переместить в корень
    clear_parent: bool = False
    # C3: раскрытие игрокам
    revealed: bool | None = None
    # C3: применить revealed ко всей ветке (эта + потомки)
    reveal_subtree: bool = False
    page_kind: SettingPageKind | None = None
    template_id: UUID | None = None
    clear_template: bool = False
    fields: dict[str, str | int | float | bool | None] | None = None
    quest_status: QuestStatus | None = None
    clear_quest_status: bool = False


class SettingPageLinkCreateRequest(BaseModel):
    to_page_id: UUID
    label: str = Field(default="", max_length=120)


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
    effect_suggestions: list[str] = Field(default_factory=list)
    companions: list[SeatCompanionOut] = Field(default_factory=list)
    passive_perception: int | None = None
    passive_insight: int | None = None
    passive_investigation: int | None = None
    dex_mod: int | None = None
    seated_at: datetime


class SeatCombatPatchRequest(BaseModel):
    """Жесты за столом: вдохновение / состояния / эффекты / концентрация."""

    inspiration: bool | None = None
    conditions: list[SeatConditionOut] | None = None
    effects: list[SeatEffectOut] | None = None
    concentration: SeatConcentrationOut | None = None
    clear_concentration: bool = False


class LobbyShareEffectRequest(BaseModel):
    """С листа / стола: повесить эффект на союзников лобби."""

    source_character_id: UUID
    name: str = Field(min_length=1, max_length=120)
    target_character_ids: list[UUID] = Field(min_length=1)
    linked_concentration: bool = True


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
    encounter_templates: list["EncounterTemplateOut"] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class LobbyShareEffectResponse(BaseModel):
    applied: int
    lobby: LobbyDetail


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


class CombatantActionOut(BaseModel):
    name_ru: str
    text_ru: str = ""
    name_en: str | None = None


class EncounterEntryOut(BaseModel):
    catalog_id: str | None = None
    slug: str | None = None
    name: str
    count: int = 1
    hp_max: int | None = None
    ac: int | None = None
    speed: int | None = None
    xp: int | None = None
    custom: bool = False
    actions: list[CombatantActionOut] = Field(default_factory=list)


class EncounterTemplateOut(BaseModel):
    id: str
    name: str
    entries: list[EncounterEntryOut] = Field(default_factory=list)
    updated_at: str | None = None


class EncounterTemplateCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    entries: list[EncounterEntryOut] = Field(min_length=1)


class EncounterTemplateSaveFromSessionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class EncounterGenerateRequest(BaseModel):
    """B8: запрос генератора (UI ещё draft)."""

    difficulty: Literal["easy", "medium", "hard", "deadly"] = "medium"
    environments: list[str] = Field(default_factory=list)
    theme_ids: list[str] = Field(default_factory=list, min_length=1)
    similar: bool = False
    waves: int = Field(default=1, ge=1, le=8)


class EncounterMonsterOptionOut(BaseModel):
    slug: str
    name_ru: str
    cr: str
    xp: int
    type: str | None = None
    subtype: str | None = None
    fly: bool = False


class EncounterRoleOut(BaseModel):
    role: Literal["boss", "pack"]
    options: list[EncounterMonsterOptionOut] = Field(default_factory=list)
    suggested_count: int = 1


class EncounterWaveOut(BaseModel):
    wave_index: int
    budget_xp: int
    boss: EncounterRoleOut
    pack: EncounterRoleOut


class EncounterGenerateResult(BaseModel):
    difficulty: str
    party_power: float
    budget_total: int
    anti_air_ok: bool
    waves: list[EncounterWaveOut] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    theme_ids: list[str] = Field(default_factory=list)
    similar: bool = False
    environments: list[str] = Field(default_factory=list)


class CombatantMemberOut(BaseModel):
    """Один боец внутри пачки (или единственный, если count=1)."""

    id: str
    name: str
    hp_current: int
    hp_max: int


class CombatantMemberDamage(BaseModel):
    member_id: str
    damage: int = Field(ge=-9999, le=9999)


class SessionCombatantOut(BaseModel):
    """Противник / пачка на сессии (не место состава лобби)."""

    id: str
    name: str
    """Сводка для быстрых жестов: HP первого живого (цель урона без выбора)."""
    hp_current: int
    hp_max: int
    alive_count: int = 1
    member_count: int = 1
    ac: int | None = None
    speed: int | None = None
    cr: str | None = None
    catalog_id: str | None = None
    slug: str | None = None
    source_book: str | None = None
    type_ru: str | None = None
    custom: bool = False
    conditions: list[SeatConditionOut] = Field(default_factory=list)
    traits: list[CombatantActionOut] = Field(default_factory=list)
    actions: list[CombatantActionOut] = Field(default_factory=list)
    bonus_actions: list[CombatantActionOut] = Field(default_factory=list)
    reactions: list[CombatantActionOut] = Field(default_factory=list)
    legendary_actions: list[CombatantActionOut] = Field(default_factory=list)
    members: list[CombatantMemberOut] = Field(default_factory=list)
    dex_mod: int | None = None
    xp: int | None = None
    """Сколько поверженных из пачки уже учтены при раздаче XP."""
    xp_claimed_count: int = 0


class CombatEntryOut(BaseModel):
    id: str
    kind: str  # pc | companion | enemy
    ref_id: str
    companion_id: str | None = None
    name: str
    initiative: int
    dex_mod: int | None = None


class SessionCombatOut(BaseModel):
    active: bool = False
    round: int = 1
    active_index: int = 0
    entries: list[CombatEntryOut] = Field(default_factory=list)


class CombatEntryInput(BaseModel):
    kind: str = Field(pattern="^(pc|companion|enemy)$")
    ref_id: str = Field(min_length=1, max_length=80)
    companion_id: str | None = Field(default=None, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    initiative: int = Field(ge=-20, le=99)
    dex_mod: int | None = Field(default=None, ge=-10, le=10)


class CombatStartRequest(BaseModel):
    """Старт боя: мастер вводит инициативу с физ. кубов (или свою)."""

    entries: list[CombatEntryInput] = Field(min_length=1)


class CombatPatchRequest(BaseModel):
    """Ход / конец боя / правка инициативы активного порядка."""

    action: str | None = None  # next | prev | end
    active_index: int | None = Field(default=None, ge=0)
    round: int | None = Field(default=None, ge=1)
    entries: list[CombatEntryInput] | None = None


class XpAwardRequest(BaseModel):
    """Раздать XP сидящим: пул делится поровну, либо фиксированная сумма каждому."""

    character_ids: list[UUID] = Field(min_length=1)
    total_xp: int | None = Field(default=None, ge=0, le=10_000_000)
    per_character_xp: int | None = Field(default=None, ge=0, le=10_000_000)
    source: str = Field(default="manual", max_length=32)
    note: str | None = Field(default=None, max_length=240)
    """Пометить этих противников как уже учтённых в XP (после боя)."""
    claim_combatant_ids: list[str] | None = None


class XpAwardResult(BaseModel):
    session: "SessionDetail"
    awarded_each: int
    awarded_total: int
    recipients: list[str]


class LootCoinsIn(BaseModel):
    cp: int = Field(default=0, ge=0, le=1_000_000)
    sp: int = Field(default=0, ge=0, le=1_000_000)
    ep: int = Field(default=0, ge=0, le=1_000_000)
    gp: int = Field(default=0, ge=0, le=1_000_000)
    pp: int = Field(default=0, ge=0, le=1_000_000)


class LootItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    qty: int = Field(default=1, ge=1, le=9999)
    notes: str | None = Field(default=None, max_length=240)


class LootGrantIn(BaseModel):
    """Одна доля лута одному персонажу за столом."""

    character_id: UUID
    item: LootItemIn | None = None
    coins: LootCoinsIn | None = None


class LootAwardRequest(BaseModel):
    grants: list[LootGrantIn] = Field(min_length=1)
    note: str | None = Field(default=None, max_length=240)


class LootAwardResult(BaseModel):
    session: "SessionDetail"
    summary: str
    recipient_names: list[str]


class InventoryTransferRequest(BaseModel):
    """P2P: передать предмет или монеты другому персонажу в том же лобби."""

    from_character_id: UUID
    to_character_id: UUID
    item_id: str | None = Field(default=None, max_length=80)
    qty: int | None = Field(default=None, ge=1, le=9999)
    coin_currency: str | None = Field(default=None, pattern="^(cp|sp|ep|gp|pp)$")
    coin_amount: int | None = Field(default=None, ge=1, le=1_000_000)
    session_id: UUID | None = None


class InventoryTransferResult(BaseModel):
    summary: str
    from_character_id: UUID
    to_character_id: UUID
    to_character_name: str


class CombatantCreateRequest(BaseModel):
    """Посадить 1..N как одну карточку-пачку из бестиария или свой НПС."""

    catalog_id: UUID | None = None
    slug: str | None = Field(default=None, max_length=80)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    hp_max: int | None = Field(default=None, ge=1, le=9999)
    ac: int | None = Field(default=None, ge=0, le=40)
    speed: int | None = Field(default=None, ge=0, le=500)
    count: int = Field(default=1, ge=1, le=20)
    actions: list[CombatantActionOut] = Field(default_factory=list)
    xp: int | None = Field(default=None, ge=0, le=10_000_000)


class CombatantPatchRequest(BaseModel):
    hp_current: int | None = Field(default=None, ge=0, le=9999)
    hp_max: int | None = Field(default=None, ge=1, le=9999)
    ac: int | None = Field(default=None, ge=0, le=40)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    conditions: list[SeatConditionOut] | None = None
    """Урон одному: без member_id → первый живой; с member_id → выбранный."""
    damage: int | None = Field(default=None, ge=-9999, le=9999)
    member_id: str | None = Field(default=None, max_length=80)
    """Пакетный урон по составу: этому N, этому M."""
    member_damages: list[CombatantMemberDamage] | None = None


class SessionDetail(BaseModel):
    id: UUID
    lobby_id: UUID
    lobby_name: str
    setting_id: UUID | None
    setting_name: str | None
    name: str
    is_owner: bool
    seats: list[SessionSeatOut]
    combatants: list[SessionCombatantOut] = Field(default_factory=list)
    combat: SessionCombatOut = Field(default_factory=SessionCombatOut)
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
    # C4: страница вики (если не раскрыта — скрыта у игрока)
    page_id: UUID | None = None
    page_title: str | None = None
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
    page_id: UUID | None = None


class JournalEntryUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=20000)
    image_url: str | None = Field(default=None, max_length=500)
    setting_id: UUID | None = None
    clear_setting: bool = False
    clear_image: bool = False
    page_id: UUID | None = None
    clear_page: bool = False


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
