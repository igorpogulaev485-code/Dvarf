"""Схемы API справочников админки (ADM-05). Без паролей и токенов."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


LAYER_LABELS: dict[str, str] = {
    "srd": "Базовые правила",
    "community_ref": "книга вне базовых правил",
    "user_import": "импорт игрока",
    "homebrew": "Свой контент",
}

STATUS_LABELS: dict[str, str] = {
    "pending": "на проверку",
    "accepted": "принято",
    "rejected": "отклонено",
    "rolled_back": "откатили",
}

KIND_LABELS: dict[str, str] = {
    "race": "Раса",
    "class": "Класс",
    "subclass": "Подкласс",
    "background": "Предыстория",
    "alignment": "Мировоззрение",
    "skill": "Навык",
    "feat": "Черта",
    "spell": "Заклинание",
    "weapon": "Оружие",
    "armor": "Доспех",
    "item": "Предмет",
    "condition": "Состояние",
    "bestiary": "Бестиарий",
}


class AdminCatalogDraftRequest(BaseModel):
    name_ru: str = Field(min_length=1, max_length=160)
    name_en: str | None = Field(default=None, max_length=160)

    @field_validator("name_ru")
    @classmethod
    def strip_ru(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Укажите русское название")
        return cleaned

    @field_validator("name_en")
    @classmethod
    def strip_en(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class AdminCatalogRevisionItem(BaseModel):
    id: UUID
    status: str
    status_label: str
    name_ru: str
    name_en: str | None = None
    previous_name_ru: str | None = None
    previous_name_en: str | None = None
    author_id: UUID | None = None
    author_name: str | None = None
    reviewer_id: UUID | None = None
    reviewer_name: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
    can_rollback: bool = False


class AdminCatalogListItem(BaseModel):
    id: UUID
    kind: str
    kind_label: str
    slug: str
    name_ru_live: str
    name_en_live: str | None = None
    name_ru_seed: str
    name_en_seed: str | None = None
    names_differ: bool = False
    rules_edition: str
    source: str | None = None
    content_layer: str
    content_layer_label: str
    has_pending: bool = False
    pending_name_ru: str | None = None
    is_active: bool = True
    updated_at: datetime


class AdminCatalogPage(BaseModel):
    items: list[AdminCatalogListItem]
    total: int
    page: int
    page_size: int


class AdminCatalogDetail(BaseModel):
    id: UUID
    kind: str
    kind_label: str
    slug: str
    name_ru_live: str
    name_en_live: str | None = None
    name_ru_seed: str
    name_en_seed: str | None = None
    names_differ: bool = False
    pending: AdminCatalogRevisionItem | None = None
    rules_edition: str
    source: str | None = None
    content_layer: str
    content_layer_label: str
    parent_id: UUID | None = None
    parent_name_ru: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    revisions: list[AdminCatalogRevisionItem] = []
    can_edit_draft: bool = False
    can_accept: bool = False
    can_reject: bool = False
    can_withdraw: bool = False


class AdminCatalogNameFeedbackItem(BaseModel):
    """Короткая карточка сообщения «Название в справочнике» для модератора — без почты."""

    id: UUID
    body: str
    author_name: str | None = None
    is_anonymous: bool = False
    status: str
    status_label: str
    created_at: datetime


class AdminCatalogNameFeedbackPage(BaseModel):
    items: list[AdminCatalogNameFeedbackItem]
    total: int
