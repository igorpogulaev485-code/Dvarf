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
    # L-16: false → пометка «не по правилам старта» для мастера.
    start_rules_ok: bool = True
    start_rules_waived: bool = False


class SettingSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    name: str
    world_notes: str
    is_extra: bool = False
    deleted_at: datetime | None = None
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
    gm_body: str = ""
    sort_order: int = 0
    revealed: bool = False
    revealed_at: datetime | None = None
    page_kind: SettingPageKind = "note"
    template_id: UUID | None = None
    fields: dict[str, str | int | float | bool | None] = Field(default_factory=dict)
    quest_status: QuestStatus | None = None
    tags: list[str] = Field(default_factory=list)
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    # W-02: картинки L-02 (wiki/map), заполняются в _setting_detail
    media: list["LobbyMediaOut"] = Field(default_factory=list)
    primary_image: "LobbyMediaOut | None" = None
    map_image: "LobbyMediaOut | None" = None


LinkKind = Literal["semantic", "mention"]
LinkVisibility = Literal["all", "gm"]


class SettingPageLinkOut(BaseModel):
    """C2/C6/C8: ребро графа; заголовки удобны клиенту для бэклинков."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    from_page_id: UUID
    to_page_id: UUID
    from_title: str = ""
    to_title: str = ""
    label: str = ""
    kind: LinkKind = "semantic"
    visibility: LinkVisibility = "all"
    created_at: datetime


class ArtifactAbilityIn(BaseModel):
    """Способность на артефакте — поля согласованы со справочником и листом."""

    id: str | None = None
    kind: Literal[
        "passive",
        "resource",
        "action",
        "trait",
        "spell_slot",
        "spell",
        "companion",
        "resistance",
        "weapon",
        "requirement",
        "mode",
        "skill",
        "tool",
        "condition_immunity",
    ] = "trait"
    name: str = Field(default="", max_length=120)
    text: str = Field(default="", max_length=2000)
    # passive
    bonus_target: (
        Literal["attack", "damage", "ac", "save", "ability", "speed", "darkvision"] | None
    ) = None
    bonus_value: int | None = Field(default=None, ge=-30, le=120)
    ability_key: Literal["str", "dex", "con", "int", "wis", "cha"] | None = None
    # resource / action charges
    charges: int | None = Field(default=None, ge=1, le=99)
    reset: Literal["short", "long", "manual", "dawn"] | None = None
    action_cost: Literal["action", "bonus", "reaction", "free", "special"] | None = None
    # spell_slot (slot_level 0 = pact)
    slot_level: int | None = Field(default=None, ge=0, le=9)
    slot_count: int | None = Field(default=None, ge=1, le=9)
    pact_level: int | None = Field(default=None, ge=1, le=9)
    # spell (catalog-aligned)
    spell_name: str | None = Field(default=None, max_length=120)
    spell_level: int | None = Field(default=None, ge=0, le=9)
    catalog_id: str | None = Field(default=None, max_length=80)
    prepared: bool | None = None
    casting_time: str | None = Field(default=None, max_length=80)
    range: str | None = Field(default=None, max_length=80)
    attack_or_save: str | None = Field(default=None, max_length=80)
    damage: str | None = Field(default=None, max_length=40)
    concentration: bool | None = None
    # companion
    companion_name: str | None = Field(default=None, max_length=80)
    hp_max: int | None = Field(default=None, ge=1, le=999)
    ac: int | None = Field(default=None, ge=1, le=40)
    companion_type: str | None = Field(default=None, max_length=40)
    # resistance
    damage_type: str | None = Field(default=None, max_length=40)
    resist_mode: Literal["resistance", "immunity", "vulnerability"] | None = None
    # weapon (catalog attack_role shape)
    attack_damage: str | None = Field(default=None, max_length=40)
    attack_damage_type: str | None = Field(default=None, max_length=40)
    attack_ability: Literal["str", "dex", "con", "int", "wis", "cha"] | None = None
    attack_range_kind: Literal["melee", "ranged", "reach", "thrown"] | None = None
    ranged: bool | None = None
    magic_bonus: int | None = Field(default=None, ge=-5, le=5)
    # requirement (Сила 15+)
    min_score: int | None = Field(default=None, ge=1, le=30)
    # mode — активация зарядом на время
    duration: str | None = Field(default=None, max_length=80)
    duration_rounds: int | None = Field(default=None, ge=1, le=600)
    active_damage: str | None = Field(default=None, max_length=40)
    active_damage_type: str | None = Field(default=None, max_length=40)
    advantage: bool | None = None
    # ability max (маска: +2 ИНТ, макс 22)
    max_score: int | None = Field(default=None, ge=1, le=30)
    # skill / tool / condition immunity
    skill_key: str | None = Field(default=None, max_length=40)
    tool_name: str | None = Field(default=None, max_length=80)
    condition_slug: str | None = Field(default=None, max_length=40)
    condition_name: str | None = Field(default=None, max_length=80)
    # companion attack
    attack_bonus: int | None = Field(default=None, ge=-5, le=15)


class SettingArtifactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    setting_id: UUID
    name: str
    rarity: str = ""
    description: str = ""
    requires_attunement: bool = False
    abilities: list[dict] = Field(default_factory=list)
    attack_damage: str = ""
    attack_damage_type: str = ""
    attack_ability: str = "str"
    attack_range_kind: str = "melee"
    weight_lb: float | None = None
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime


class SettingArtifactCreateRequest(BaseModel):
    name: str = Field(default="Новый артефакт", max_length=120)
    rarity: str = Field(default="", max_length=40)
    description: str = Field(default="", max_length=4000)
    requires_attunement: bool = False
    abilities: list[ArtifactAbilityIn] = Field(default_factory=list)
    attack_damage: str = Field(default="", max_length=40)
    attack_damage_type: str = Field(default="", max_length=40)
    attack_ability: Literal["str", "dex", "con", "int", "wis", "cha"] = "str"
    attack_range_kind: Literal["melee", "ranged", "reach", "thrown"] = "melee"
    weight_lb: float | None = Field(default=None, ge=0, le=1000)
    sort_order: int | None = None


class SettingArtifactUpdateRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    rarity: str | None = Field(default=None, max_length=40)
    description: str | None = Field(default=None, max_length=4000)
    requires_attunement: bool | None = None
    abilities: list[ArtifactAbilityIn] | None = None
    attack_damage: str | None = Field(default=None, max_length=40)
    attack_damage_type: str | None = Field(default=None, max_length=40)
    attack_ability: Literal["str", "dex", "con", "int", "wis", "cha"] | None = None
    attack_range_kind: Literal["melee", "ranged", "reach", "thrown"] | None = None
    weight_lb: float | None = Field(default=None, ge=0, le=1000)
    clear_weight: bool = False
    sort_order: int | None = None


class SettingDetail(SettingSummary):
    """C1–C9 + D1: страницы, связи, шаблоны, теги; артефакты у мастера."""

    pages: list[SettingPageOut] = Field(default_factory=list)
    links: list[SettingPageLinkOut] = Field(default_factory=list)
    templates: list[SettingPageTemplateOut] = Field(default_factory=list)
    all_tags: list[str] = Field(default_factory=list)
    artifacts: list[SettingArtifactOut] = Field(default_factory=list)
    is_owner: bool = False
    # W-01: права L-01, не путать is_owner с правкой вики
    can_edit_wiki: bool = False
    can_see_hidden: bool = False
    can_view_lobby: bool = True
    # W-02: сеттинг в корзине — сессии остаются, вики помечаем
    in_trash: bool = False


class SettingChoosePrimaryRequest(BaseModel):
    """W-01: выбрать основной сеттинг; остальные → is_extra."""

    setting_id: UUID


class SettingPageCreateRequest(BaseModel):
    title: str = Field(default="Новая страница", max_length=200)
    body: str = ""
    gm_body: str = ""
    parent_id: UUID | None = None
    sort_order: int | None = None
    page_kind: SettingPageKind = "note"
    template_id: UUID | None = None
    fields: dict[str, str | int | float | bool | None] | None = None
    quest_status: QuestStatus | None = None
    tags: list[str] | None = None


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
    gm_body: str | None = None
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
    # W-02: флаг снят из рабочего потока (молчание False; игнорируется)
    create_missing_mentions: bool = False
    tags: list[str] | None = None
    # W-02: оптимистичная блокировка; 409 setting_page_conflict
    expected_updated_at: datetime | None = None
    force_overwrite: bool = False


class SettingPageVersionOut(BaseModel):
    id: UUID
    page_id: UUID
    setting_id: UUID
    created_by: UUID | None = None
    author_name: str = ""
    snapshot: dict = Field(default_factory=dict)
    created_at: datetime


class SettingTrashItemOut(BaseModel):
    kind: Literal["setting", "page"]
    id: UUID
    setting_id: UUID
    title: str
    deleted_at: datetime | None = None
    expires_at: datetime | None = None


class SettingTrashListOut(BaseModel):
    items: list[SettingTrashItemOut] = Field(default_factory=list)


class WikiMentionSimilarOut(BaseModel):
    id: UUID
    title: str
    page_kind: SettingPageKind = "note"
    score: float = 0.0


class WikiMentionResolveOut(BaseModel):
    query: str
    exact_page_id: UUID | None = None
    exact_title: str | None = None
    similar: list[WikiMentionSimilarOut] = Field(default_factory=list)


class WikiCopyRequest(BaseModel):
    source_page_id: UUID
    include_subtree: bool = False
    target_parent_id: UUID | None = None


class WikiMentionResolveQuery(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class SettingPageLinkCreateRequest(BaseModel):
    to_page_id: UUID
    label: str = Field(default="", max_length=120)
    kind: LinkKind = "semantic"
    visibility: LinkVisibility = "all"
    # C8: создать зеркальное ребро to → from
    bidirectional: bool = False
    reverse_label: str | None = Field(default=None, max_length=120)


class SessionRevealPageRequest(BaseModel):
    """T2: раскрыть страницу сеттинга mid-session → лента."""

    page_id: UUID
    reveal_subtree: bool = False
    # false = скрыть снова (редко со стола, но симметрично)
    revealed: bool = True


class SessionRevealPageResult(BaseModel):
    session: "SessionDetail"
    event: "SessionEventOut"
    page_id: UUID
    page_title: str
    revealed: bool
    reveal_subtree: bool
    affected_count: int


class SessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    setting_id: UUID | None
    setting_name: str | None = None
    name: str
    seat_count: int = 0
    # L-04: кто за столом открытой сессии (дешёвая пометка «сейчас за столом»).
    seat_character_ids: list[UUID] = Field(default_factory=list)
    closed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class SeatConditionOut(BaseModel):
    slug: str
    name: str
    catalog_id: str | None = None
    """Опциональная длительность в раундах — напоминание ведущему, без авто-снятия."""
    duration_rounds: int | None = Field(default=None, ge=1, le=100)
    duration_note: str | None = Field(default=None, max_length=240)
    started_round: int | None = Field(default=None, ge=1, le=9999)


class SeatCompanionOut(BaseModel):
    id: str
    name: str
    hp_current: int | None = None
    hp_max: int | None = None
    ac: int | None = None
    conditions: list[SeatConditionOut] = Field(default_factory=list)
    type: str | None = None
    duration: str | None = None
    duration_rounds: int | None = None
    attack_bonus: int | None = None
    attack_damage: str | None = None
    attack_damage_type: str | None = None
    attack_range_kind: str | None = None


class SeatConcentrationOut(BaseModel):
    spell_id: str
    name: str


class EffectModOut(BaseModel):
    target: str
    op: str = "add"
    value: float | int | None = None
    dice: str | None = None
    condition: str | None = None
    once: bool | None = None


class EffectDurationOut(BaseModel):
    unit: str
    value: float | int | None = None
    started_at: str | None = None
    started_round: int | None = None
    remaining_rounds: int | None = None


class SeatEffectOut(BaseModel):
    """Баф/эффект на союзнике (не SRD-состояние). B-01: duration/mods."""

    id: str
    name: str
    source_character_id: str | None = None
    source_name: str | None = None
    linked_concentration: bool = False
    origin: str | None = None
    ac_bonus: int | None = None
    kind: str | None = None
    slug: str | None = None
    charges: int | None = None
    mods: list[EffectModOut] = Field(default_factory=list)
    duration: EffectDurationOut | None = None
    inactive: bool | None = None
    inactive_reason: str | None = None


class SessionSeatOut(BaseModel):
    character_id: UUID
    character_name: str
    character_level: int
    character_class_name: str | None = None
    character_race_name: str | None = None
    hp_current: int | None = None
    hp_max: int | None = None
    hp_temp: int = 0
    hp_band: str | None = None
    hp_label: str | None = None
    hp_ratio: float | None = None
    ac: int | None = None
    speed: int | None = None
    inspiration: bool = False
    """Вдохновение потрачено — преимущество на следующий бросок (до броска)."""
    advantage_next_roll: bool = False
    piety_score: int | None = None
    piety_god: str | None = None
    conditions: list[SeatConditionOut] = Field(default_factory=list)
    effects: list[SeatEffectOut] = Field(default_factory=list)
    concentration: SeatConcentrationOut | None = None
    effect_suggestions: list[str] = Field(default_factory=list)
    companions: list[SeatCompanionOut] = Field(default_factory=list)
    passive_perception: int | None = None
    passive_insight: int | None = None
    passive_investigation: int | None = None
    dex_mod: int | None = None
    """Бонус инициативы сверх ловкости (эффекты листа) — для броска за столом."""
    initiative_bonus: int = 0
    """Преимущество на инициативу с листа (ауры/эффекты)."""
    initiative_advantage: bool = False
    """Спасброски от смерти — только умирающему и ведущему; иначе null."""
    is_dying: bool | None = None
    death_successes: int | None = None
    death_fails: int | None = None
    """Подсказка после урона со стола (S-04 проводит реакцию)."""
    reaction_hint: str | None = None
    seated_at: datetime


class PietyAwardRequest(BaseModel):
    character_id: UUID
    delta: int = Field(..., ge=-50, le=50)
    comment: str | None = Field(default=None, max_length=240)


class PietyAwardResult(BaseModel):
    character_id: UUID
    god: str | None
    score: int
    journal_entry: dict


class SeatCombatPatchRequest(BaseModel):
    """Жесты за столом: вдохновение / состояния / эффекты / концентрация / урон."""

    inspiration: bool | None = None
    """Потратить вдохновение → преимущество на следующий бросок (до броска)."""
    spend_inspiration: bool = False
    conditions: list[SeatConditionOut] | None = None
    effects: list[SeatEffectOut] | None = None
    concentration: SeatConcentrationOut | None = None
    clear_concentration: bool = False
    """Урон / лечение с карточки (только can_run_session). damage > 0 урон, < 0 лечение."""
    damage: int | None = Field(default=None, ge=-9999, le=9999)
    damage_type: str | None = Field(default=None, max_length=40)
    grant_temp_hp: int | None = Field(default=None, ge=0, le=9999)
    death_successes: int | None = Field(default=None, ge=0, le=3)
    death_fails: int | None = Field(default=None, ge=0, le=3)


class InfusionEffectShare(BaseModel):
    """One ally-bound infusion mark. ac_bonus + mods feed the target's sheet."""

    target_character_id: UUID
    name: str = Field(min_length=1, max_length=160)
    ac_bonus: int = Field(default=0, ge=0, le=20)
    slug: str | None = Field(default=None, max_length=80)
    kind: str | None = Field(default=None, max_length=40)
    charges: int | None = Field(default=None, ge=0, le=99)
    mods: list[EffectModOut] = Field(default_factory=list)


class LobbySyncInfusionEffectsRequest(BaseModel):
    """Replace every infusion mark from this artificer, then write the current set."""

    source_character_id: UUID
    effects: list[InfusionEffectShare] = Field(default_factory=list)


class LobbyShareEffectRequest(BaseModel):
    """С листа / стола: повесить эффект на союзников лобби."""

    source_character_id: UUID
    name: str = Field(min_length=1, max_length=160)
    target_character_ids: list[UUID] = Field(min_length=1)
    linked_concentration: bool = True
    # B-01 optional structured payload (mods/duration/slug).
    kind: str | None = None
    slug: str | None = None
    origin: str | None = None
    ac_bonus: int | None = Field(default=None, ge=0, le=40)
    charges: int | None = Field(default=None, ge=0, le=99)
    mods: list[EffectModOut] = Field(default_factory=list)
    duration: EffectDurationOut | None = None


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


class LobbyRoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    user_id: UUID
    role: Literal["comaster", "observer", "lead_today"]
    session_id: UUID | None = None
    assigned_by: UUID | None = None
    character_fate: Literal["waiting", "companion"] | None = None
    character_id: UUID | None = None
    display_name: str | None = None
    created_at: datetime


class LobbyPermissionFlags(BaseModel):
    is_owner: bool = False
    is_comaster: bool = False
    is_observer: bool = False
    can_run_session: bool = False
    can_see_hidden: bool = False
    can_edit_wiki: bool = False
    can_manage_journal: bool = False
    can_edit_campaign_rules: bool = False
    can_award: bool = False
    can_delete_lobby: bool = False
    can_change_roles: bool = False
    can_transfer_lobby: bool = False
    can_change_invite_code: bool = False
    can_delete_session: bool = False
    role: str = "none"


class LobbySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    invite_code: str | None = None
    is_owner: bool
    is_comaster: bool = False
    is_observer: bool = False
    role: str = "none"
    member_count: int
    # L-03: незакрытая PlaySession (closed_at is None); если несколько — самая свежая по updated_at.
    has_open_session: bool = False
    open_session_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class LobbyDeleteRequest(BaseModel):
    """Подтверждение удаления лобби точным названием (как transfer)."""

    confirm_name: str = Field(min_length=1, max_length=120)


class LobbyMediaUsageOut(BaseModel):
    used_bytes: int
    free_bytes: int
    limit_bytes: int
    used_mb: float
    free_mb: float
    limit_mb: float


class LobbyMediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    url: str
    preview_url: str
    bytes_on_disk: int
    width: int
    height: int
    type: Literal["journal", "wiki", "map", "other"]
    attached_to_id: UUID | None = None
    is_primary: bool = False
    original_filename: str
    uploaded_by: UUID
    created_at: datetime
    updated_at: datetime
    quota_remaining_bytes: int | None = None


class LobbyDetail(BaseModel):
    id: UUID
    name: str
    invite_code: str | None = None
    join_path: str | None = None
    is_owner: bool
    is_comaster: bool = False
    is_observer: bool = False
    can_run_session: bool = False
    can_see_hidden: bool = False
    can_edit_wiki: bool = False
    can_manage_journal: bool = False
    can_edit_campaign_rules: bool = False
    can_award: bool = False
    can_delete_lobby: bool = False
    can_change_roles: bool = False
    can_transfer_lobby: bool = False
    can_change_invite_code: bool = False
    can_delete_session: bool = False
    role: str = "none"
    owner_id: UUID
    members: list[LobbyMemberOut]
    roles: list[LobbyRoleOut] = Field(default_factory=list)
    settings: list[SettingSummary]
    # W-01: больше одного активного (is_extra=false) — мастер выбирает основной
    settings_need_primary: bool = False
    sessions: list[SessionSummary]
    visibility_profile: dict = Field(default_factory=dict)
    # L-08: правила кампании (варианты 2014, домашние, прогрессия, КД врагов)
    campaign_rules: dict = Field(default_factory=dict)
    media_usage: LobbyMediaUsageOut | None = None
    # L-06: время последней публикации в дневнике (для точки «новое»)
    last_journal_published_at: datetime | None = None
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
    campaign_rules: dict | None = None


class JoinLobbyRequest(BaseModel):
    code: str = Field(min_length=4, max_length=16)
    # Без персонажа → вход наблюдателем (тот же код приглашения).
    character_id: UUID | None = None
    # L-04/L-16: join | transfer | copy (клон без входа → правка → вход).
    action: Literal["join", "transfer", "copy"] = "join"
    # L-16: войти несмотря на расхождения с правилами старта.
    acknowledge_start_mismatch: bool = False


class InviteMetaOut(BaseModel):
    """Публичные метаданные кода до входа в состав (без состава и ролей)."""

    code: str
    name: str
    valid: bool = True
    lobby_id: UUID | None = None
    # L-16: нормализованные правила старта (или весь start-блок).
    start: dict = Field(default_factory=dict)
    campaign_rules_start: dict | None = None


class JoinLobbyOut(BaseModel):
    """Ответ на /lobbies/join: деталь лобби + опционально id клона (action=copy)."""

    lobby: LobbyDetail
    cloned_character_id: UUID | None = None
    start_rules_ok: bool | None = None
    start_mismatches: list[str] = Field(default_factory=list)


class WaiveStartRulesRequest(BaseModel):
    """Снять пометку «не по правилам старта» вручную."""

    character_id: UUID


class RemoveLobbyMemberRequest(BaseModel):
    """L-04: выход игрока / кик владельца.

    combat_fate:
      - release — сразу снять со стола и из боя;
      - retain — оставить за столом/в бою до конца боя (крючок S-05);
      - null — вне открытой сессии со столом не требуется.
    """

    combat_fate: Literal["release", "retain"] | None = None
    delete_personal_notes: bool = False


class AddLobbyMemberRequest(BaseModel):
    character_id: UUID


class LobbyRoleAssignRequest(BaseModel):
    user_id: UUID
    role: Literal["comaster", "observer"]


class LobbyRoleRemoveRequest(BaseModel):
    user_id: UUID
    role: Literal["comaster", "observer"] | None = None


class LobbyTransferRequest(BaseModel):
    new_owner_user_id: UUID
    # Подтверждение: точное название лобби.
    confirm_name: str = Field(min_length=1, max_length=120)
    # Судьба прежнего владельца: стать игроком (нужен character_id) или выйти.
    former_owner_fate: Literal["become_player", "leave"]
    former_owner_character_id: UUID | None = None


class LeadTodayRequest(BaseModel):
    user_id: UUID
    session_id: UUID
    # Судьба персонажа ведущего на время сессии.
    character_fate: Literal["waiting", "companion"] = "waiting"
    character_id: UUID | None = None


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
    # T3: привязка лора
    location_page_id: UUID | None = None
    clear_location_page: bool = False
    involved_page_ids: list[UUID] | None = None


class SessionLorePageOut(BaseModel):
    """Краткая карточка страницы, привязанной к сессии."""

    id: UUID
    title: str
    page_kind: SettingPageKind = "note"
    revealed: bool = False
    quest_status: QuestStatus | None = None


class SessionQuestStatusRequest(BaseModel):
    """T4: сменить статус квеста mid-session (+ опционально дневник)."""

    page_id: UUID
    quest_status: QuestStatus
    write_journal: bool = False
    title: str | None = Field(default=None, max_length=200)
    summary: str | None = Field(default=None, max_length=4000)


class SessionQuestStatusResult(BaseModel):
    session: "SessionDetail"
    event: "SessionEventOut"
    page_id: UUID
    page_title: str
    quest_status: QuestStatus
    journal_entry: "JournalEntryOut | None" = None


class CombatantActionOut(BaseModel):
    name_ru: str
    text_ru: str = ""
    name_en: str | None = None
    # S-04: структурированные поля атаки / спасброска (из статблока или своего НПС)
    attack_bonus: int | None = None
    damage_dice: str | None = None
    damage_type: str | None = None
    save_dc: int | None = None
    save_ability: str | None = None


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
    hp_temp: int = 0
    hp_band: str | None = None
    hp_label: str | None = None
    hp_ratio: float | None = None
    hp_numbers_hidden: bool = False


class CombatantMemberDamage(BaseModel):
    member_id: str
    damage: int = Field(ge=-9999, le=9999)
    damage_type: str | None = Field(default=None, max_length=40)


class CombatantStudySnapshotOut(BaseModel):
    hp_current: int
    hp_max: int
    at: str | None = None


class CombatantPendingStudyOut(BaseModel):
    user_id: str
    character_id: str | None = None
    character_name: str | None = None
    skill: str
    skill_ru: str
    dc: int
    roll_total: int | None = None
    status: str = "pending"


class SessionCombatantOut(BaseModel):
    """Противник / пачка на сессии (не место состава лобби)."""

    id: str
    name: str
    """Сводка для быстрых жестов: HP первого живого (цель урона без выбора)."""
    hp_current: int
    hp_max: int
    hp_band: str | None = None
    hp_label: str | None = None
    hp_ratio: float | None = None
    """G12: точные числа скрыты, пока статблок не открыт."""
    hp_numbers_hidden: bool = False
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
    effects: list[SeatEffectOut] = Field(default_factory=list)
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
    wave_id: str | None = None
    damage_resistances: list[str] = Field(default_factory=list)
    damage_immunities: list[str] = Field(default_factory=list)
    damage_vulnerabilities: list[str] = Field(default_factory=list)
    condition_immunities: list[str] = Field(default_factory=list)
    """G12 / Изучить."""
    statblock_visible: bool = False
    statblock_revealed: bool = False
    studied_by_me: bool = False
    study_snapshot: CombatantStudySnapshotOut | None = None
    pending_study: CombatantPendingStudyOut | None = None
    study_skill: str | None = None
    study_skill_ru: str | None = None
    suggested_study_dc: int | None = None
    """Подсказка ведущему после урона (реакция — S-04)."""
    reaction_hint: str | None = None
    last_damage_note: str | None = None
    """S-06: сбежал / сдался (XP как за поверженного)."""
    outcome: str | None = None


class CombatSideOut(BaseModel):
    """S-05: сторона в реестре боя."""

    id: str
    label: str


class CombatEntryOut(BaseModel):
    id: str
    kind: str  # pc | companion | enemy
    ref_id: str
    companion_id: str | None = None
    name: str
    initiative: int | None = None
    initiative_pending: bool = False
    dex_mod: int | None = None
    wave_id: str | None = None
    defer_to_next_round: bool = False
    alive_count: int | None = None
    member_count: int | None = None
    """ok | warn | down — цвета состояния членов группы в очереди."""
    member_tones: list[str] = Field(default_factory=list)
    """S-05: сторона (игроку — видимая маска, если скрыта)."""
    side: str = "party"
    side_hidden: bool = False
    retained_after_kick: str | None = None


class CombatWaveOut(BaseModel):
    id: str
    index: int
    released: bool = False
    condition_text: str | None = None
    combatant_ids: list[str] = Field(default_factory=list)


class CombatFallenOut(BaseModel):
    id: str
    combatant_id: str
    member_id: str
    name: str
    hp_max: int = 1


class CombatWaveReminderOut(BaseModel):
    wave_id: str
    wave_index: int
    condition_text: str
    due: bool = False


class PendingRewardsOut(BaseModel):
    """S-06: снимок опыта после «Завершить бой» (враги уже убраны со стола)."""

    xp_pool: int = 0
    defeats: list[dict] = Field(default_factory=list)
    claim_combatant_ids: list[str] = Field(default_factory=list)
    participant_character_ids: list[str] = Field(default_factory=list)
    default_excluded_ids: list[str] = Field(default_factory=list)
    dead_ids: list[str] = Field(default_factory=list)
    absent_ids: list[str] = Field(default_factory=list)
    traitor_ids: list[str] = Field(default_factory=list)
    party_avg_level: int = 1
    difficulty: str | None = None
    has_humanoids: bool = False
    has_beasts: bool = False


class LootChestItemOut(BaseModel):
    id: str
    name: str
    qty: int = 1
    notes: str | None = None
    artifact_id: str | None = None
    catalog_slug: str | None = None
    magic_table: str | None = None


class LootChestLogOut(BaseModel):
    id: str
    who: str | None = None
    text: str
    character_id: str | None = None


class LootChestOut(BaseModel):
    """S-06: сундук добычи (черновик мастера или на столе)."""

    on_table: bool = False
    items: list[LootChestItemOut] = Field(default_factory=list)
    coins: dict[str, int] = Field(
        default_factory=lambda: {"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0}
    )
    log: list[LootChestLogOut] = Field(default_factory=list)


class SessionCombatOut(BaseModel):
    active: bool = False
    round: int = 1
    active_index: int = 0
    waiting_reaction: bool = False
    """S-04: общий режим «Кубики на столе» (без новой колонки)."""
    dice_on_table: bool = False
    """S-04: кому адресована реакция (character_id), если waiting_reaction."""
    reaction_character_id: str | None = None
    reaction_hint: str | None = None
    """S-04: ожидаем выбор последствия fumble_on_1."""
    pending_fumble: dict | None = None
    entries: list[CombatEntryOut] = Field(default_factory=list)
    waves: list[CombatWaveOut] = Field(default_factory=list)
    fallen: list[CombatFallenOut] = Field(default_factory=list)
    saved_waves: list[CombatWaveOut] = Field(default_factory=list)
    wave_reminders: list[CombatWaveReminderOut] = Field(default_factory=list)
    """S-05: реестр сторон боя (Партия / Враги / …)."""
    sides: list[CombatSideOut] = Field(default_factory=list)
    """S-06: снимок наград после боя."""
    pending_rewards: PendingRewardsOut | None = None
    """S-06: сундук добычи."""
    loot_chest: LootChestOut | None = None


class CombatEntryInput(BaseModel):
    kind: str = Field(pattern="^(pc|companion|enemy)$")
    ref_id: str = Field(min_length=1, max_length=80)
    companion_id: str | None = Field(default=None, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    """None / не передано + initiative_pending → «ждём бросок»."""
    initiative: int | None = Field(default=None, ge=-20, le=99)
    initiative_pending: bool = False
    dex_mod: int | None = Field(default=None, ge=-10, le=10)
    wave_id: str | None = Field(default=None, max_length=80)


class CombatWaveInput(BaseModel):
    index: int = Field(ge=1, le=20)
    condition_text: str | None = Field(default=None, max_length=240)
    combatant_ids: list[str] = Field(default_factory=list)
    """Волна 1 всегда released при старте; остальные — скрыты."""
    released: bool | None = None


class CombatStartRequest(BaseModel):
    """Старт боя: игроки бросают инициативу сами; мастер — за врагов/НПС."""

    entries: list[CombatEntryInput] = Field(min_length=1)
    waves: list[CombatWaveInput] | None = None


class CombatPatchRequest(BaseModel):
    """Ход / конец боя / волны / павшие / правка порядка."""

    action: str | None = None
    # next | prev | end | release_wave | restore_fallen | set_waiting_reaction
    # | set_dice_on_table | resolve_fumble | set_side | reveal_side
    active_index: int | None = Field(default=None, ge=0)
    round: int | None = Field(default=None, ge=1)
    entries: list[CombatEntryInput] | None = None
    wave_id: str | None = Field(default=None, max_length=80)
    fallen_id: str | None = Field(default=None, max_length=80)
    restore_hp: int | None = Field(default=None, ge=1, le=9999)
    """При end: сохранить невыпущенные волны на сессии / выбросить."""
    keep_unreleased_waves: bool | None = None
    """Краткая строка итога в ленту при end."""
    summary: str | None = Field(default=None, max_length=240)
    waiting_reaction: bool | None = None
    """S-04: переключатель «Кубики на столе»."""
    dice_on_table: bool | None = None
    """S-04: id последствия fumble (drop_weapon | hit_ally | lose_reaction)."""
    fumble_consequence_id: str | None = Field(default=None, max_length=40)
    """S-05: id записи очереди для set_side / reveal_side."""
    entry_id: str | None = Field(default=None, max_length=80)
    """S-05: сторона (party / enemies / id из реестра / новый slug)."""
    side: str | None = Field(default=None, max_length=40)
    """S-05: ярлык новой стороны (Культисты)."""
    side_label: str | None = Field(default=None, max_length=80)
    """S-05: скрыть истинную сторону до раскрытия."""
    side_hidden: bool | None = None


class CombatInitiativeRequest(BaseModel):
    """Бросок или ручной ввод инициативы игроком (свой ПК) / ведущим."""

    character_id: UUID | None = None
    entry_id: str | None = Field(default=None, max_length=80)
    kind: str | None = Field(default=None, pattern="^(pc|companion|enemy)$")
    ref_id: str | None = Field(default=None, max_length=80)
    companion_id: str | None = Field(default=None, max_length=80)
    mode: str = Field(default="roll", pattern="^(roll|manual)$")
    value: int | None = Field(default=None, ge=-20, le=99)
    """Принудительно преимущество (если на листе уже есть — и так учтём)."""
    advantage: bool | None = None


class XpBonusAwardIn(BaseModel):
    """S-06: +за отыгрыш / +за находчивость одному."""

    character_id: UUID
    amount: int = Field(ge=1, le=10_000_000)
    reason: str = Field(default="", max_length=120)


class XpAwardRequest(BaseModel):
    """Раздать XP сидящим: пул делится поровну, либо фиксированная сумма каждому.

    S-06: остаток не отбрасывается (bank / give); вехи — mode из campaign_rules
    или явный milestones=true.
    """

    character_ids: list[UUID] = Field(min_length=1)
    total_xp: int | None = Field(default=None, ge=0, le=10_000_000)
    per_character_xp: int | None = Field(default=None, ge=0, le=10_000_000)
    source: str = Field(default="manual", max_length=32)
    note: str | None = Field(default=None, max_length=240)
    """Пометить этих противников как уже учтённых в XP (после боя)."""
    claim_combatant_ids: list[str] | None = None
    """S-06: включить копилку остатка лобби в пул."""
    include_bank: bool = True
    """S-06: куда деть остаток от деления — bank (копилка) или give (одному)."""
    remainder_mode: str = Field(default="bank", pattern="^(bank|give)$")
    remainder_character_id: UUID | None = None
    bonuses: list[XpBonusAwardIn] = Field(default_factory=list)
    """S-06: принудительно режим вех (иначе читаем campaign_rules.progression.mode)."""
    milestones: bool | None = None
    """S-06: очистить pending_rewards после утверждения."""
    clear_pending_rewards: bool = False


class XpLevelUpNotice(BaseModel):
    character_id: UUID
    name: str
    level: int
    experience: int


class XpAwardResult(BaseModel):
    session: "SessionDetail"
    awarded_each: int
    awarded_total: int
    recipients: list[str]
    remainder: int = 0
    remainder_banked: int = 0
    xp_remainder: int = 0
    mode: str = "xp"
    leveled_up: list[XpLevelUpNotice] = Field(default_factory=list)
    per_recipient: dict[str, int] = Field(default_factory=dict)


class LootCoinsIn(BaseModel):
    cp: int = Field(default=0, ge=0, le=1_000_000)
    sp: int = Field(default=0, ge=0, le=1_000_000)
    ep: int = Field(default=0, ge=0, le=1_000_000)
    gp: int = Field(default=0, ge=0, le=1_000_000)
    pp: int = Field(default=0, ge=0, le=1_000_000)


class LootItemIn(BaseModel):
    """Свободный предмет или артефакт из библиотеки сеттинга (`artifact_id`)."""

    name: str = Field(default="", max_length=120)
    qty: int = Field(default=1, ge=1, le=9999)
    notes: str | None = Field(default=None, max_length=240)
    artifact_id: UUID | None = None


class LootGrantIn(BaseModel):
    """Одна доля лута одному персонажу за столом."""

    character_id: UUID
    item: LootItemIn | None = None
    coins: LootCoinsIn | None = None


class LootAwardRequest(BaseModel):
    grants: list[LootGrantIn] = Field(min_length=1)
    note: str | None = Field(default=None, max_length=240)
    """S-06: после выдачи очистить/обновить сундук (предметы из grants снимаются, если clear_chest)."""
    clear_chest: bool = False


class LootAwardResult(BaseModel):
    session: "SessionDetail"
    summary: str
    recipient_names: list[str]


class LootChestItemIn(BaseModel):
    id: str | None = Field(default=None, max_length=80)
    name: str = Field(default="", max_length=120)
    qty: int = Field(default=1, ge=1, le=9999)
    notes: str | None = Field(default=None, max_length=240)
    artifact_id: UUID | None = None
    catalog_slug: str | None = Field(default=None, max_length=80)
    magic_table: str | None = Field(default=None, max_length=8)


class LootChestRequest(BaseModel):
    """S-06: операции с сундуком добычи.

    action:
      set — заменить содержимое (мастер)
      put_on_table — положить на стол
      award — выдать по grants (как /loot) и снять из сундука
      claim — игрок забирает себе item_id / coins
      split_coins — поровну монеты за столом
      reassign — мастер отдаёт item персонажу
      close — закрыть добычу на столе (remainder=return|discard)
      generate — «Подобрать добычу» (G-01 тот же контракт)
      quick_add — Мелочь/Припасы/Ценности/Магия/Редкая магия/Легенда/Трофеи
      reroll_item — перебросить одну строку
      remove_item — удалить строку
    """

    action: str = Field(
        pattern=(
            "^(set|put_on_table|award|claim|split_coins|reassign|close|"
            "generate|quick_add|reroll_item|remove_item)$"
        )
    )
    items: list[LootChestItemIn] | None = None
    coins: LootCoinsIn | None = None
    grants: list[LootGrantIn] | None = None
    note: str | None = Field(default=None, max_length=240)
    item_id: str | None = Field(default=None, max_length=80)
    qty: int | None = Field(default=None, ge=1, le=9999)
    character_id: UUID | None = None
    kind: str | None = Field(
        default=None,
        pattern="^(trinkets|supplies|valuables|magic|rare_magic|legend|trophies)$",
    )
    difficulty: str | None = Field(
        default=None, pattern="^(easy|medium|hard|deadly)$"
    )
    replace: bool = False
    remainder: str = Field(default="return", pattern="^(return|discard)$")
    seed: int | None = None


class LootChestResult(BaseModel):
    session: "SessionDetail"
    chest: LootChestOut
    summary: str = ""
    meta: dict = Field(default_factory=dict)


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


class InventoryGrantRequest(BaseModel):
    """S-07: мастер выдаёт предмет/монеты «из воздуха» на лист за столом."""

    character_id: UUID
    item_name: str | None = Field(default=None, max_length=120)
    item_qty: int | None = Field(default=None, ge=1, le=9999)
    coin_currency: str | None = Field(default=None, pattern="^(cp|sp|ep|gp|pp)$")
    coin_amount: int | None = Field(default=None, ge=1, le=1_000_000)


class InventoryGrantResult(BaseModel):
    session: "SessionDetail"
    summary: str
    to_character_id: UUID
    to_character_name: str


class PartyRestRequest(BaseModel):
    """S-07: мастер запускает короткий/долгий отдых всей партии."""

    kind: Literal["short", "long"]


class PartyRestResult(BaseModel):
    session: "SessionDetail"
    kind: Literal["short", "long"]
    gritty_rest: bool = False
    summary: str
    short_label: str = "Короткий отдых"
    long_label: str = "Долгий отдых"


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
    """S-02: при активном бое — номер новой (ещё не выпущенной) волны; иначе волна 1."""
    wave_index: int | None = Field(default=None, ge=1, le=20)
    wave_condition_text: str | None = Field(default=None, max_length=240)


class CombatantPatchRequest(BaseModel):
    hp_current: int | None = Field(default=None, ge=0, le=9999)
    hp_max: int | None = Field(default=None, ge=1, le=9999)
    ac: int | None = Field(default=None, ge=0, le=40)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    conditions: list[SeatConditionOut] | None = None
    effects: list[SeatEffectOut] | None = None
    """Урон одному: без member_id → первый живой; с member_id → выбранный."""
    damage: int | None = Field(default=None, ge=-9999, le=9999)
    damage_type: str | None = Field(default=None, max_length=40)
    grant_temp_hp: int | None = Field(default=None, ge=0, le=9999)
    member_id: str | None = Field(default=None, max_length=80)
    """Пакетный урон по составу: этому N, этому M."""
    member_damages: list[CombatantMemberDamage] | None = None
    """G12: открыть статблок всей партии."""
    reveal_statblock: bool | None = None
    """S-06: killed|fled|surrendered|'' — исход для XP (пустая строка сбрасывает)."""
    outcome: str | None = Field(
        default=None, max_length=16
    )


class CombatantStudyRequest(BaseModel):
    """Игрок начинает «Изучить» видимого врага."""

    character_id: UUID
    roll_total: int | None = Field(default=None, ge=-999, le=9999)
    dc: int | None = Field(default=None, ge=1, le=40)


class CombatantStudyResolveRequest(BaseModel):
    """Ведущий подтверждает успех / провал «Изучить»."""

    success: bool
    """Кому засчитать успех; по умолчанию — pending_study.user_id."""
    user_id: UUID | None = None


class CombatantShareStudyRequest(BaseModel):
    """Изучивший показывает карточку партии (= reveal_statblock)."""

    pass


class SessionDetail(BaseModel):
    id: UUID
    lobby_id: UUID
    lobby_name: str
    setting_id: UUID | None
    setting_name: str | None
    name: str
    is_owner: bool
    is_comaster: bool = False
    is_observer: bool = False
    can_run_session: bool = False
    can_see_hidden: bool = False
    can_award: bool = False
    can_delete_session: bool = False
    role: str = "none"
    lead_today_user_id: UUID | None = None
    seats: list[SessionSeatOut]
    combatants: list[SessionCombatantOut] = Field(default_factory=list)
    combat: SessionCombatOut = Field(default_factory=SessionCombatOut)
    lobby_members: list[LobbyMemberOut]
    visibility_profile: dict = Field(default_factory=dict)
    # L-08: те же правила, что в детали лобби (генератор / стол)
    campaign_rules: dict = Field(default_factory=dict)
    # T3
    location_page_id: UUID | None = None
    involved_page_ids: list[UUID] = Field(default_factory=list)
    location_page: SessionLorePageOut | None = None
    involved_pages: list[SessionLorePageOut] = Field(default_factory=list)
    closed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class JournalChapterRef(BaseModel):
    id: UUID
    title: str


class JournalEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lobby_id: UUID
    author_user_id: UUID | None = None
    entry_type: str
    title: str
    body: str
    image_url: str | None = None
    is_draft: bool = False
    chapter_id: UUID | None = None
    chapter_title: str | None = None
    media_id: UUID | None = None
    media_url: str | None = None
    media_preview_url: str | None = None
    has_hidden_segments: bool = False
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
    chapters: list[JournalChapterRef] = Field(default_factory=list)
    last_journal_published_at: datetime | None = None


class JournalEntryCreateRequest(BaseModel):
    entry_type: str = Field(default="text", max_length=32)
    title: str = Field(default="", max_length=200)
    body: str = Field(default="", max_length=20000)
    image_url: str | None = Field(default=None, max_length=500)
    setting_id: UUID | None = None
    page_id: UUID | None = None
    is_draft: bool = False
    chapter_id: UUID | None = None
    media_id: UUID | None = None
    # L-06: перенос с общей доски
    source_note_id: UUID | None = None
    delete_source_note: bool = False


class JournalEntryUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=20000)
    image_url: str | None = Field(default=None, max_length=500)
    setting_id: UUID | None = None
    clear_setting: bool = False
    clear_image: bool = False
    page_id: UUID | None = None
    clear_page: bool = False
    is_draft: bool | None = None
    chapter_id: UUID | None = None
    clear_chapter: bool = False
    media_id: UUID | None = None
    clear_media: bool = False
    # Снять {{скрыто}}…{{/скрыто}} — текст становится обычным
    reveal_hidden: bool = False


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
    """Клиент сообщает, что бросок уже с преимуществом (потраченное вдохновение)."""
    used_inspiration: bool = False
    advantage: bool = False
    """S-04: число с физических кубиков / режима стола → значок 🎲 в ленте."""
    physical_dice: bool = False
    """S-04: скрытый бросок игрока (видят автор и ведущие)."""
    is_hidden: bool = False
    """S-04: метка категории для фильтра ленты (combat | roll)."""
    category: str | None = Field(default=None, max_length=40)


class CombatAttackRequest(BaseModel):
    """S-04: атака / действие врага или своего НПС по цели."""

    attacker_combatant_id: str = Field(min_length=1, max_length=80)
    action_name: str = Field(min_length=1, max_length=200)
    action_block: str = Field(
        default="actions",
        pattern="^(traits|actions|bonus_actions|reactions|legendary_actions)$",
    )
    target_kind: str = Field(pattern="^(pc|companion|enemy)$")
    target_ref_id: str = Field(min_length=1, max_length=80)
    target_member_id: str | None = Field(default=None, max_length=80)
    companion_id: str | None = Field(default=None, max_length=80)
    # roll | manual | table_hit | table_miss | table_save | table_fail
    mode: str = Field(
        default="roll",
        pattern="^(roll|manual|table_hit|table_miss|table_save|table_fail)$",
    )
    attack_total: int | None = Field(default=None, ge=-20, le=99)
    attack_natural: int | None = Field(default=None, ge=1, le=20)
    damage_total: int | None = Field(default=None, ge=0, le=9999)
    damage_type: str | None = Field(default=None, max_length=40)
    flanking: bool = False
    advantage: bool | None = None
    disadvantage: bool | None = None
    physical_dice: bool = False


class CombatAttackResult(BaseModel):
    session: "SessionDetail"
    event: SessionEventOut | None = None
    hit: bool | None = None
    damage_applied: int | None = None
    damage_note: str | None = None
    waiting_reaction: bool = False
    fumble_pending: bool = False
    feed_line: str | None = None


class CombatReactionRequest(BaseModel):
    """S-04: объявить реакцию или пропустить."""

    action: str = Field(pattern="^(declare|skip)$")
    character_id: UUID
    """Крючок T-01: имя эффекта (Щит и т. п.) — не блокируем по «реакция потрачена»."""
    effect_name: str | None = Field(default=None, max_length=120)


class CombatTargetOut(BaseModel):
    id: str
    kind: str
    ref_id: str
    name: str
    hp_current: int | None = None
    hp_max: int | None = None
    ac: int | None = None
    conditions: list = Field(default_factory=list)
    side: str = "party"
    is_ally: bool = True
    user_id: str | None = None
    companion_id: str | None = None
    member_id: str | None = None


class CombatTargetsOut(BaseModel):
    """S-04 / контракт T-01: видимые цели боя для этого зрителя."""

    session_id: UUID
    dice_on_table: bool = False
    waiting_reaction: bool = False
    targets: list[CombatTargetOut] = Field(default_factory=list)


class SeatRequest(BaseModel):
    character_id: UUID
